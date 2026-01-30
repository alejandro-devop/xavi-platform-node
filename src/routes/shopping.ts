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
  completeShoppingList,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  toggleItemPurchased,
} from '../controllers/shopping.controller';
import {
  createShoppingListSchema,
  getShoppingListsSchema,
  getShoppingListSchema,
  updateShoppingListSchema,
  deleteShoppingListSchema,
  completeShoppingListSchema,
  createShoppingItemSchema,
  updateShoppingItemSchema,
  deleteShoppingItemSchema,
  toggleItemPurchasedSchema,
} from '../validators/shopping.validator';

const router = Router();

// All shopping routes require authentication
router.use(authMiddleware);

// ============ SHOPPING LIST ROUTES ============
router.post('/', validate(createShoppingListSchema), asyncHandler(createShoppingList));
router.get('/', validate(getShoppingListsSchema), asyncHandler(getShoppingLists));
router.get('/:id', validate(getShoppingListSchema), asyncHandler(getShoppingListById));
router.put('/:id', validate(updateShoppingListSchema), asyncHandler(updateShoppingList));
router.delete('/:id', validate(deleteShoppingListSchema), asyncHandler(deleteShoppingList));
router.post('/:id/complete', validate(completeShoppingListSchema), asyncHandler(completeShoppingList));

// ============ SHOPPING ITEM ROUTES ============
router.post('/:id/items', validate(createShoppingItemSchema), asyncHandler(createShoppingItem));
router.put('/:id/items/:itemId', validate(updateShoppingItemSchema), asyncHandler(updateShoppingItem));
router.delete('/:id/items/:itemId', validate(deleteShoppingItemSchema), asyncHandler(deleteShoppingItem));
router.post('/:id/items/:itemId/toggle', validate(toggleItemPurchasedSchema), asyncHandler(toggleItemPurchased));

export default router;
