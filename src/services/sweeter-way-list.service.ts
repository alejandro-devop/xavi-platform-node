import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import { swBondService } from './sweeter-way-bond.service';
import {
  SweeterList,
  ListItem,
  ItemLog,
  ListCategory,
  ItemStatus,
  CreateListInput,
  UpdateListInput,
  AddListItemInput,
  UpdateListItemInput,
  UpsertItemLogInput,
} from '../types/services/sweeter-way.types';

function mapListRow(row: Record<string, unknown>): SweeterList {
  return {
    id: row.id as string,
    bondId: row.bond_id as string,
    title: row.title as string,
    description: row.description as string | null,
    category: row.category as ListCategory,
    createdBy: row.created_by as number,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function mapItemRow(row: Record<string, unknown>): ListItem {
  return {
    id: row.id as string,
    listId: row.list_id as string,
    title: row.title as string,
    description: row.description as string | null,
    address: row.address as string | null,
    url: row.url as string | null,
    status: row.status as ItemStatus,
    completedAt: row.completed_at as Date | null,
    addedBy: row.added_by as number,
    rating: row.rating as number | null,
    wouldReturn: row.would_return as boolean | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function mapLogRow(row: Record<string, unknown>): ItemLog {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    userId: row.user_id as number,
    comment: row.comment as string | null,
    liked: row.liked as boolean | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

async function requireActiveBondForUser(userId: number) {
  const bond = await swBondService.getActiveBond(userId);
  if (!bond) throw new BadRequestError('You need an active cinnamon bond to perform this action');
  return bond;
}

async function requireBondOwnershipForList(listId: string, userId: number) {
  const db = getDbPool();
  const result = await db.query(
    `SELECT sl.*, scb.requester_id, scb.addressee_id
     FROM sw_lists sl
     INNER JOIN sw_cinnamon_bonds scb ON scb.id = sl.bond_id
     WHERE sl.id = $1`,
    [listId]
  );
  if (result.rows.length === 0) throw new NotFoundError('List not found');
  const row = result.rows[0];
  if (row.requester_id !== userId && row.addressee_id !== userId) {
    throw new ForbiddenError('You do not have access to this list');
  }
  return mapListRow(row);
}

async function requireBondOwnershipForItem(itemId: string, userId: number) {
  const db = getDbPool();
  const result = await db.query(
    `SELECT sli.*, scb.requester_id, scb.addressee_id
     FROM sw_list_items sli
     INNER JOIN sw_lists sl ON sl.id = sli.list_id
     INNER JOIN sw_cinnamon_bonds scb ON scb.id = sl.bond_id
     WHERE sli.id = $1`,
    [itemId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Item not found');
  const row = result.rows[0];
  if (row.requester_id !== userId && row.addressee_id !== userId) {
    throw new ForbiddenError('You do not have access to this item');
  }
  return mapItemRow(row);
}

export const swListService = {
  async getMyLists(userId: number): Promise<SweeterList[]> {
    const bond = await requireActiveBondForUser(userId);
    const db = getDbPool();
    const result = await db.query(
      'SELECT * FROM sw_lists WHERE bond_id = $1 ORDER BY created_at DESC',
      [bond.id]
    );
    return result.rows.map(mapListRow);
  },

  async getListItems(listId: string, userId: number): Promise<ListItem[]> {
    await requireBondOwnershipForList(listId, userId);
    const db = getDbPool();
    const result = await db.query(
      'SELECT * FROM sw_list_items WHERE list_id = $1 ORDER BY created_at ASC',
      [listId]
    );
    return result.rows.map(mapItemRow);
  },

  async getItemLogs(itemId: string, userId: number): Promise<ItemLog[]> {
    await requireBondOwnershipForItem(itemId, userId);
    const db = getDbPool();
    const result = await db.query(
      'SELECT * FROM sw_item_logs WHERE item_id = $1 ORDER BY created_at ASC',
      [itemId]
    );
    return result.rows.map(mapLogRow);
  },

  async createList(userId: number, input: CreateListInput): Promise<SweeterList> {
    const bond = await requireActiveBondForUser(userId);
    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO sw_lists (bond_id, title, description, category, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bond.id, input.title, input.description ?? null, input.category, userId]
    );
    return mapListRow(result.rows[0]);
  },

  async updateList(id: string, userId: number, input: UpdateListInput): Promise<SweeterList> {
    await requireBondOwnershipForList(id, userId);
    const db = getDbPool();

    const updates: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (input.title !== undefined) { updates.push(`title = $${i++}`); params.push(input.title); }
    if (input.description !== undefined) { updates.push(`description = $${i++}`); params.push(input.description); }
    if (input.category !== undefined) { updates.push(`category = $${i++}`); params.push(input.category); }

    if (updates.length === 0) throw new BadRequestError('No fields to update');

    params.push(id);
    const result = await db.query(
      `UPDATE sw_lists SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      params
    );
    return mapListRow(result.rows[0]);
  },

  async deleteList(id: string, userId: number): Promise<boolean> {
    await requireBondOwnershipForList(id, userId);
    const db = getDbPool();

    const completedCheck = await db.query(
      `SELECT COUNT(*) AS c FROM sw_list_items WHERE list_id = $1 AND status = 'completed'`,
      [id]
    );
    if (parseInt(completedCheck.rows[0].c, 10) > 0) {
      throw new BadRequestError('Cannot delete a list that has completed items');
    }

    await db.query('DELETE FROM sw_lists WHERE id = $1', [id]);
    return true;
  },

  async addListItem(listId: string, userId: number, input: AddListItemInput): Promise<ListItem> {
    await requireBondOwnershipForList(listId, userId);
    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO sw_list_items (list_id, title, description, address, url, added_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [listId, input.title, input.description ?? null, input.address ?? null, input.url ?? null, userId]
    );
    return mapItemRow(result.rows[0]);
  },

  async updateListItem(id: string, userId: number, input: UpdateListItemInput): Promise<ListItem> {
    await requireBondOwnershipForItem(id, userId);
    const db = getDbPool();

    const updates: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (input.title !== undefined) { updates.push(`title = $${i++}`); params.push(input.title); }
    if (input.description !== undefined) { updates.push(`description = $${i++}`); params.push(input.description); }
    if (input.address !== undefined) { updates.push(`address = $${i++}`); params.push(input.address); }
    if (input.url !== undefined) { updates.push(`url = $${i++}`); params.push(input.url); }

    if (updates.length === 0) throw new BadRequestError('No fields to update');

    params.push(id);
    const result = await db.query(
      `UPDATE sw_list_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      params
    );
    return mapItemRow(result.rows[0]);
  },

  async completeListItem(id: string, userId: number): Promise<ListItem> {
    const item = await requireBondOwnershipForItem(id, userId);
    if (item.status === 'completed') throw new BadRequestError('Item is already completed');

    const db = getDbPool();
    const result = await db.query(
      `UPDATE sw_list_items
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return mapItemRow(result.rows[0]);
  },

  async rateListItem(id: string, userId: number, rating: number, wouldReturn: boolean): Promise<ListItem> {
    const item = await requireBondOwnershipForItem(id, userId);
    if (item.status !== 'completed') {
      throw new BadRequestError('Can only rate a completed item');
    }

    const db = getDbPool();
    const result = await db.query(
      `UPDATE sw_list_items
       SET rating = $1, would_return = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [rating, wouldReturn, id]
    );
    return mapItemRow(result.rows[0]);
  },

  async upsertItemLog(itemId: string, userId: number, input: UpsertItemLogInput): Promise<ItemLog> {
    const item = await requireBondOwnershipForItem(itemId, userId);
    if (item.status !== 'completed') {
      throw new BadRequestError('Can only leave a log on a completed item');
    }

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO sw_item_logs (item_id, user_id, comment, liked)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (item_id, user_id)
       DO UPDATE SET
         comment = EXCLUDED.comment,
         liked = EXCLUDED.liked,
         updated_at = NOW()
       RETURNING *`,
      [itemId, userId, input.comment ?? null, input.liked ?? null]
    );
    return mapLogRow(result.rows[0]);
  },

  /** Returns the bond_id for a given list (used for notification context). */
  async getListBondId(listId: string): Promise<string> {
    const db = getDbPool();
    const result = await db.query('SELECT bond_id FROM sw_lists WHERE id = $1', [listId]);
    if (result.rows.length === 0) throw new NotFoundError('List not found');
    return result.rows[0].bond_id as string;
  },

  /** Returns the list_id for a given item (used for notification context). */
  async getItemListId(itemId: string): Promise<string> {
    const db = getDbPool();
    const result = await db.query('SELECT list_id FROM sw_list_items WHERE id = $1', [itemId]);
    if (result.rows.length === 0) throw new NotFoundError('Item not found');
    return result.rows[0].list_id as string;
  },
};
