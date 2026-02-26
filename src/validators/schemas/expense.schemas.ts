import { z } from 'zod';

/**
 * Expense Input Schema - For creating expenses
 */
export const expenseInputSchema = z
  .object({
    walletId: z.string().uuid('Invalid wallet ID format'),
    categoryId: z.string().uuid('Invalid category ID format').optional(),
    budgetId: z.string().uuid('Invalid budget ID format').optional(),
    debit: z.number().min(0, 'Debit must be positive').optional().default(0),
    credit: z.number().min(0, 'Credit must be positive').optional().default(0),
    description: z
      .string()
      .min(5, 'Description must be at least 5 characters')
      .max(255, 'Description must be less than 255 characters'),
    date: z.string().datetime('Invalid date format').optional(),
  })
  .refine((data) => data.debit > 0 || data.credit > 0, {
    message: 'Either debit or credit must be greater than 0',
    path: ['debit'],
  });

/**
 * Expense Update Schema - For updating expenses
 */
export const expenseUpdateSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID format').optional(),
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  budgetId: z.string().uuid('Invalid budget ID format').optional(),
  debit: z.number().min(0, 'Debit must be positive').optional(),
  credit: z.number().min(0, 'Credit must be positive').optional(),
  description: z
    .string()
    .min(5, 'Description must be at least 5 characters')
    .max(255, 'Description must be less than 255 characters')
    .optional(),
  date: z.string().datetime('Invalid date format').optional(),
});

/**
 * Expense ID Schema - For operations requiring expense ID
 */
export const expenseIdSchema = z.object({
  id: z.string().uuid('Invalid expense ID format'),
});

/**
 * Expense Filter Schema - For filtering expenses
 */
export const expenseFilterSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID format').optional(),
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  budgetId: z.string().uuid('Invalid budget ID format').optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
});

// Export types inferred from schemas
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;
export type ExpenseId = z.infer<typeof expenseIdSchema>;
export type ExpenseFilter = z.infer<typeof expenseFilterSchema>;
