import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createShoppingList,
  getShoppingLists,
  getShoppingListById,
  updateShoppingList,
  deleteShoppingList,
  createCatalogItem,
  getCatalogItems,
  getCatalogItemById,
  updateCatalogItem,
  deleteCatalogItem,
  addItemToShoppingList,
  getShoppingListItems,
  updateShoppingListItem,
  deleteShoppingListItem,
} from '../controllers/shopping.controller';
import {
  createShoppingListSchema,
  getShoppingListsSchema,
  getShoppingListSchema,
  updateShoppingListSchema,
  deleteShoppingListSchema,
  createCatalogItemSchema,
  getCatalogItemsSchema,
  getCatalogItemSchema,
  updateCatalogItemSchema,
  deleteCatalogItemSchema,
  addItemToShoppingListSchema,
  getShoppingListItemsSchema,
  updateShoppingListItemSchema,
  deleteShoppingListItemSchema,
} from '../validators/shopping.validator';

const router = Router();

router.use(authMiddleware);

// Catalog items (declare before /lists/:listId to avoid shadowing if paths overlap)
router.post('/items', validate(createCatalogItemSchema), asyncHandler(createCatalogItem));
router.get('/items', validate(getCatalogItemsSchema), asyncHandler(getCatalogItems));
router.get('/items/:itemId', validate(getCatalogItemSchema), asyncHandler(getCatalogItemById));
router.patch('/items/:itemId', validate(updateCatalogItemSchema), asyncHandler(updateCatalogItem));
router.delete('/items/:itemId', validate(deleteCatalogItemSchema), asyncHandler(deleteCatalogItem));

// Shopping lists
router.post('/lists', validate(createShoppingListSchema), asyncHandler(createShoppingList));
router.get('/lists', validate(getShoppingListsSchema), asyncHandler(getShoppingLists));
router.get('/lists/:listId', validate(getShoppingListSchema), asyncHandler(getShoppingListById));
router.patch(
  '/lists/:listId',
  validate(updateShoppingListSchema),
  asyncHandler(updateShoppingList)
);
router.delete(
  '/lists/:listId',
  validate(deleteShoppingListSchema),
  asyncHandler(deleteShoppingList)
);

// List ↔ catalog item relations
router.post(
  '/lists/:listId/items',
  validate(addItemToShoppingListSchema),
  asyncHandler(addItemToShoppingList)
);
router.get(
  '/lists/:listId/items',
  validate(getShoppingListItemsSchema),
  asyncHandler(getShoppingListItems)
);
router.patch(
  '/lists/:listId/items/:listItemId',
  validate(updateShoppingListItemSchema),
  asyncHandler(updateShoppingListItem)
);
router.delete(
  '/lists/:listId/items/:listItemId',
  validate(deleteShoppingListItemSchema),
  asyncHandler(deleteShoppingListItem)
);

export default router;
