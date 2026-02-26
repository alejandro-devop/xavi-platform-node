import { z } from 'zod';
import { createUniqueValidator } from '../../shared/utils/custom-validators';
import { expenseCategoryService } from '../../services/expense-category.service';

/**
 * Expense Category Input Schema - For creating categories
 * Factory function to create schema with user context for async validation
 */
export const createExpenseCategoryInputSchema = (userId: number) =>
  z.object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must be less than 100 characters')
      .refine(
        createUniqueValidator(async (name: string) => {
          return await expenseCategoryService.isNameUnique(userId, name);
        }),
        { message: 'A category with this name already exists' }
      ),
    type: z.enum(['income', 'expense'], {
      errorMap: () => ({ message: "Type must be 'income' or 'expense'" }),
    }),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    color: z
      .string()
      .regex(
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
        'Color must be a valid hex color (e.g., #FFF or #FF5733)'
      )
      .optional(),
    icon: z
      .string()
      .min(3, 'Icon must be at least 3 characters')
      .max(20, 'Icon must be less than 20 characters')
      .optional(),
    isTransaction: z.boolean().optional(),
  });

/**
 * Expense Category Input Schema - For creating categories (without async validation)
 */
export const expenseCategoryInputSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: "Type must be 'income' or 'expense'" }),
  }),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  color: z
    .string()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      'Color must be a valid hex color (e.g., #FFF or #FF5733)'
    )
    .optional(),
  icon: z
    .string()
    .min(3, 'Icon must be at least 3 characters')
    .max(20, 'Icon must be less than 20 characters')
    .optional(),
  isTransaction: z.boolean().optional(),
});

/**
 * Expense Category Update Schema - For updating categories
 * Factory function to create schema with user context for async validation
 */
export const createExpenseCategoryUpdateSchema = (userId: number, categoryId?: string) =>
  z.object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must be less than 100 characters')
      .refine(
        createUniqueValidator(async (name: string) => {
          return await expenseCategoryService.isNameUnique(userId, name, categoryId);
        }),
        { message: 'A category with this name already exists' }
      )
      .optional(),
    type: z
      .enum(['income', 'expense'], {
        errorMap: () => ({ message: "Type must be 'income' or 'expense'" }),
      })
      .optional(),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    color: z
      .string()
      .regex(
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
        'Color must be a valid hex color (e.g., #FFF or #FF5733)'
      )
      .optional(),
    icon: z
      .string()
      .min(3, 'Icon must be at least 3 characters')
      .max(20, 'Icon must be less than 20 characters')
      .optional(),
    isTransaction: z.boolean().optional(),
  });

/**
 * Expense Category Update Schema - For updating categories (without async validation)
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
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  color: z
    .string()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      'Color must be a valid hex color (e.g., #FFF or #FF5733)'
    )
    .optional(),
  icon: z
    .string()
    .min(3, 'Icon must be at least 3 characters')
    .max(20, 'Icon must be less than 20 characters')
    .optional(),
  isTransaction: z.boolean().optional(),
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
