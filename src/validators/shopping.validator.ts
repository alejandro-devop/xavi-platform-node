import { z } from 'zod';

// ============ SHOPPING LISTS ============

export const createShoppingListSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    shoppingDate: z.string().date().optional(),
  }),
});

export const getShoppingListsSchema = z.object({
  query: z.object({
    status: z.enum(['active', 'completed', 'cancelled']).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getShoppingListSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const updateShoppingListSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'completed', 'cancelled']).optional(),
    shoppingDate: z.string().date().optional(),
  }),
});

export const deleteShoppingListSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const completeShoppingListSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// ============ SHOPPING ITEMS ============

export const createShoppingItemSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // shopping list id
  }),
  body: z.object({
    name: z.string().min(1).max(255),
    quantity: z.number().positive().optional().default(1),
    unit: z.string().max(50).optional(),
    price: z.number().positive().optional(),
    category: z.string().max(100).optional(),
    notes: z.string().optional(),
    orderIndex: z.number().int().min(0).optional().default(0),
  }),
});

export const updateShoppingItemSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // shopping list id
    itemId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().max(50).optional(),
    price: z.number().positive().optional(),
    isPurchased: z.boolean().optional(),
    category: z.string().max(100).optional(),
    notes: z.string().optional(),
    orderIndex: z.number().int().min(0).optional(),
  }),
});

export const deleteShoppingItemSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // shopping list id
    itemId: z.string().regex(/^\d+$/),
  }),
});

export const toggleItemPurchasedSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // shopping list id
    itemId: z.string().regex(/^\d+$/),
  }),
});
