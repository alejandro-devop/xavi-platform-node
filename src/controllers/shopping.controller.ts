import { Request, Response } from 'express';
import { successResponse } from '../shared/utils/response';
import { shoppingService } from '../services/shopping.service';

function parsePageLimit(query: Request['query']): { page: number; limit: number } {
  const page = parseInt((query.page as string) ?? '1', 10);
  const limit = parseInt((query.limit as string) ?? '20', 10);
  return { page, limit };
}

// ============ SHOPPING LISTS ============

export async function createShoppingList(req: Request, res: Response): Promise<void> {
  const { name } = req.body;
  const list = await shoppingService.createShoppingList(req.user!.id, name);
  res.status(201).json(successResponse({ shoppingList: list }));
}

export async function getShoppingLists(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePageLimit(req.query);
  const result = await shoppingService.getShoppingLists(req.user!.id, page, limit);
  res.json(
    successResponse({
      shoppingLists: result.shoppingLists,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    })
  );
}

export async function getShoppingListById(req: Request, res: Response): Promise<void> {
  const { listId } = req.params;
  const shoppingList = await shoppingService.getShoppingListById(listId, req.user!.id);
  res.json(successResponse({ shoppingList }));
}

export async function updateShoppingList(req: Request, res: Response): Promise<void> {
  const { listId } = req.params;
  const { name } = req.body;
  const shoppingList = await shoppingService.updateShoppingList(listId, req.user!.id, name);
  res.json(successResponse({ shoppingList }));
}

export async function deleteShoppingList(req: Request, res: Response): Promise<void> {
  const { listId } = req.params;
  await shoppingService.deleteShoppingList(listId, req.user!.id);
  res.json(successResponse({ message: 'Shopping list deleted successfully' }));
}

// ============ CATALOG ITEMS ============

export async function createCatalogItem(req: Request, res: Response): Promise<void> {
  const { name, price } = req.body;
  const item = await shoppingService.createCatalogItem(req.user!.id, { name, price });
  res.status(201).json(successResponse({ item }));
}

export async function getCatalogItems(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePageLimit(req.query);
  const result = await shoppingService.getCatalogItems(req.user!.id, page, limit);
  res.json(
    successResponse({
      items: result.items,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    })
  );
}

export async function getCatalogItemById(req: Request, res: Response): Promise<void> {
  const { itemId } = req.params;
  const item = await shoppingService.getCatalogItemById(itemId, req.user!.id);
  res.json(successResponse({ item }));
}

export async function updateCatalogItem(req: Request, res: Response): Promise<void> {
  const { itemId } = req.params;
  const { name, price } = req.body;
  const item = await shoppingService.updateCatalogItem(itemId, req.user!.id, { name, price });
  res.json(successResponse({ item }));
}

export async function deleteCatalogItem(req: Request, res: Response): Promise<void> {
  const { itemId } = req.params;
  await shoppingService.deleteCatalogItem(itemId, req.user!.id);
  res.json(successResponse({ message: 'Item deleted successfully' }));
}

// ============ LIST ↔ ITEM RELATIONS ============

export async function addItemToShoppingList(req: Request, res: Response): Promise<void> {
  const { listId } = req.params;
  const { itemId, price, quantity } = req.body;
  const listItem = await shoppingService.addItemToShoppingList(listId, req.user!.id, {
    itemId,
    price,
    quantity,
  });
  res.status(201).json(successResponse({ listItem }));
}

export async function getShoppingListItems(req: Request, res: Response): Promise<void> {
  const { listId } = req.params;
  const listItems = await shoppingService.getShoppingListItems(listId, req.user!.id);
  res.json(successResponse({ listItems }));
}

export async function updateShoppingListItem(req: Request, res: Response): Promise<void> {
  const { listId, listItemId } = req.params;
  const { price, quantity } = req.body;
  const listItem = await shoppingService.updateShoppingListItem(listId, listItemId, req.user!.id, {
    price,
    quantity,
  });
  res.json(successResponse({ listItem }));
}

export async function deleteShoppingListItem(req: Request, res: Response): Promise<void> {
  const { listId, listItemId } = req.params;
  await shoppingService.deleteShoppingListItem(listId, listItemId, req.user!.id);
  res.json(successResponse({ message: 'Item removed from shopping list' }));
}
