import { z } from 'zod';

/**
 * Repeat Type Enum
 */
export const repeatTypeEnum = z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']);

/**
 * Scheduled Expense Input Schema - For creating scheduled expenses
 */
export const scheduledExpenseInputSchema = z
  .object({
    walletId: z.string().uuid('Invalid wallet ID format'),
    categoryId: z.string().uuid('Invalid category ID format').nullable().optional(),
    budgetId: z.string().uuid('Invalid budget ID format').nullable().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    description: z
      .string()
      .min(3, 'Description must be at least 3 characters')
      .max(255, 'Description must be less than 255 characters'),
    dueDate: z.string().date('Invalid date format (use YYYY-MM-DD)'),
    repeatType: repeatTypeEnum.optional(),
    endDate: z.string().date('Invalid date format (use YYYY-MM-DD)').optional(),
  })
  .refine(
    (data) => {
      // If repeatType is provided and not 'none', endDate is required
      if (data.repeatType && data.repeatType !== 'none') {
        return !!data.endDate;
      }
      return true;
    },
    {
      message: 'End date is required when repeat type is set',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      // If endDate is provided, it must be >= dueDate
      if (data.endDate && data.dueDate) {
        return new Date(data.endDate) >= new Date(data.dueDate);
      }
      return true;
    },
    {
      message: 'End date must be greater than or equal to due date',
      path: ['endDate'],
    }
  );

/**
 * Scheduled Expense Update Schema - For updating scheduled expenses
 * Note: dueDate, repeatType, and endDate cannot be updated.
 * To change recurrence, create a new scheduled expense.
 */
export const scheduledExpenseUpdateSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID format').optional(),
  categoryId: z.string().uuid('Invalid category ID format').nullable().optional(),
  budgetId: z.string().uuid('Invalid budget ID format').nullable().optional(),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description must be less than 255 characters')
    .optional(),
});

/**
 * Scheduled Expense ID Schema - For operations requiring scheduled expense ID
 */
export const scheduledExpenseIdSchema = z.object({
  id: z.string().uuid('Invalid scheduled expense ID format'),
});

/**
 * Pay Scheduled Expense Schema
 */
export const payScheduledExpenseSchema = z.object({
  id: z.string().uuid('Invalid scheduled expense ID format'),
  paidDate: z.string().date('Invalid date format (use YYYY-MM-DD)').optional(),
});

/**
 * Scheduled Expense Filter Schema - For filtering scheduled expenses
 */
export const scheduledExpenseFilterSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID format').optional(),
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  budgetId: z.string().uuid('Invalid budget ID format').optional(),
  parentId: z.string().uuid('Invalid parent ID format').optional(),
  isPaid: z.boolean().optional(),
  startDate: z.string().date('Invalid start date format (use YYYY-MM-DD)').optional(),
  endDate: z.string().date('Invalid end date format (use YYYY-MM-DD)').optional(),
});

/**
 * Bulk Update Schema
 */
export const bulkUpdateScheduledExpensesSchema = z.object({
  parentId: z.string().uuid('Invalid parent ID format'),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description must be less than 255 characters')
    .optional(),
  categoryId: z.string().uuid('Invalid category ID format').nullable().optional(),
  budgetId: z.string().uuid('Invalid budget ID format').nullable().optional(),
});

/**
 * Bulk Delete Schema
 */
export const bulkDeleteScheduledExpensesSchema = z.object({
  parentId: z.string().uuid('Invalid parent ID format'),
});

// Export types inferred from schemas
export type ScheduledExpenseInput = z.infer<typeof scheduledExpenseInputSchema>;
export type ScheduledExpenseUpdate = z.infer<typeof scheduledExpenseUpdateSchema>;
export type ScheduledExpenseId = z.infer<typeof scheduledExpenseIdSchema>;
export type PayScheduledExpense = z.infer<typeof payScheduledExpenseSchema>;
export type ScheduledExpenseFilter = z.infer<typeof scheduledExpenseFilterSchema>;
export type BulkUpdateScheduledExpenses = z.infer<typeof bulkUpdateScheduledExpensesSchema>;
export type BulkDeleteScheduledExpenses = z.infer<typeof bulkDeleteScheduledExpensesSchema>;
