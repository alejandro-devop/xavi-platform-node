import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateRoutineInput,
  CreateRoutineStepInput,
  ListRoutinesOptions,
  Routine,
  RoutineCollection,
  RoutineStep,
  UpdateRoutineInput,
  UpdateRoutineStepInput,
} from '../types/services/routine.types';

type RoutineRow = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  days_of_week: string[];
  time_of_day: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  total_steps?: string;
  total_duration?: string;
};

type StepRow = {
  id: number;
  routine_id: number;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

const ROUTINE_RETURNING = `id, user_id, name, description, days_of_week, time_of_day, is_active, created_at, updated_at`;
const STEP_RETURNING = `id, routine_id, title, description, duration_minutes, order_index, created_at, updated_at`;

function mapRoutine(row: RoutineRow, extras?: { stepsCount?: number; totalDuration?: number }): Routine {
  return {
    id: String(row.id),
    userId: row.user_id,
    name: row.name,
    description: row.description,
    daysOfWeek: row.days_of_week as Routine['daysOfWeek'],
    timeOfDay: row.time_of_day as Routine['timeOfDay'],
    isActive: row.is_active,
    stepsCount: extras?.stepsCount ?? (row.total_steps != null ? parseInt(row.total_steps, 10) : undefined),
    totalDuration:
      extras?.totalDuration ??
      (row.total_duration != null ? parseInt(row.total_duration, 10) : undefined),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStep(row: StepRow): RoutineStep {
  return {
    id: String(row.id),
    routineId: String(row.routine_id),
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseRoutineId(id: string): number {
  const routineId = parseInt(id, 10);
  if (Number.isNaN(routineId)) throw new NotFoundError('Routine not found');
  return routineId;
}

function parseStepId(id: string): number {
  const stepId = parseInt(id, 10);
  if (Number.isNaN(stepId)) throw new NotFoundError('Step not found');
  return stepId;
}

function assertRoutineOwnership(routine: { user_id: number }, userId: number): void {
  if (routine.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this routine');
  }
}

async function getRoutineRowOrThrow(routineId: number): Promise<RoutineRow> {
  const db = getDbPool();
  const result = await db.query<RoutineRow>('SELECT * FROM routines WHERE id = $1', [routineId]);
  if (result.rows.length === 0) throw new NotFoundError('Routine not found');
  return result.rows[0];
}

async function getOwnedRoutineOrThrow(routineId: number, userId: number): Promise<RoutineRow> {
  const row = await getRoutineRowOrThrow(routineId);
  assertRoutineOwnership(row, userId);
  return row;
}

async function listStepsForRoutine(routineId: number): Promise<RoutineStep[]> {
  const db = getDbPool();
  const result = await db.query<StepRow>(
    `SELECT * FROM routine_steps WHERE routine_id = $1 ORDER BY order_index ASC, created_at ASC`,
    [routineId]
  );
  return result.rows.map(mapStep);
}

async function createRoutine(userId: number, input: CreateRoutineInput): Promise<Routine> {
  const db = getDbPool();
  const result = await db.query<RoutineRow>(
    `INSERT INTO routines (user_id, name, description, days_of_week, time_of_day)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${ROUTINE_RETURNING}`,
    [
      userId,
      input.name,
      input.description ?? null,
      input.daysOfWeek ?? [],
      input.timeOfDay ?? 'anytime',
    ]
  );
  return mapRoutine(result.rows[0], { stepsCount: 0, totalDuration: 0 });
}

async function listRoutines(userId: number, options: ListRoutinesOptions = {}): Promise<RoutineCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE r.user_id = $1';
  const params: (number | boolean | string)[] = [userId];
  let paramIndex = 2;

  if (options.isActive !== undefined) {
    params.push(options.isActive);
    whereClause += ` AND r.is_active = $${paramIndex}`;
    paramIndex++;
  }
  if (options.timeOfDay) {
    params.push(options.timeOfDay);
    whereClause += ` AND r.time_of_day = $${paramIndex}`;
    paramIndex++;
  }
  if (options.dayOfWeek) {
    params.push(options.dayOfWeek);
    whereClause += ` AND $${paramIndex} = ANY(r.days_of_week)`;
    paramIndex++;
  }

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(DISTINCT r.id)::text AS count FROM routines r ${whereClause}`,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await db.query<RoutineRow>(
    `SELECT r.*, COUNT(rs.id)::text AS total_steps, COALESCE(SUM(rs.duration_minutes), 0)::text AS total_duration
     FROM routines r
     LEFT JOIN routine_steps rs ON r.id = rs.routine_id
     ${whereClause}
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  return {
    routines: result.rows.map((row) => mapRoutine(row)),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getRoutineById(id: string, userId: number): Promise<Routine> {
  const routineId = parseRoutineId(id);
  const row = await getOwnedRoutineOrThrow(routineId, userId);
  const steps = await listStepsForRoutine(routineId);
  return { ...mapRoutine(row), steps };
}

async function updateRoutine(id: string, userId: number, input: UpdateRoutineInput): Promise<Routine> {
  const routineId = parseRoutineId(id);
  await getOwnedRoutineOrThrow(routineId, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${i++}`);
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${i++}`);
    params.push(input.description);
  }
  if (input.daysOfWeek !== undefined) {
    updates.push(`days_of_week = $${i++}`);
    params.push(input.daysOfWeek);
  }
  if (input.timeOfDay !== undefined) {
    updates.push(`time_of_day = $${i++}`);
    params.push(input.timeOfDay);
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${i++}`);
    params.push(input.isActive);
  }

  if (updates.length === 0) {
    return mapRoutine(await getRoutineRowOrThrow(routineId));
  }

  params.push(routineId);
  const db = getDbPool();
  const result = await db.query<RoutineRow>(
    `UPDATE routines SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${ROUTINE_RETURNING}`,
    params
  );
  return mapRoutine(result.rows[0]);
}

async function deleteRoutine(id: string, userId: number): Promise<boolean> {
  const routineId = parseRoutineId(id);
  await getOwnedRoutineOrThrow(routineId, userId);
  await getDbPool().query('DELETE FROM routines WHERE id = $1', [routineId]);
  return true;
}

async function setRoutineActive(id: string, userId: number): Promise<Routine> {
  const routineId = parseRoutineId(id);
  await getOwnedRoutineOrThrow(routineId, userId);
  const db = getDbPool();
  await db.query('UPDATE routines SET is_active = FALSE WHERE user_id = $1', [userId]);
  const result = await db.query<RoutineRow>(
    `UPDATE routines SET is_active = TRUE WHERE id = $1 RETURNING ${ROUTINE_RETURNING}`,
    [routineId]
  );
  return mapRoutine(result.rows[0]);
}

async function toggleRoutineActive(id: string, userId: number): Promise<Routine> {
  const routineId = parseRoutineId(id);
  await getOwnedRoutineOrThrow(routineId, userId);
  const db = getDbPool();
  const result = await db.query<RoutineRow>(
    `UPDATE routines SET is_active = NOT is_active WHERE id = $1 RETURNING ${ROUTINE_RETURNING}`,
    [routineId]
  );
  return mapRoutine(result.rows[0]);
}

async function createRoutineStep(userId: number, input: CreateRoutineStepInput): Promise<RoutineStep> {
  const routineId = parseRoutineId(input.routineId);
  await getOwnedRoutineOrThrow(routineId, userId);

  const db = getDbPool();
  const result = await db.query<StepRow>(
    `INSERT INTO routine_steps (routine_id, title, description, duration_minutes, order_index)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${STEP_RETURNING}`,
    [
      routineId,
      input.title,
      input.description ?? null,
      input.durationMinutes ?? null,
      input.orderIndex ?? 0,
    ]
  );
  return mapStep(result.rows[0]);
}

async function updateRoutineStep(
  routineIdStr: string,
  stepIdStr: string,
  userId: number,
  input: UpdateRoutineStepInput
): Promise<RoutineStep> {
  const routineId = parseRoutineId(routineIdStr);
  await getOwnedRoutineOrThrow(routineId, userId);

  const stepId = parseStepId(stepIdStr);
  const db = getDbPool();
  const check = await db.query('SELECT id FROM routine_steps WHERE id = $1 AND routine_id = $2', [
    stepId,
    routineId,
  ]);
  if (check.rows.length === 0) throw new NotFoundError('Step not found in this routine');

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${i++}`);
    params.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${i++}`);
    params.push(input.description);
  }
  if (input.durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${i++}`);
    params.push(input.durationMinutes);
  }
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${i++}`);
    params.push(input.orderIndex);
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(stepId);
  const result = await db.query<StepRow>(
    `UPDATE routine_steps SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${STEP_RETURNING}`,
    params
  );
  return mapStep(result.rows[0]);
}

async function deleteRoutineStep(
  routineIdStr: string,
  stepIdStr: string,
  userId: number
): Promise<boolean> {
  const routineId = parseRoutineId(routineIdStr);
  await getOwnedRoutineOrThrow(routineId, userId);

  const stepId = parseStepId(stepIdStr);
  const db = getDbPool();
  const check = await db.query('SELECT id FROM routine_steps WHERE id = $1 AND routine_id = $2', [
    stepId,
    routineId,
  ]);
  if (check.rows.length === 0) throw new NotFoundError('Step not found in this routine');

  await db.query('DELETE FROM routine_steps WHERE id = $1', [stepId]);
  return true;
}

export const routineService = {
  createRoutine,
  listRoutines,
  getRoutineById,
  updateRoutine,
  deleteRoutine,
  setRoutineActive,
  toggleRoutineActive,
  createRoutineStep,
  updateRoutineStep,
  deleteRoutineStep,
  listStepsForRoutine,
};
