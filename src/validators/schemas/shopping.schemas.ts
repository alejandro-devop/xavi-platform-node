import { z } from 'zod';

/** Query.shoppingList(id) */
export const shoppingListIdArgSchema = z.object({
  id: z.string().uuid('Invalid shopping list ID'),
});

export const shoppingListItemsListIdSchema = z.object({
  listId: z.string().uuid('Invalid shopping list ID'),
});

/** Query.shoppingCatalogItem(id) */
export const shoppingCatalogItemIdArgSchema = z.object({
  id: z.string().uuid('Invalid item ID'),
});

export const shoppingPaginationSchema = z
  .object({
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    page: d.page ?? 1,
    limit: d.limit ?? 20,
  }));

export const shoppingListAddInputSchema = z.object({
  name: z.string().min(1).max(255),
});

export const shoppingListUpdateInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
});

export const shoppingCatalogItemAddInputSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.coerce.number().nonnegative().optional(),
});

export const shoppingCatalogItemUpdateInputSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
  })
  .refine((d) => d.name !== undefined || d.price !== undefined, {
    message: 'At least one of name, price is required',
  });

export const shoppingListItemAddInputSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
  quantity: z.coerce.number().positive().optional(),
});

export const shoppingListItemCreateWithCatalogInputSchema = z.object({
  listId: z.string().uuid(),
  name: z.string().min(1).max(255),
  catalogPrice: z.coerce.number().nonnegative().optional(),
  price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
  quantity: z.coerce.number().positive().optional(),
});

export const shoppingListItemUpdateInputSchema = z
  .object({
    listId: z.string().uuid(),
    listItemId: z.string().uuid(),
    price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
    quantity: z.coerce.number().positive().optional(),
  })
  .refine((d) => d.price !== undefined || d.quantity !== undefined, {
    message: 'At least one of price, quantity is required',
  });

export const shoppingListItemRemoveInputSchema = z.object({
  listId: z.string().uuid(),
  listItemId: z.string().uuid(),
});
