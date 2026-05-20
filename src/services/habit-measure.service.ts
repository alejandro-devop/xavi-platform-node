import { getDbPool } from '../shared/database/pool';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateHabitMeasureInput,
  HabitMeasure,
  UpdateHabitMeasureInput,
} from '../types/services/habit-measure.types';

type MeasureRow = {
  id: string;
  user_id: number;
  name: string;
  abbreviation: string | null;
  type: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapMeasure(row: MeasureRow): HabitMeasure {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    abbreviation: row.abbreviation,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getMeasureRowOrThrow(measureId: string): Promise<MeasureRow> {
  const db = getDbPool();
  const result = await db.query<MeasureRow>('SELECT * FROM habit_measures WHERE id = $1', [
    measureId,
  ]);
  if (result.rows.length === 0) {
    throw new NotFoundError('Habit measure not found');
  }
  return result.rows[0];
}

async function getOwnedMeasureOrThrow(measureId: string, userId: number): Promise<MeasureRow> {
  const row = await getMeasureRowOrThrow(measureId);
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this habit measure');
  }
  return row;
}

async function listMeasures(userId: number): Promise<HabitMeasure[]> {
  const db = getDbPool();
  const result = await db.query<MeasureRow>(
    `SELECT * FROM habit_measures WHERE user_id = $1 ORDER BY name ASC`,
    [userId]
  );
  return result.rows.map(mapMeasure);
}

async function getMeasureById(id: string, userId: number): Promise<HabitMeasure> {
  return mapMeasure(await getOwnedMeasureOrThrow(id, userId));
}

async function createMeasure(userId: number, input: CreateHabitMeasureInput): Promise<HabitMeasure> {
  const db = getDbPool();
  const result = await db.query<MeasureRow>(
    `INSERT INTO habit_measures (user_id, name, abbreviation, type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, input.name, input.abbreviation ?? null, input.type ?? null]
  );
  return mapMeasure(result.rows[0]);
}

async function updateMeasure(
  id: string,
  userId: number,
  input: UpdateHabitMeasureInput
): Promise<HabitMeasure> {
  await getOwnedMeasureOrThrow(id, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${i++}`);
    params.push(input.name);
  }
  if (input.abbreviation !== undefined) {
    updates.push(`abbreviation = $${i++}`);
    params.push(input.abbreviation);
  }
  if (input.type !== undefined) {
    updates.push(`type = $${i++}`);
    params.push(input.type);
  }

  if (updates.length === 0) {
    return mapMeasure(await getMeasureRowOrThrow(id));
  }

  params.push(id);
  const db = getDbPool();
  const result = await db.query<MeasureRow>(
    `UPDATE habit_measures SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return mapMeasure(result.rows[0]);
}

async function deleteMeasure(id: string, userId: number): Promise<boolean> {
  await getOwnedMeasureOrThrow(id, userId);
  const db = getDbPool();
  await db.query('UPDATE habits SET measure_id = NULL WHERE measure_id = $1', [id]);
  await db.query('DELETE FROM habit_measures WHERE id = $1', [id]);
  return true;
}

export const habitMeasureService = {
  listMeasures,
  getMeasureById,
  createMeasure,
  updateMeasure,
  deleteMeasure,
};
