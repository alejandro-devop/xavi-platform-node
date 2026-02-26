import { z } from 'zod';

/**
 * Expense Category Input Schema - For creating categories
 */
export const expenseCategoryInputSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: "Type must be 'income' or 'expense'" }),
  }),
  color: z
    .string()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      'Color must be a valid hex color (e.g., #FFF or #FF5733)'
    )
    .optional(),
  icon: z
    .string()
    .min(4, 'Icon must be at least 4 characters')
    .max(20, 'Icon must be less than 20 characters')
    .optional(),
});

/**
 * Expense Category Update Schema - For updating categories
 */
export const expenseCategoryUpdateSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  type: z
    .enum(['income', 'expense'], {
      errorMap: () => ({ message: "Type must be 'income' or 'expense'" }),
    })
    .optional(),
  color: z
    .string()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      'Color must be a valid hex color (e.g., #FFF or #FF5733)'
    )
    .optional(),
  icon: z
    .string()
    .min(4, 'Icon must be at least 4 characters')
    .max(20, 'Icon must be less than 20 characters')
    .optional(),
});

/**
 * Category ID Schema - For operations requiring category ID
 */
export const categoryIdSchema = z.object({
  id: z.string().uuid('Invalid category ID format'),
});

/**
 * Category Type Filter Schema - For filtering by type
 */
export const categoryTypeFilterSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
});

// Export types inferred from schemas
export type ExpenseCategoryInput = z.infer<typeof expenseCategoryInputSchema>;
export type ExpenseCategoryUpdate = z.infer<typeof expenseCategoryUpdateSchema>;
export type CategoryId = z.infer<typeof categoryIdSchema>;
export type CategoryTypeFilter = z.infer<typeof categoryTypeFilterSchema>;
