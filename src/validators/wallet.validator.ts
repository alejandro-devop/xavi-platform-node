import { z } from 'zod';

// ============ ACCOUNTS ============

export const createAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['bank', 'cash', 'credit_card', 'savings', 'investment', 'other']),
    currency: z.string().length(3).optional().default('USD'),
    initialBalance: z.number().optional().default(0),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    icon: z.string().max(50).optional(),
  }),
});

export const getAccountsSchema = z.object({
  query: z.object({
    type: z.enum(['bank', 'cash', 'credit_card', 'savings', 'investment', 'other']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getAccountSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const updateAccountSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    type: z.enum(['bank', 'cash', 'credit_card', 'savings', 'investment', 'other']).optional(),
    currency: z.string().length(3).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    icon: z.string().max(50).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteAccountSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const getAccountSummarySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

// ============ CATEGORIES ============

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['income', 'expense']),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    icon: z.string().max(50).optional(),
  }),
});

export const getCategoriesSchema = z.object({
  query: z.object({
    type: z.enum(['income', 'expense']).optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    type: z.enum(['income', 'expense']).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    icon: z.string().max(50).optional(),
  }),
});

export const deleteCategorySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// ============ TRANSACTIONS ============

export const createTransactionSchema = z.object({
  body: z.object({
    accountId: z.number().int().positive(),
    categoryId: z.number().int().positive().optional(),
    type: z.enum(['income', 'expense', 'transfer']),
    amount: z.number().positive(),
    description: z.string().max(255).optional(),
    transactionDate: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
});

export const getTransactionsSchema = z.object({
  query: z.object({
    accountId: z.string().regex(/^\d+$/).optional(),
    categoryId: z.string().regex(/^\d+$/).optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getTransactionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    categoryId: z.number().int().positive().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    amount: z.number().positive().optional(),
    description: z.string().max(255).optional(),
    transactionDate: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
});

export const deleteTransactionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});
