import Anthropic from '@anthropic-ai/sdk';
import { expenseCategoryService } from './expense-category.service';
import { BadRequestError } from '../shared/errors';
import type {
  ExtractExpenseFromImageInput,
  ExtractedExpense,
} from '../types/services/expense-extraction.types';

const EXTRACTION_MODEL = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 1024;

// JSON schema enforced via structured outputs — the API guarantees the
// response parses and matches this shape, so no retry/repair logic is needed.
const extractionOutputSchema = {
  type: 'object',
  properties: {
    amount: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description:
        'Total amount of the transaction as a plain number, in the currency printed on the image (never converted). Null if it cannot be determined.',
    },
    currency: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description:
        'ISO 4217 code of the currency the amount is printed in (e.g. COP, USD, EUR). Null if it cannot be determined.',
    },
    date: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Transaction date in YYYY-MM-DD format. Null if not visible.',
    },
    merchant: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Merchant, store or counterparty name. Null if not visible.',
    },
    description: {
      type: 'string',
      description:
        'Short human-friendly description for the expense record, in Spanish, 5-100 characters.',
    },
    categoryId: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description:
        'The id of the best-matching category from the provided list, or null if none fits.',
    },
    isIncome: {
      type: 'boolean',
      description: 'True if the money enters the account (income), false if it is an expense.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'Overall confidence in the extracted amount and date.',
    },
  },
  required: [
    'amount',
    'currency',
    'date',
    'merchant',
    'description',
    'categoryId',
    'isIncome',
    'confidence',
  ],
  additionalProperties: false,
} as const;

/**
 * Normalize the model's currency to an uppercase ISO 4217 code.
 * Anything that doesn't look like a 3-letter code becomes null, so the app
 * can treat "unknown" and "garbage" the same way.
 */
export function normalizeCurrency(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.CLAUDE_API_KEY) {
    throw new BadRequestError('Expense extraction is not configured (missing CLAUDE_API_KEY)');
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  return client;
}

function buildSystemPrompt(
  categories: { id: string; name: string; type: string }[],
  today: string
): string {
  const categoryList = categories.map((c) => `- ${c.id} | ${c.name} (${c.type})`).join('\n');

  return `You extract structured expense data from receipt photos and app screenshots (bank apps, Nequi, Daviplata, delivery apps, etc.), mostly from Colombia.

Today's date is ${today}. Use it to resolve relative dates like "hoy" or "ayer"; if no date is visible, return null — never guess.

Amount rules:
- Colombian format uses dots as thousand separators: "$25.000" means 25000 COP, not 25.
- Prefer the final total paid (after tips/taxes/discounts) over subtotals.
- For bank screenshots, extract the transaction amount, never the account balance.

Currency rules:
- Report the currency the amount is printed in as an ISO 4217 code, and keep the amount in that currency — never convert it.
- "US$", "USD", "U$S" or an English-language receipt from a US store charged in dollars means USD; "€"/"EUR" means EUR.
- A bare "$" on a Colombian receipt or app (Nequi, Daviplata, Bancolombia, etc.) means COP.
- Foreign currencies usually have cents: "$695.88" in USD is 695.88, not 69588.
- If the currency cannot be determined, return null.

Category: pick the id of the best-matching category from this list, or null if none clearly fits. Never invent ids.
${categoryList}

Write the description in Spanish, short and useful (e.g. "Mercado en Éxito", "Uber a casa").`;
}

export const expenseExtractionService = {
  /**
   * Extract a draft expense from a receipt photo or screenshot.
   * Returns a suggestion for the user to review — it never persists anything.
   */
  async extractFromImage(
    userId: number,
    input: ExtractExpenseFromImageInput
  ): Promise<ExtractedExpense> {
    const categories = await expenseCategoryService.getCategories(userId);
    const today = new Date().toISOString().slice(0, 10);

    let response: Anthropic.Message;
    try {
      response = await getClient().messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: buildSystemPrompt(
          categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
          today
        ),
        output_config: {
          format: {
            type: 'json_schema',
            schema: extractionOutputSchema,
          },
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: input.mediaType,
                  data: input.imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Extract the expense data from this image.',
              },
              // The user's own words about the expense. It helps with what the
              // image can't say (what it was for), so it steers the category
              // and description; amounts and dates still come from the image.
              ...(input.note
                ? [
                    {
                      type: 'text' as const,
                      text: `The user added this note about the expense. Use it to choose the category and to write the description; take the amount and date from the image unless the note states them explicitly.\n<user_note>\n${input.note}\n</user_note>`,
                    },
                  ]
                : []),
            ],
          },
        ],
      });
    } catch (error) {
      if (error instanceof Anthropic.BadRequestError) {
        throw new BadRequestError(`Could not process the image: ${error.message}`);
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new BadRequestError('Expense extraction is misconfigured (invalid API key)');
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new BadRequestError('Extraction service is busy, please try again in a moment');
      }
      throw error;
    }

    if (response.stop_reason === 'refusal') {
      throw new BadRequestError('The image could not be analyzed');
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new BadRequestError('The image could not be analyzed');
    }

    const extracted = JSON.parse(textBlock.text) as ExtractedExpense;

    extracted.currency = normalizeCurrency(extracted.currency);

    // Defense in depth: never return a category id that isn't the user's.
    if (extracted.categoryId && !categories.some((c) => c.id === extracted.categoryId)) {
      extracted.categoryId = null;
    }

    return extracted;
  },
};
