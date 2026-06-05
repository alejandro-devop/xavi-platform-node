import { getDbPool } from '../shared/database/pool';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  HabitPurpose,
  HabitPurposeEditInput,
  HabitPurposeInput,
} from '../types/services/habit-purpose.types';

type PurposeRow = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  icon: string | null;
  placement: 'pool' | 'want' | 'avoid';
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

const PURPOSE_RETURNING = `id, user_id, name, description, icon, placement, order_index, created_at, updated_at`;

function mapPurpose(row: PurposeRow): HabitPurpose {
  return {
    id: String(row.id),
    userId: row.user_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    placement: row.placement,
    orderIndex: row.order_index,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function listHabitPurposes(userId: number): Promise<HabitPurpose[]> {
  const db = getDbPool();
  const result = await db.query<PurposeRow>(
    `SELECT ${PURPOSE_RETURNING} FROM habit_purposes WHERE user_id = $1
     ORDER BY placement ASC, order_index ASC`,
    [userId]
  );
  return result.rows.map(mapPurpose);
}

async function getHabitPurpose(id: string, userId: number): Promise<HabitPurpose> {
  const db = getDbPool();
  const purposeId = parseInt(id, 10);
  if (Number.isNaN(purposeId)) throw new NotFoundError('Habit purpose not found');

  const result = await db.query<PurposeRow>(
    `SELECT ${PURPOSE_RETURNING} FROM habit_purposes WHERE id = $1`,
    [purposeId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Habit purpose not found');

  const row = result.rows[0];
  if (row.user_id !== userId) throw new ForbiddenError('You do not have permission to access this purpose');

  return mapPurpose(row);
}

async function createHabitPurpose(userId: number, input: HabitPurposeInput): Promise<HabitPurpose> {
  const db = getDbPool();
  const result = await db.query<PurposeRow>(
    `INSERT INTO habit_purposes (user_id, name, description, icon, placement, order_index)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${PURPOSE_RETURNING}`,
    [
      userId,
      input.name,
      input.description ?? null,
      input.icon ?? null,
      input.placement ?? 'pool',
      input.orderIndex ?? 0,
    ]
  );
  return mapPurpose(result.rows[0]);
}

async function updateHabitPurpose(
  id: string,
  userId: number,
  input: HabitPurposeEditInput
): Promise<HabitPurpose> {
  await getHabitPurpose(id, userId);

  const purposeId = parseInt(id, 10);
  const db = getDbPool();

  const fieldMap: Record<string, keyof HabitPurposeEditInput> = {
    name: 'name',
    description: 'description',
    icon: 'icon',
    placement: 'placement',
    order_index: 'orderIndex',
  };

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [col, key] of Object.entries(fieldMap)) {
    const val = input[key as keyof HabitPurposeEditInput];
    if (val !== undefined) {
      updates.push(`${col} = $${paramIndex}`);
      params.push(val);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return getHabitPurpose(id, userId);
  }

  updates.push(`updated_at = NOW()`);
  params.push(purposeId);

  const result = await db.query<PurposeRow>(
    `UPDATE habit_purposes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${PURPOSE_RETURNING}`,
    params
  );
  return mapPurpose(result.rows[0]);
}

async function removeHabitPurpose(id: string, userId: number): Promise<boolean> {
  await getHabitPurpose(id, userId);
  const purposeId = parseInt(id, 10);
  await getDbPool().query('DELETE FROM habit_purposes WHERE id = $1', [purposeId]);
  return true;
}

export const habitPurposeService = {
  listHabitPurposes,
  getHabitPurpose,
  createHabitPurpose,
  updateHabitPurpose,
  removeHabitPurpose,
};
