import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

// ============ SHOPPING LISTS ============

export async function createShoppingList(req: Request, res: Response): Promise<void> {
  const { name, description, shoppingDate } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO shopping_lists (user_id, name, description, shopping_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, name, description, status, shopping_date, created_at, updated_at`,
    [userId, name, description || null, shoppingDate || null]
  );

  const list = result.rows[0];

  res.status(201).json(
    successResponse({
      shoppingList: {
        id: list.id,
        userId: list.user_id,
        name: list.name,
        description: list.description,
        status: list.status,
        shoppingDate: list.shopping_date,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      },
    })
  );
}

export async function getShoppingLists(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { status, startDate, endDate, page = '1', limit = '20' } = req.query;

  let query = `
    SELECT 
      sl.*,
      COUNT(si.id) as total_items,
      COUNT(CASE WHEN si.is_purchased = true THEN 1 END) as purchased_items,
      COALESCE(SUM(CASE WHEN si.is_purchased = true THEN si.price * si.quantity ELSE 0 END), 0) as total_spent
    FROM shopping_lists sl
    LEFT JOIN shopping_items si ON sl.id = si.shopping_list_id
    WHERE sl.user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (status) {
    query += ` AND sl.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (startDate) {
    query += ` AND sl.shopping_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND sl.shopping_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  query += ' GROUP BY sl.id ORDER BY sl.shopping_date DESC NULLS LAST, sl.created_at DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  const shoppingLists = result.rows.map((list) => ({
    id: list.id,
    userId: list.user_id,
    name: list.name,
    description: list.description,
    status: list.status,
    shoppingDate: list.shopping_date,
    createdAt: list.created_at,
    updatedAt: list.updated_at,
    itemsCount: {
      total: parseInt(list.total_items),
      purchased: parseInt(list.purchased_items),
    },
    totalSpent: parseFloat(list.total_spent),
  }));

  res.json(
    successResponse({
      shoppingLists,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: shoppingLists.length,
      },
    })
  );
}

export async function getShoppingListById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [id]);

  if (listResult.rows.length === 0) {
    throw new NotFoundError('Shopping list not found');
  }

  const list = listResult.rows[0];

  if (list.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this shopping list');
  }

  // Get items for this list
  const itemsResult = await db.query(
    'SELECT * FROM shopping_items WHERE shopping_list_id = $1 ORDER BY order_index ASC, created_at ASC',
    [id]
  );

  const items = itemsResult.rows.map((item) => ({
    id: item.id,
    shoppingListId: item.shopping_list_id,
    name: item.name,
    quantity: parseFloat(item.quantity),
    unit: item.unit,
    price: item.price ? parseFloat(item.price) : null,
    isPurchased: item.is_purchased,
    category: item.category,
    notes: item.notes,
    orderIndex: item.order_index,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));

  res.json(
    successResponse({
      shoppingList: {
        id: list.id,
        userId: list.user_id,
        name: list.name,
        description: list.description,
        status: list.status,
        shoppingDate: list.shopping_date,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
        items,
      },
    })
  );
}

export async function updateShoppingList(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Shopping list not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update this shopping list');
  }

  const { name, description, status, shoppingDate } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(description);
    paramIndex++;
  }

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (shoppingDate !== undefined) {
    updates.push(`shopping_date = $${paramIndex}`);
    params.push(shoppingDate);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(id);

  const result = await db.query(
    `UPDATE shopping_lists SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const list = result.rows[0];

  res.json(
    successResponse({
      shoppingList: {
        id: list.id,
        userId: list.user_id,
        name: list.name,
        description: list.description,
        status: list.status,
        shoppingDate: list.shopping_date,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      },
    })
  );
}

export async function deleteShoppingList(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Shopping list not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this shopping list');
  }

  await db.query('DELETE FROM shopping_lists WHERE id = $1', [id]);

  res.json(successResponse({ message: 'Shopping list deleted successfully' }));
}

export async function completeShoppingList(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Shopping list not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to complete this shopping list');
  }

  const result = await db.query(
    "UPDATE shopping_lists SET status = 'completed' WHERE id = $1 RETURNING *",
    [id]
  );

  const list = result.rows[0];

  res.json(
    successResponse({
      shoppingList: {
        id: list.id,
        userId: list.user_id,
        name: list.name,
        description: list.description,
        status: list.status,
        shoppingDate: list.shopping_date,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      },
    })
  );
}

// ============ SHOPPING ITEMS ============

export async function createShoppingItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params; // shopping list id
  const { name, quantity, unit, price, category, notes, orderIndex } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify list ownership
  const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [id]);

  if (listResult.rows.length === 0) {
    throw new NotFoundError('Shopping list not found');
  }

  if (listResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to add items to this shopping list');
  }

  const result = await db.query(
    `INSERT INTO shopping_items (shopping_list_id, name, quantity, unit, price, category, notes, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, shopping_list_id, name, quantity, unit, price, is_purchased, category, notes, order_index, created_at, updated_at`,
    [
      id,
      name,
      quantity || 1,
      unit || null,
      price || null,
      category || null,
      notes || null,
      orderIndex || 0,
    ]
  );

  const item = result.rows[0];

  res.status(201).json(
    successResponse({
      item: {
        id: item.id,
        shoppingListId: item.shopping_list_id,
        name: item.name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        price: item.price ? parseFloat(item.price) : null,
        isPurchased: item.is_purchased,
        category: item.category,
        notes: item.notes,
        orderIndex: item.order_index,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      },
    })
  );
}

export async function updateShoppingItem(req: Request, res: Response): Promise<void> {
  const { id, itemId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify list ownership
  const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [id]);

  if (listResult.rows.length === 0) {
    throw new NotFoundError('Shopping list not found');
  }

  if (listResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update items in this shopping list');
  }

  // Verify item exists in this list
  const itemCheck = await db.query(
    'SELECT * FROM shopping_items WHERE id = $1 AND shopping_list_id = $2',
    [itemId, id]
  );

  if (itemCheck.rows.length === 0) {
    throw new NotFoundError('Item not found in this shopping list');
  }

  const { name, quantity, unit, price, isPurchased, category, notes, orderIndex } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }

  if (quantity !== undefined) {
    updates.push(`quantity = $${paramIndex}`);
    params.push(quantity);
    paramIndex++;
  }

  if (unit !== undefined) {
    updates.push(`unit = $${paramIndex}`);
    params.push(unit);
    paramIndex++;
  }

  if (price !== undefined) {
    updates.push(`price = $${paramIndex}`);
    params.push(price);
    paramIndex++;
  }

  if (isPurchased !== undefined) {
    updates.push(`is_purchased = $${paramIndex}`);
    params.push(isPurchased);
    paramIndex++;
  }

  if (category !== undefined) {
    updates.push(`category = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(notes);
    paramIndex++;
  }

  if (orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(orderIndex);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(itemId);

  const result = await db.query(
    `UPDATE shopping_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const item = result.rows[0];

  res.json(
    successResponse({
      item: {
        id: item.id,
        shoppingListId: item.shopping_list_id,
        name: item.name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        price: item.price ? parseFloat(item.price) : null,
        isPurchased: item.is_purchased,
        category: item.category,
        notes: item.notes,
        orderIndex: item.order_index,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      },
    })
  );
}

export async function deleteShoppingItem(req: Request, res: Response): Promise<void> {
  const { id, itemId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify list ownership
  const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [id]);

  if (listResult.rows.length === 0) {
    throw new NotFoundError('Shopping list not found');
  }

  if (listResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete items from this shopping list');
  }

  // Verify item exists in this list
  const itemCheck = await db.query(
    'SELECT * FROM shopping_items WHERE id = $1 AND shopping_list_id = $2',
    [itemId, id]
  );

  if (itemCheck.rows.length === 0) {
    throw new NotFoundError('Item not found in this shopping list');
  }

  await db.query('DELETE FROM shopping_items WHERE id = $1', [itemId]);

  res.json(successResponse({ message: 'Item deleted successfully' }));
}

export async function toggleItemPurchased(req: Request, res: Response): Promise<void> {
  const { id, itemId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify list ownership
  const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [id]);

  if (listResult.rows.length === 0) {
    throw new NotFoundError('Shopping list not found');
  }

  if (listResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update items in this shopping list');
  }

  // Verify item exists in this list
  const itemCheck = await db.query(
    'SELECT * FROM shopping_items WHERE id = $1 AND shopping_list_id = $2',
    [itemId, id]
  );

  if (itemCheck.rows.length === 0) {
    throw new NotFoundError('Item not found in this shopping list');
  }

  // Toggle purchased status
  const result = await db.query(
    'UPDATE shopping_items SET is_purchased = NOT is_purchased WHERE id = $1 RETURNING *',
    [itemId]
  );

  const item = result.rows[0];

  res.json(
    successResponse({
      item: {
        id: item.id,
        shoppingListId: item.shopping_list_id,
        name: item.name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        price: item.price ? parseFloat(item.price) : null,
        isPurchased: item.is_purchased,
        category: item.category,
        notes: item.notes,
        orderIndex: item.order_index,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      },
    })
  );
}
