import { z } from 'zod';
import { createUniqueValidator } from '../../shared/utils/custom-validators';
import { walletBudgets } from '../../shared/database/schema';
import { checkFieldUniqueness, normalizeName } from '../../shared/utils/db-validators';

export const budgetIdSchema = z.object({
  id: z.string().uuid('Invalid budget ID format'),
});

export const budgetFilterSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID format').optional(),
  isActive: z.boolean().optional(),
});

export const createBudgetInputSchema = (userId: number) =>
  z
    .object({
      walletId: z.string().uuid('Invalid wallet ID format').nullable().optional(),
      frequencyId: z.string().uuid('Invalid frequency ID format').nullable().optional(),
      name: z
        .string()
        .trim()
        .transform(normalizeName)
        .pipe(
          z
            .string()
            .min(3, 'Name must be at least 3 characters')
            .max(255, 'Name must be less than 255 characters')
            .refine(
              createUniqueValidator(async (name: string) => {
                return await checkFieldUniqueness({
                  table: walletBudgets,
                  value: name,
                  scopeValue: userId,
                });
              }),
              { message: 'A budget with this name already exists' }
            )
        ),
      description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
      icon: z.string().max(50, 'Icon must be less than 50 characters').optional(),
      amount: z.number().min(0.01, 'Amount must be greater than 0'),
      startDate: z.string().date('Invalid start date format (use YYYY-MM-DD)'),
      endDate: z.string().date('Invalid end date format (use YYYY-MM-DD)'),
      isActive: z.boolean().optional(),
    })
    .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    });

export const budgetInputSchema = z
  .object({
    walletId: z.string().uuid('Invalid wallet ID format').nullable().optional(),
    frequencyId: z.string().uuid('Invalid frequency ID format').nullable().optional(),
    name: z
      .string()
      .trim()
      .transform(normalizeName)
      .pipe(
        z
          .string()
          .min(3, 'Name must be at least 3 characters')
          .max(255, 'Name must be less than 255 characters')
      ),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    icon: z.string().max(50, 'Icon must be less than 50 characters').optional(),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    startDate: z.string().date('Invalid start date format (use YYYY-MM-DD)'),
    endDate: z.string().date('Invalid end date format (use YYYY-MM-DD)'),
    isActive: z.boolean().optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be greater than or equal to start date',
    path: ['endDate'],
  });

export const createBudgetUpdateSchema = (userId: number, budgetId?: string) =>
  z
    .object({
      walletId: z.string().uuid('Invalid wallet ID format').nullable().optional(),
      frequencyId: z.string().uuid('Invalid frequency ID format').nullable().optional(),
      name: z
        .string()
        .trim()
        .transform(normalizeName)
        .pipe(
          z
            .string()
            .min(3, 'Name must be at least 3 characters')
            .max(255, 'Name must be less than 255 characters')
            .refine(
              createUniqueValidator(async (name: string) => {
                return await checkFieldUniqueness({
                  table: walletBudgets,
                  value: name,
                  scopeValue: userId,
                  excludeId: budgetId,
                });
              }),
              { message: 'A budget with this name already exists' }
            )
        )
        .optional(),
      description: z
        .string()
        .max(1000, 'Description must be less than 1000 characters')
        .nullable()
        .optional(),
      icon: z.string().max(50, 'Icon must be less than 50 characters').nullable().optional(),
      amount: z.number().min(0.01, 'Amount must be greater than 0').optional(),
      balance: z.number().optional(),
      startDate: z.string().date('Invalid start date format (use YYYY-MM-DD)').optional(),
      endDate: z.string().date('Invalid end date format (use YYYY-MM-DD)').optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.endDate) >= new Date(data.startDate);
        }
        return true;
      },
      {
        message: 'End date must be greater than or equal to start date',
        path: ['endDate'],
      }
    );

export const budgetUpdateSchema = z
  .object({
    walletId: z.string().uuid('Invalid wallet ID format').nullable().optional(),
    frequencyId: z.string().uuid('Invalid frequency ID format').nullable().optional(),
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(255, 'Name must be less than 255 characters')
      .optional(),
    description: z
      .string()
      .max(1000, 'Description must be less than 1000 characters')
      .nullable()
      .optional(),
    icon: z.string().max(50, 'Icon must be less than 50 characters').nullable().optional(),
    amount: z.number().min(0.01, 'Amount must be greater than 0').optional(),
    balance: z.number().optional(),
    startDate: z.string().date('Invalid start date format (use YYYY-MM-DD)').optional(),
    endDate: z.string().date('Invalid end date format (use YYYY-MM-DD)').optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  );

export const applyBudgetToExpensesSchema = z.object({
  expensesIds: z
    .array(z.string().uuid('Invalid expense ID format'))
    .min(1, 'At least one expense ID is required'),
  budgetId: z.string().uuid('Invalid budget ID format'),
  scheduled: z.boolean().optional().default(false),
});

export const closeBudgetPeriodSchema = z.object({
  budgetId: z.string().uuid('Invalid budget ID format'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export const budgetClosuresFilterSchema = z.object({
  budgetId: z.string().uuid('Invalid budget ID format'),
});

export const bulkCloseBudgetPeriodsSchema = z
  .object({
    inputs: z.array(closeBudgetPeriodSchema).min(1, 'At least one budget closure is required'),
  })
  .refine(
    (data) => {
      const ids = data.inputs.map((item) => item.budgetId);
      return new Set(ids).size === ids.length;
    },
    {
      message: 'Duplicate budget IDs are not allowed in bulk closure',
      path: ['inputs'],
    }
  );

export type BudgetId = z.infer<typeof budgetIdSchema>;
export type BudgetFilter = z.infer<typeof budgetFilterSchema>;
export type BudgetInput = z.infer<typeof budgetInputSchema>;
export type BudgetUpdate = z.infer<typeof budgetUpdateSchema>;
export type ApplyBudgetToExpenses = z.infer<typeof applyBudgetToExpensesSchema>;
export type CloseBudgetPeriod = z.infer<typeof closeBudgetPeriodSchema>;
export type BudgetClosuresFilter = z.infer<typeof budgetClosuresFilterSchema>;
export type BulkCloseBudgetPeriods = z.infer<typeof bulkCloseBudgetPeriodsSchema>;
