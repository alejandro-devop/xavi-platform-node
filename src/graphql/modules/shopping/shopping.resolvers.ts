import { shoppingService } from '../../../services/shopping.service';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  shoppingListIdArgSchema,
  shoppingListItemsListIdSchema,
  shoppingCatalogItemIdArgSchema,
  shoppingPaginationSchema,
  shoppingListAddInputSchema,
  shoppingListUpdateInputSchema,
  shoppingCatalogItemAddInputSchema,
  shoppingCatalogItemUpdateInputSchema,
  shoppingListItemAddInputSchema,
  shoppingListItemCreateWithCatalogInputSchema,
  shoppingListItemUpdateInputSchema,
  shoppingListItemRemoveInputSchema,
} from '../../../validators/schemas/shopping.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const shoppingResolvers = {
  Query: {
    shoppingList: withValidatedResolver(
      shoppingListIdArgSchema,
      async (_parent: unknown, { id }: { id: string }, context) => {
        requireAuth(context, 'shoppingList');
        return await shoppingService.getShoppingListById(id, uid(context));
      },
      'shoppingList'
    ),

    shoppingLists: withValidatedResolver(
      shoppingPaginationSchema,
      async (_parent: unknown, args: { page: number; limit: number }, context) => {
        requireAuth(context, 'shoppingLists');
        const data = await shoppingService.getShoppingLists(uid(context), args.page, args.limit);
        return {
          shoppingLists: data.shoppingLists,
          page: data.page,
          limit: data.limit,
          total: data.total,
        };
      },
      'shoppingLists'
    ),

    shoppingCatalogItem: withValidatedResolver(
      shoppingCatalogItemIdArgSchema,
      async (_parent: unknown, { id }: { id: string }, context) => {
        requireAuth(context, 'shoppingCatalogItem');
        return await shoppingService.getCatalogItemById(id, uid(context));
      },
      'shoppingCatalogItem'
    ),

    shoppingCatalogItems: withValidatedResolver(
      shoppingPaginationSchema,
      async (_parent: unknown, args: { page: number; limit: number }, context) => {
        requireAuth(context, 'shoppingCatalogItems');
        return await shoppingService.getCatalogItems(uid(context), args.page, args.limit);
      },
      'shoppingCatalogItems'
    ),

    shoppingListItems: withValidatedResolver(
      shoppingListItemsListIdSchema,
      async (_parent: unknown, { listId }: { listId: string }, context) => {
        requireAuth(context, 'shoppingListItems');
        return await shoppingService.getShoppingListItems(listId, uid(context));
      },
      'shoppingListItems'
    ),
  },

  Mutation: {
    shoppingListAdd: withValidatedResolver(
      shoppingListAddInputSchema,
      async (_parent: unknown, { input }: { input: { name: string } }, context) => {
        requireAuth(context, 'shoppingListAdd');
        const list = await shoppingService.createShoppingList(uid(context), input.name);
        return { ...list, listItems: [] };
      },
      'shoppingListAdd'
    ),

    shoppingListUpdate: withValidatedResolver(
      shoppingListUpdateInputSchema,
      async (_parent: unknown, { input }: { input: { id: string; name: string } }, context) => {
        requireAuth(context, 'shoppingListUpdate');
        const list = await shoppingService.updateShoppingList(input.id, uid(context), input.name);
        return { ...list, listItems: [] };
      },
      'shoppingListUpdate'
    ),

    shoppingListRemove: withValidatedResolver(
      shoppingListIdArgSchema,
      async (_parent: unknown, { id }: { id: string }, context) => {
        requireAuth(context, 'shoppingListRemove');
        await shoppingService.deleteShoppingList(id, uid(context));
        return true;
      },
      'shoppingListRemove'
    ),

    shoppingCatalogItemAdd: withValidatedResolver(
      shoppingCatalogItemAddInputSchema,
      async (_parent: unknown, { input }: { input: { name: string; price?: number } }, context) => {
        requireAuth(context, 'shoppingCatalogItemAdd');
        return await shoppingService.createCatalogItem(uid(context), {
          name: input.name,
          price: input.price,
        });
      },
      'shoppingCatalogItemAdd'
    ),

    shoppingCatalogItemUpdate: withValidatedResolver(
      shoppingCatalogItemUpdateInputSchema,
      async (
        _parent: unknown,
        {
          input,
        }: {
          input: {
            id: string;
            name?: string;
            price?: number | null;
          };
        },
        context
      ) => {
        requireAuth(context, 'shoppingCatalogItemUpdate');
        return await shoppingService.updateCatalogItem(input.id, uid(context), {
          name: input.name,
          price: input.price,
        });
      },
      'shoppingCatalogItemUpdate'
    ),

    shoppingCatalogItemRemove: withValidatedResolver(
      shoppingCatalogItemIdArgSchema,
      async (_parent: unknown, { id }: { id: string }, context) => {
        requireAuth(context, 'shoppingCatalogItemRemove');
        await shoppingService.deleteCatalogItem(id, uid(context));
        return true;
      },
      'shoppingCatalogItemRemove'
    ),

    shoppingListItemAdd: withValidatedResolver(
      shoppingListItemAddInputSchema,
      async (
        _parent: unknown,
        {
          input,
        }: {
          input: { listId: string; itemId: string; price?: number | null; quantity?: number };
        },
        context
      ) => {
        requireAuth(context, 'shoppingListItemAdd');
        return await shoppingService.addItemToShoppingList(input.listId, uid(context), {
          itemId: input.itemId,
          price: input.price,
          quantity: input.quantity,
        });
      },
      'shoppingListItemAdd'
    ),

    shoppingListItemCreateWithCatalog: withValidatedResolver(
      shoppingListItemCreateWithCatalogInputSchema,
      async (
        _parent: unknown,
        {
          input,
        }: {
          input: {
            listId: string;
            name: string;
            catalogPrice?: number;
            price?: number | null;
            quantity?: number;
          };
        },
        context
      ) => {
        requireAuth(context, 'shoppingListItemCreateWithCatalog');
        return await shoppingService.createCatalogItemAndAddToShoppingList(
          input.listId,
          uid(context),
          {
            name: input.name,
            catalogPrice: input.catalogPrice,
            price: input.price,
            quantity: input.quantity,
          }
        );
      },
      'shoppingListItemCreateWithCatalog'
    ),

    shoppingListItemUpdate: withValidatedResolver(
      shoppingListItemUpdateInputSchema,
      async (
        _parent: unknown,
        {
          input,
        }: {
          input: {
            listId: string;
            listItemId: string;
            price?: number | null;
            quantity?: number;
          };
        },
        context
      ) => {
        requireAuth(context, 'shoppingListItemUpdate');
        return await shoppingService.updateShoppingListItem(
          input.listId,
          input.listItemId,
          uid(context),
          { price: input.price, quantity: input.quantity }
        );
      },
      'shoppingListItemUpdate'
    ),

    shoppingListItemRemove: withValidatedResolver(
      shoppingListItemRemoveInputSchema,
      async (
        _parent: unknown,
        { input }: { input: { listId: string; listItemId: string } },
        context
      ) => {
        requireAuth(context, 'shoppingListItemRemove');
        await shoppingService.deleteShoppingListItem(input.listId, input.listItemId, uid(context));
        return true;
      },
      'shoppingListItemRemove'
    ),
  },
};
