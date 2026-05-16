import { z } from 'zod';

const uuidParam = z.string().uuid();

const paginationQuery = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

// ============ SHOPPING LISTS ============

export const createShoppingListSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
  }),
});

export const getShoppingListsSchema = z.object({
  query: paginationQuery,
});

export const getShoppingListSchema = z.object({
  params: z.object({
    listId: uuidParam,
  }),
});

export const updateShoppingListSchema = z.object({
  params: z.object({
    listId: uuidParam,
  }),
  body: z.object({
    name: z.string().min(1).max(255),
  }),
});

export const deleteShoppingListSchema = z.object({
  params: z.object({
    listId: uuidParam,
  }),
});

// ============ CATALOG ITEMS ============

export const createCatalogItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    price: z.number().nonnegative().optional(),
  }),
});

export const getCatalogItemsSchema = z.object({
  query: paginationQuery,
});

export const getCatalogItemSchema = z.object({
  params: z.object({
    itemId: uuidParam,
  }),
});

export const updateCatalogItemSchema = z.object({
  params: z.object({
    itemId: uuidParam,
  }),
  body: z
    .object({
      name: z.string().min(1).max(255).optional(),
      price: z.union([z.number().nonnegative(), z.null()]).optional(),
    })
    .refine((data) => data.name !== undefined || data.price !== undefined, {
      message: 'At least one of name, price is required',
    }),
});

export const deleteCatalogItemSchema = z.object({
  params: z.object({
    itemId: uuidParam,
  }),
});

// ============ LIST ↔ ITEM ============

export const addItemToShoppingListSchema = z.object({
  params: z.object({
    listId: uuidParam,
  }),
  body: z.object({
    itemId: uuidParam,
    price: z.number().nonnegative().optional(),
    quantity: z.number().positive().optional().default(1),
  }),
});

export const getShoppingListItemsSchema = z.object({
  params: z.object({
    listId: uuidParam,
  }),
});

export const updateShoppingListItemSchema = z.object({
  params: z.object({
    listId: uuidParam,
    listItemId: uuidParam,
  }),
  body: z
    .object({
      price: z.union([z.number().nonnegative(), z.null()]).optional(),
      quantity: z.number().positive().optional(),
    })
    .refine((data) => data.price !== undefined || data.quantity !== undefined, {
      message: 'At least one of price, quantity is required',
    }),
});

export const deleteShoppingListItemSchema = z.object({
  params: z.object({
    listId: uuidParam,
    listItemId: uuidParam,
  }),
});
