import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../shared/errors';

function parseMoney(value: string | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  return parseFloat(value);
}

function parseListLinePrice(value: string | number | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function isPgUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  );
}

function assertListOwnership(
  list: { user_id: number },
  userId: number,
  forbiddenMessage: string
): void {
  if (list.user_id !== userId) {
    throw new ForbiddenError(forbiddenMessage);
  }
}

export type ShoppingList = {
  id: string;
  userId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ShoppingItem = {
  id: string;
  userId: number;
  name: string;
  price: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShoppingListItem = {
  id: string;
  shoppingListId: string;
  price: number | null;
  quantity: number;
  isPurchased: boolean;
  item: ShoppingItem;
  createdAt: Date;
  updatedAt: Date;
};

export type ShoppingListWithItems = ShoppingList & { listItems: ShoppingListItem[] };

export type PaginatedShoppingLists = {
  shoppingLists: ShoppingListWithItems[];
  page: number;
  limit: number;
  total: number;
};

export type PaginatedShoppingItems = {
  items: ShoppingItem[];
  page: number;
  limit: number;
  total: number;
};

function mapListRow(row: {
  id: string;
  user_id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}): ShoppingList {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row: {
  id: string;
  user_id: number;
  name: string;
  price: string | null;
  created_at: Date;
  updated_at: Date;
}): ShoppingItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    price: parseMoney(row.price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapListItemRows(rows: Record<string, unknown>[]): ShoppingListItem[] {
  return rows.map((row) => ({
    id: row.list_item_id as string,
    shoppingListId: row.shopping_list_id as string,
    price: parseListLinePrice(row.list_price as string | null | undefined),
    quantity: parseFloat(row.quantity as string),
    isPurchased: Boolean(row.list_item_is_purchased),
    item: {
      id: row.item_id as string,
      userId: row.item_user_id as number,
      name: row.item_name as string,
      price: parseMoney(row.catalog_price as string | null),
      createdAt: row.item_created_at as Date,
      updatedAt: row.item_updated_at as Date,
    },
    createdAt: row.list_item_created_at as Date,
    updatedAt: row.list_item_updated_at as Date,
  }));
}

/** All list items for the given lists, grouped by list id (stable order per list: created_at asc). */
async function fetchListItemsForLists(listIds: string[]): Promise<Map<string, ShoppingListItem[]>> {
  const byList = new Map<string, ShoppingListItem[]>();
  if (listIds.length === 0) {
    return byList;
  }
  const db = getDbPool();
  const itemsResult = await db.query(
    `SELECT
       sli.id AS list_item_id,
       sli.shopping_list_id,
       sli.item_id,
       sli.price AS list_price,
       sli.quantity,
       sli.is_purchased AS list_item_is_purchased,
       sli.created_at AS list_item_created_at,
       sli.updated_at AS list_item_updated_at,
       i.name AS item_name,
       i.price AS catalog_price,
       i.user_id AS item_user_id,
       i.created_at AS item_created_at,
       i.updated_at AS item_updated_at
     FROM shopping_list_items sli
     INNER JOIN items i ON i.id = sli.item_id
     WHERE sli.shopping_list_id = ANY($1::uuid[])
     ORDER BY sli.shopping_list_id ASC, sli.created_at ASC`,
    [listIds]
  );
  for (const listItem of mapListItemRows(itemsResult.rows)) {
    const existing = byList.get(listItem.shoppingListId);
    if (existing) {
      existing.push(listItem);
    } else {
      byList.set(listItem.shoppingListId, [listItem]);
    }
  }
  return byList;
}

async function fetchListItemsForList(listId: string): Promise<ShoppingListItem[]> {
  const map = await fetchListItemsForLists([listId]);
  return map.get(listId) ?? [];
}

export const shoppingService = {
  async createShoppingList(userId: number, name: string): Promise<ShoppingList> {
    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO shopping_lists (user_id, name)
       VALUES ($1, $2)
       RETURNING id, user_id, name, created_at, updated_at`,
      [userId, name]
    );
    return mapListRow(result.rows[0]);
  },

  async getShoppingLists(
    userId: number,
    page: number,
    limit: number
  ): Promise<PaginatedShoppingLists> {
    const db = getDbPool();
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      'SELECT COUNT(*)::int AS c FROM shopping_lists WHERE user_id = $1',
      [userId]
    );
    const total = countResult.rows[0].c;

    const result = await db.query(
      `SELECT id, user_id, name, created_at, updated_at
       FROM shopping_lists
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const shoppingLists = result.rows.map(mapListRow);
    const listIds = shoppingLists.map((l) => l.id);
    const itemsByList = await fetchListItemsForLists(listIds);

    return {
      shoppingLists: shoppingLists.map((l) => ({
        ...l,
        listItems: itemsByList.get(l.id) ?? [],
      })),
      page,
      limit,
      total,
    };
  },

  async getShoppingListById(listId: string, userId: number): Promise<ShoppingListWithItems> {
    const db = getDbPool();
    const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);

    if (listResult.rows.length === 0) {
      throw new NotFoundError('Shopping list not found');
    }

    const list = listResult.rows[0];
    assertListOwnership(list, userId, 'You do not have permission to access this shopping list');

    const listItems = await fetchListItemsForList(listId);

    return {
      ...mapListRow(list),
      listItems,
    };
  },

  async updateShoppingList(listId: string, userId: number, name: string): Promise<ShoppingList> {
    const db = getDbPool();
    const checkResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);

    if (checkResult.rows.length === 0) {
      throw new NotFoundError('Shopping list not found');
    }

    assertListOwnership(
      checkResult.rows[0],
      userId,
      'You do not have permission to update this shopping list'
    );

    const result = await db.query(`UPDATE shopping_lists SET name = $1 WHERE id = $2 RETURNING *`, [
      name,
      listId,
    ]);

    return mapListRow(result.rows[0]);
  },

  async deleteShoppingList(listId: string, userId: number): Promise<void> {
    const db = getDbPool();
    const checkResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);

    if (checkResult.rows.length === 0) {
      throw new NotFoundError('Shopping list not found');
    }

    assertListOwnership(
      checkResult.rows[0],
      userId,
      'You do not have permission to delete this shopping list'
    );

    await db.query('DELETE FROM shopping_lists WHERE id = $1', [listId]);
  },

  async createCatalogItem(
    userId: number,
    input: { name: string; price?: number | null }
  ): Promise<ShoppingItem> {
    const db = getDbPool();
    const price = input.price ?? null;
    try {
      const result = await db.query(
        `INSERT INTO items (user_id, name, price)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, name, price, created_at, updated_at`,
        [userId, input.name, price]
      );
      return mapItemRow(result.rows[0]);
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw new ConflictError('An item with this name already exists');
      }
      throw error;
    }
  },

  async getCatalogItems(
    userId: number,
    page: number,
    limit: number
  ): Promise<PaginatedShoppingItems> {
    const db = getDbPool();
    const offset = (page - 1) * limit;

    const countResult = await db.query('SELECT COUNT(*)::int AS c FROM items WHERE user_id = $1', [
      userId,
    ]);
    const total = countResult.rows[0].c;

    const result = await db.query(
      `SELECT id, user_id, name, price, created_at, updated_at
       FROM items
       WHERE user_id = $1
       ORDER BY name ASC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      items: result.rows.map(mapItemRow),
      page,
      limit,
      total,
    };
  },

  async getCatalogItemById(itemId: string, userId: number): Promise<ShoppingItem> {
    const db = getDbPool();
    const result = await db.query('SELECT * FROM items WHERE id = $1', [itemId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Item not found');
    }

    const item = result.rows[0];
    if (item.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this item');
    }

    return mapItemRow(item);
  },

  async updateCatalogItem(
    itemId: string,
    userId: number,
    input: { name?: string; price?: number | null }
  ): Promise<ShoppingItem> {
    const db = getDbPool();
    const existing = await db.query('SELECT * FROM items WHERE id = $1', [itemId]);

    if (existing.rows.length === 0) {
      throw new NotFoundError('Item not found');
    }

    if (existing.rows[0].user_id !== userId) {
      throw new ForbiddenError('You do not have permission to update this item');
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(input.name);
      paramIndex++;
    }

    if (input.price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      params.push(input.price);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    params.push(itemId);

    try {
      const result = await db.query(
        `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      return mapItemRow(result.rows[0]);
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw new ConflictError('An item with this name already exists');
      }
      throw error;
    }
  },

  async deleteCatalogItem(itemId: string, userId: number): Promise<void> {
    const db = getDbPool();
    const existing = await db.query('SELECT * FROM items WHERE id = $1', [itemId]);

    if (existing.rows.length === 0) {
      throw new NotFoundError('Item not found');
    }

    if (existing.rows[0].user_id !== userId) {
      throw new ForbiddenError('You do not have permission to delete this item');
    }

    await db.query('DELETE FROM items WHERE id = $1', [itemId]);
  },

  async addItemToShoppingList(
    listId: string,
    userId: number,
    input: { itemId: string; price?: number | null; quantity?: number }
  ): Promise<ShoppingListItem> {
    const db = getDbPool();
    const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);
    if (listResult.rows.length === 0) {
      throw new NotFoundError('Shopping list not found');
    }
    assertListOwnership(
      listResult.rows[0],
      userId,
      'You do not have permission to add items to this shopping list'
    );

    const itemResult = await db.query('SELECT * FROM items WHERE id = $1', [input.itemId]);
    if (itemResult.rows.length === 0) {
      throw new NotFoundError('Item not found');
    }
    if (itemResult.rows[0].user_id !== userId) {
      throw new ForbiddenError('You do not have permission to use this item');
    }

    const qty = input.quantity ?? 1;
    const linePrice = input.price ?? null;

    try {
      const insert = await db.query(
        `INSERT INTO shopping_list_items (shopping_list_id, item_id, price, quantity)
         VALUES ($1, $2, $3, $4)
         RETURNING id, shopping_list_id, item_id, price, quantity, is_purchased, created_at, updated_at`,
        [listId, input.itemId, linePrice, qty]
      );

      const row = insert.rows[0];
      return {
        id: row.id,
        shoppingListId: row.shopping_list_id,
        price: parseListLinePrice(row.price),
        quantity: parseFloat(String(row.quantity)),
        isPurchased: Boolean(row.is_purchased),
        item: mapItemRow(itemResult.rows[0]),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw new ConflictError('This item is already in the shopping list');
      }
      throw error;
    }
  },

  async createCatalogItemAndAddToShoppingList(
    listId: string,
    userId: number,
    input: {
      name: string;
      catalogPrice?: number | null;
      price?: number | null;
      quantity?: number;
    }
  ): Promise<ShoppingListItem> {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const listResult = await client.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);
      if (listResult.rows.length === 0) {
        throw new NotFoundError('Shopping list not found');
      }
      assertListOwnership(
        listResult.rows[0],
        userId,
        'You do not have permission to add items to this shopping list'
      );

      const catalogPrice = input.catalogPrice ?? null;
      let itemInsert;
      try {
        itemInsert = await client.query(
          `INSERT INTO items (user_id, name, price)
           VALUES ($1, $2, $3)
           RETURNING id, user_id, name, price, created_at, updated_at`,
          [userId, input.name, catalogPrice]
        );
      } catch (error) {
        if (isPgUniqueViolation(error)) {
          throw new ConflictError('An item with this name already exists');
        }
        throw error;
      }

      const itemRow = itemInsert.rows[0];
      const qty = input.quantity ?? 1;
      const linePrice = input.price ?? null;

      let listItemInsert;
      try {
        listItemInsert = await client.query(
          `INSERT INTO shopping_list_items (shopping_list_id, item_id, price, quantity)
           VALUES ($1, $2, $3, $4)
           RETURNING id, shopping_list_id, item_id, price, quantity, is_purchased, created_at, updated_at`,
          [listId, itemRow.id, linePrice, qty]
        );
      } catch (error) {
        if (isPgUniqueViolation(error)) {
          throw new ConflictError('This item is already in the shopping list');
        }
        throw error;
      }

      await client.query('COMMIT');

      const row = listItemInsert.rows[0];
      return {
        id: row.id,
        shoppingListId: row.shopping_list_id,
        price: parseListLinePrice(row.price),
        quantity: parseFloat(String(row.quantity)),
        isPurchased: Boolean(row.is_purchased),
        item: mapItemRow(itemRow),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback failures (e.g. connection already closed)
      }
      throw error;
    } finally {
      client.release();
    }
  },

  async getShoppingListItems(listId: string, userId: number): Promise<ShoppingListItem[]> {
    const db = getDbPool();
    const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);
    if (listResult.rows.length === 0) {
      throw new NotFoundError('Shopping list not found');
    }
    assertListOwnership(
      listResult.rows[0],
      userId,
      'You do not have permission to access this shopping list'
    );

    const itemsResult = await db.query(
      `SELECT
         sli.id AS list_item_id,
         sli.shopping_list_id,
         sli.item_id,
         sli.price AS list_price,
         sli.quantity,
         sli.is_purchased AS list_item_is_purchased,
         sli.created_at AS list_item_created_at,
         sli.updated_at AS list_item_updated_at,
         i.name AS item_name,
         i.price AS catalog_price,
         i.user_id AS item_user_id,
         i.created_at AS item_created_at,
         i.updated_at AS item_updated_at
       FROM shopping_list_items sli
       INNER JOIN items i ON i.id = sli.item_id
       WHERE sli.shopping_list_id = $1
       ORDER BY sli.created_at ASC`,
      [listId]
    );

    return mapListItemRows(itemsResult.rows);
  },

  async updateShoppingListItem(
    listId: string,
    listItemId: string,
    userId: number,
    input: { price?: number | null; quantity?: number }
  ): Promise<ShoppingListItem> {
    const db = getDbPool();
    const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);
    if (listResult.rows.length === 0) {
      throw new NotFoundError('Shopping list not found');
    }
    assertListOwnership(
      listResult.rows[0],
      userId,
      'You do not have permission to update items in this shopping list'
    );

    const rowCheck = await db.query(
      `SELECT * FROM shopping_list_items WHERE id = $1 AND shopping_list_id = $2`,
      [listItemId, listId]
    );

    if (rowCheck.rows.length === 0) {
      throw new NotFoundError('List item not found');
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      params.push(input.price);
      paramIndex++;
    }

    if (input.quantity !== undefined) {
      updates.push(`quantity = $${paramIndex}`);
      params.push(input.quantity);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    params.push(listItemId);

    const result = await db.query(
      `UPDATE shopping_list_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const row = result.rows[0];

    const itemRow = await db.query('SELECT id, name, price FROM items WHERE id = $1', [
      row.item_id,
    ]);

    return {
      id: row.id,
      shoppingListId: row.shopping_list_id,
      price: parseListLinePrice(row.price),
      quantity: parseFloat(row.quantity),
      isPurchased: Boolean(row.is_purchased),
      item: mapItemRow(itemRow.rows[0]),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async deleteShoppingListItem(listId: string, listItemId: string, userId: number): Promise<void> {
    const db = getDbPool();
    const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);
    if (listResult.rows.length === 0) {
      throw new NotFoundError('Shopping list not found');
    }
    assertListOwnership(
      listResult.rows[0],
      userId,
      'You do not have permission to delete items from this shopping list'
    );

    const del = await db.query(
      `DELETE FROM shopping_list_items WHERE id = $1 AND shopping_list_id = $2`,
      [listItemId, listId]
    );

    if (del.rowCount === 0) {
      throw new NotFoundError('List item not found');
    }
  },

  async setShoppingListItemsPurchased(
    listId: string,
    userId: number,
    purchasedListItemIds: string[],
    unpurchasedListItemIds: string[]
  ): Promise<ShoppingListWithItems> {
    const db = getDbPool();
    const listResult = await db.query('SELECT * FROM shopping_lists WHERE id = $1', [listId]);
    if (listResult.rows.length === 0) {
      throw new NotFoundError('Shopping list not found');
    }
    assertListOwnership(
      listResult.rows[0],
      userId,
      'You do not have permission to update this shopping list'
    );

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      if (purchasedListItemIds.length > 0) {
        const purchasedUpd = await client.query(
          `UPDATE shopping_list_items
           SET is_purchased = TRUE
           WHERE shopping_list_id = $1 AND id = ANY($2::uuid[])
           RETURNING id`,
          [listId, purchasedListItemIds]
        );
        if (purchasedUpd.rowCount !== purchasedListItemIds.length) {
          throw new BadRequestError(
            'One or more list items were not found on this shopping list'
          );
        }
      }

      if (unpurchasedListItemIds.length > 0) {
        const unpurchasedUpd = await client.query(
          `UPDATE shopping_list_items
           SET is_purchased = FALSE
           WHERE shopping_list_id = $1 AND id = ANY($2::uuid[])
           RETURNING id`,
          [listId, unpurchasedListItemIds]
        );
        if (unpurchasedUpd.rowCount !== unpurchasedListItemIds.length) {
          throw new BadRequestError(
            'One or more list items were not found on this shopping list'
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const listItems = await fetchListItemsForList(listId);
    return {
      ...mapListRow(listResult.rows[0]),
      listItems,
    };
  },
};
