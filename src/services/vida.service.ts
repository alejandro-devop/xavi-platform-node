import { getDbPool } from '../shared/database/pool';
import { generateUuidV7, isUuidV7 } from '../shared/database/uuid';
import { BadRequestError, NotFoundError } from '../shared/errors';
import type {
  CreateVidaItemInput,
  UpdateVidaItemInput,
  VidaDayOfWeek,
  VidaItem,
  VidaSuggestion,
  VidaTakenToday,
} from '../types/services/vida.types';
import { VIDA_DAYS_OF_WEEK } from '../types/services/vida.types';
import { parseActivityId } from './activity.service';

type VidaItemRow = {
  id: string;
  user_id: number;
  activity_id: number;
  days: string[] | null;
  notes: string | null;
  is_active: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

type VidaTakenRow = {
  id: string;
  user_id: number;
  vida_item_id: string;
  date: Date | string;
  created_at: Date;
};

const VIDA_ITEM_RETURNING = `id, user_id, activity_id, days, notes, is_active, order_index, created_at, updated_at`;
const VIDA_TAKEN_RETURNING = `id, user_id, vida_item_id, date, created_at`;

function formatDateForApi(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function normalizeDays(raw: string[] | null): VidaDayOfWeek[] {
  if (!raw || raw.length === 0) return [];
  const allowed = new Set<string>(VIDA_DAYS_OF_WEEK);
  const days: VidaDayOfWeek[] = [];
  for (const day of raw) {
    if (!allowed.has(day)) {
      throw new BadRequestError(`Invalid day of week: ${day}`);
    }
    days.push(day as VidaDayOfWeek);
  }
  return days;
}

function mapVidaItem(row: VidaItemRow): VidaItem {
  return {
    id: row.id,
    userId: row.user_id,
    activityId: String(row.activity_id),
    days: normalizeDays(row.days),
    notes: row.notes,
    isActive: row.is_active,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTaken(row: VidaTakenRow): VidaTakenToday {
  return {
    id: row.id,
    userId: row.user_id,
    vidaItemId: row.vida_item_id,
    date: formatDateForApi(row.date),
    createdAt: row.created_at,
  };
}

/** Weekday for a civil YYYY-MM-DD (UTC calendar math; client sends local date). */
export function dayOfWeekFromDateString(date: string): VidaDayOfWeek {
  const [year, month, day] = date.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !day) {
    throw new BadRequestError('Invalid date format (use YYYY-MM-DD)');
  }
  const utc = new Date(Date.UTC(year, month - 1, day));
  const names: VidaDayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return names[utc.getUTCDay()];
}

async function assertActivityOwned(userId: number, activityId: number): Promise<void> {
  const db = getDbPool();
  const result = await db.query<{ id: number }>(
    'SELECT id FROM activities WHERE id = $1 AND user_id = $2',
    [activityId, userId]
  );
  if (result.rows.length === 0) {
    throw new BadRequestError('Activity must belong to you');
  }
}

async function getOwnedItemOrThrow(userId: number, id: string): Promise<VidaItemRow> {
  const db = getDbPool();
  const result = await db.query<VidaItemRow>(
    `SELECT ${VIDA_ITEM_RETURNING} FROM vida_items WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Vida item not found');
  }
  return result.rows[0];
}

async function listItems(userId: number, includeInactive = false): Promise<VidaItem[]> {
  const db = getDbPool();
  const result = await db.query<VidaItemRow>(
    includeInactive
      ? `SELECT ${VIDA_ITEM_RETURNING} FROM vida_items
         WHERE user_id = $1
         ORDER BY order_index ASC, created_at ASC`
      : `SELECT ${VIDA_ITEM_RETURNING} FROM vida_items
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY order_index ASC, created_at ASC`,
    [userId]
  );
  return result.rows.map(mapVidaItem);
}

async function createItem(userId: number, input: CreateVidaItemInput): Promise<VidaItem> {
  const activityId = parseActivityId(input.activityId);
  await assertActivityOwned(userId, activityId);

  const clientId = input.clientId ?? null;
  if (clientId != null && !isUuidV7(clientId)) {
    throw new BadRequestError('clientId must be a UUID v7');
  }

  const db = getDbPool();

  if (clientId != null) {
    const existing = await db.query<VidaItemRow>(
      `SELECT ${VIDA_ITEM_RETURNING} FROM vida_items WHERE client_id = $1 AND user_id = $2`,
      [clientId, userId]
    );
    if (existing.rows.length > 0) {
      return mapVidaItem(existing.rows[0]);
    }
  }

  const id = clientId && isUuidV7(clientId) ? clientId : generateUuidV7();
  const result = await db.query<VidaItemRow>(
    `INSERT INTO vida_items
       (id, user_id, activity_id, days, notes, order_index, client_id)
     VALUES ($1, $2, $3, $4::text[], $5, $6, $7)
     RETURNING ${VIDA_ITEM_RETURNING}`,
    [
      id,
      userId,
      activityId,
      input.days,
      input.notes ?? null,
      input.orderIndex ?? 0,
      clientId,
    ]
  );
  return mapVidaItem(result.rows[0]);
}

async function updateItem(
  userId: number,
  id: string,
  input: UpdateVidaItemInput
): Promise<VidaItem> {
  await getOwnedItemOrThrow(userId, id);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.days !== undefined) {
    updates.push(`days = $${paramIndex}::text[]`);
    params.push(input.days);
    paramIndex += 1;
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(input.notes);
    paramIndex += 1;
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(input.isActive);
    paramIndex += 1;
  }
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(input.orderIndex);
    paramIndex += 1;
  }

  if (updates.length === 0) {
    throw new BadRequestError('At least one field is required to update');
  }

  params.push(id, userId);
  const db = getDbPool();
  const result = await db.query<VidaItemRow>(
    `UPDATE vida_items SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING ${VIDA_ITEM_RETURNING}`,
    params
  );
  return mapVidaItem(result.rows[0]);
}

async function deleteItem(userId: number, id: string): Promise<boolean> {
  const db = getDbPool();
  const result = await db.query(
    'DELETE FROM vida_items WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Vida item not found');
  }
  return true;
}

async function listTakenForDate(userId: number, date: string): Promise<VidaTakenToday[]> {
  const db = getDbPool();
  const result = await db.query<VidaTakenRow>(
    `SELECT ${VIDA_TAKEN_RETURNING} FROM vida_taken_today
     WHERE user_id = $1 AND date = $2::date
     ORDER BY created_at ASC`,
    [userId, date]
  );
  return result.rows.map(mapTaken);
}

async function suggestionsForDate(userId: number, date: string): Promise<VidaSuggestion[]> {
  const weekday = dayOfWeekFromDateString(date);
  const items = await listItems(userId, false);
  const forDay = items.filter((item) => item.days.includes(weekday));

  if (forDay.length === 0) {
    return [];
  }

  const taken = await listTakenForDate(userId, date);
  const takenIds = new Set(taken.map((row) => row.vidaItemId));

  return forDay.map((item) => ({
    item,
    takenToday: takenIds.has(item.id),
  }));
}

async function markTakenToday(
  userId: number,
  vidaItemId: string,
  date: string
): Promise<VidaTakenToday> {
  const item = await getOwnedItemOrThrow(userId, vidaItemId);
  if (!item.is_active) {
    throw new BadRequestError('Cannot mark an inactive Vida item as taken');
  }

  const weekday = dayOfWeekFromDateString(date);
  const days = normalizeDays(item.days);
  if (!days.includes(weekday)) {
    throw new BadRequestError(`Vida item is not scheduled for ${weekday}`);
  }

  const db = getDbPool();
  const existing = await db.query<VidaTakenRow>(
    `SELECT ${VIDA_TAKEN_RETURNING} FROM vida_taken_today
     WHERE user_id = $1 AND vida_item_id = $2 AND date = $3::date`,
    [userId, vidaItemId, date]
  );
  if (existing.rows.length > 0) {
    return mapTaken(existing.rows[0]);
  }

  const id = generateUuidV7();
  const result = await db.query<VidaTakenRow>(
    `INSERT INTO vida_taken_today (id, user_id, vida_item_id, date)
     VALUES ($1, $2, $3, $4::date)
     RETURNING ${VIDA_TAKEN_RETURNING}`,
    [id, userId, vidaItemId, date]
  );
  return mapTaken(result.rows[0]);
}

async function unmarkTakenToday(
  userId: number,
  vidaItemId: string,
  date: string
): Promise<boolean> {
  await getOwnedItemOrThrow(userId, vidaItemId);
  const db = getDbPool();
  const result = await db.query(
    `DELETE FROM vida_taken_today
     WHERE user_id = $1 AND vida_item_id = $2 AND date = $3::date
     RETURNING id`,
    [userId, vidaItemId, date]
  );
  return result.rows.length > 0;
}

export const vidaService = {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  listTakenForDate,
  suggestionsForDate,
  markTakenToday,
  unmarkTakenToday,
  dayOfWeekFromDateString,
};
