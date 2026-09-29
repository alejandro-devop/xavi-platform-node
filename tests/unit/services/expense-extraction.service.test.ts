// La nota del usuario llega al modelo como un bloque de texto aparte.
const create = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    messages = { create };
    static BadRequestError = class extends Error {};
    static AuthenticationError = class extends Error {};
    static RateLimitError = class extends Error {};
  }
  return { __esModule: true, default: Anthropic };
});

jest.mock('../../../src/services/expense-category.service', () => ({
  expenseCategoryService: {
    getCategories: jest
      .fn()
      .mockResolvedValue([{ id: 'c-gym', name: 'Gimnasio', type: 'expense' }]),
  },
}));

import {
  expenseExtractionService,
  normalizeCurrency,
} from '../../../src/services/expense-extraction.service';
import { expenseExtractionInputSchema } from '../../../src/validators/schemas/expense-extraction.schemas';
import { expenseCategoryService } from '../../../src/services/expense-category.service';

const extraccion = {
  amount: 90000,
  currency: 'COP',
  date: '2026-09-26',
  merchant: 'Bodytech',
  description: 'Mensualidad del gimnasio',
  categoryId: 'c-gym',
  isIncome: false,
  confidence: 'high',
};

const imagen = { imageBase64: 'A'.repeat(200), mediaType: 'image/jpeg' as const };

describe('expenseExtractionService.extractFromImage', () => {
  beforeEach(() => {
    process.env.CLAUDE_API_KEY = 'test-key';
    (expenseCategoryService.getCategories as jest.Mock).mockResolvedValue([
      { id: 'c-gym', name: 'Gimnasio', type: 'expense' },
    ]);
    create.mockReset().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(extraccion) }],
    });
  });

  const bloquesDelUsuario = () => create.mock.calls[0][0].messages[0].content;

  it('without a note sends only the image and the instruction', async () => {
    await expenseExtractionService.extractFromImage(1, imagen);
    const bloques = bloquesDelUsuario();
    expect(bloques).toHaveLength(2);
    expect(bloques[0].type).toBe('image');
  });

  it('with a note adds it as its own text block, delimited', async () => {
    const r = await expenseExtractionService.extractFromImage(1, {
      ...imagen,
      note: 'mensualidad del gym',
    });
    const bloques = bloquesDelUsuario();
    expect(bloques).toHaveLength(3);
    expect(bloques[2].type).toBe('text');
    expect(bloques[2].text).toContain('<user_note>\nmensualidad del gym\n</user_note>');
    expect(r.categoryId).toBe('c-gym');
  });
});

describe('currency of the receipt', () => {
  beforeEach(() => {
    process.env.CLAUDE_API_KEY = 'test-key';
    (expenseCategoryService.getCategories as jest.Mock).mockResolvedValue([
      { id: 'c-gym', name: 'Gimnasio', type: 'expense' },
    ]);
  });

  const respuesta = (extra: Record<string, unknown>) =>
    create.mockReset().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({ ...extraccion, ...extra }) }],
    });

  it('returns the foreign currency and keeps the amount unconverted', async () => {
    respuesta({ amount: 695.88, currency: 'USD' });
    const r = await expenseExtractionService.extractFromImage(1, imagen);
    expect(r.amount).toBe(695.88);
    expect(r.currency).toBe('USD');
  });

  it('normalizes a lowercase code and drops anything that is not ISO 4217', async () => {
    respuesta({ currency: ' usd ' });
    expect((await expenseExtractionService.extractFromImage(1, imagen)).currency).toBe('USD');
    respuesta({ currency: 'US$' });
    expect((await expenseExtractionService.extractFromImage(1, imagen)).currency).toBeNull();
  });

  it('asks the model for the printed currency without converting', async () => {
    respuesta({});
    await expenseExtractionService.extractFromImage(1, imagen);
    const peticion = create.mock.calls[0][0];
    expect(peticion.system).toContain('never convert');
    expect(peticion.output_config.format.schema.required).toContain('currency');
  });

  it('normalizeCurrency handles null and non-strings', () => {
    expect(normalizeCurrency(null)).toBeNull();
    expect(normalizeCurrency(42)).toBeNull();
    expect(normalizeCurrency('cop')).toBe('COP');
  });
});

describe('expenseExtractionInputSchema note', () => {
  it('is optional, and a blank note counts as absent', () => {
    expect(expenseExtractionInputSchema.parse(imagen).note).toBeUndefined();
    expect(expenseExtractionInputSchema.parse({ ...imagen, note: '   ' }).note).toBeUndefined();
  });

  it('is trimmed', () => {
    expect(expenseExtractionInputSchema.parse({ ...imagen, note: '  gym  ' }).note).toBe('gym');
  });

  it('rejects more than 300 characters', () => {
    expect(
      expenseExtractionInputSchema.safeParse({ ...imagen, note: 'x'.repeat(301) }).success
    ).toBe(false);
  });
});
