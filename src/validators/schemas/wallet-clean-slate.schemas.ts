import { z } from 'zod';

const modeSchema = z.enum(['KEEP', 'RESET_BALANCES', 'DELETE']);

export const walletCleanSlateInputSchema = z
  .object({
    transactions: z.boolean().optional(),
    scheduledExpenses: z.boolean().optional(),
    categories: z.boolean().optional(),
    budgets: z.boolean().optional(),
    shopping: z.boolean().optional(),
    wallets: modeSchema.optional(),
    creditCards: modeSchema.optional(),
  })
  .refine(
    (input) =>
      input.transactions ||
      input.scheduledExpenses ||
      input.categories ||
      input.budgets ||
      input.shopping ||
      (input.wallets !== undefined && input.wallets !== 'KEEP') ||
      (input.creditCards !== undefined && input.creditCards !== 'KEEP'),
    { message: 'Select at least one thing to reset' }
  );
