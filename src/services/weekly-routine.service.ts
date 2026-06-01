import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  BatchCreateWeeklyRoutineActivityInput,
  CreateWeeklyRoutineActivityInput,
  CreateWeeklyRoutineInput,
  DayOfWeek,
  ListWeeklyRoutinesOptions,
  UpdateWeeklyRoutineActivityInput,
  UpdateWeeklyRoutineInput,
  WeeklyRoutine,
  WeeklyRoutineActivity,
  WeeklyRoutineCollection,
  WeeklyRoutineDaySchedule,
} from '../types/services/weekly-routine.types';
import { activityService } from './activity.service';

const DAY_ORDER: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

type RoutineRow = {
  id: string;
  user_id: number;
  name: string;
  description: string | null;
  start_day: string;
  is_active: boolean;
  day_start_time: string | Date;
  day_end_time: string | Date;
  created_at: Date;
  updated_at: Date;
  activities_count?: string;
};

type ActivityRow = {
  id: string;
  routine_id: string;
  activity_id: number;
  day_of_week: string;
  start_time: string | Date;
  duration_minutes: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function formatTime(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 5);
  return value.toTimeString().slice(0, 5);
}

function mapActivity(row: ActivityRow): WeeklyRoutineActivity {
  return {
    id: row.id,
    routineId: row.routine_id,
    activityId: String(row.activity_id),
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: formatTime(row.start_time),
    durationMinutes: row.duration_minutes,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoutine(row: RoutineRow): WeeklyRoutine {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    startDay: row.start_day as DayOfWeek,
    isActive: row.is_active,
    dayStartTime: formatTime(row.day_start_time),
    dayEndTime: formatTime(row.day_end_time),
    activitiesCount: row.activities_count !== undefined ? parseInt(row.activities_count, 10) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSchedule(activities: WeeklyRoutineActivity[]): WeeklyRoutineDaySchedule[] {
  const byDay = new Map<DayOfWeek, WeeklyRoutineActivity[]>();
  for (const a of activities) {
    const list = byDay.get(a.dayOfWeek) ?? [];
    list.push(a);
    byDay.set(a.dayOfWeek, list);
  }
  return DAY_ORDER
    .filter((d) => byDay.has(d))
    .map((d) => ({
      dayOfWeek: d,
      activities: (byDay.get(d) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
}

async function getRoutineRowOrThrow(id: string): Promise<RoutineRow> {
  const result = await getDbPool().query<RoutineRow>(
    'SELECT * FROM weekly_routines WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) throw new NotFoundError('Weekly routine not found');
  return result.rows[0];
}

async function getOwnedRoutineOrThrow(id: string, userId: number): Promise<RoutineRow> {
  const row = await getRoutineRowOrThrow(id);
  if (row.user_id !== userId) throw new ForbiddenError('You do not have permission to access this routine');
  return row;
}

async function getActivityRowOrThrow(id: string): Promise<ActivityRow> {
  const result = await getDbPool().query<ActivityRow>(
    'SELECT * FROM weekly_routine_activities WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) throw new NotFoundError('Weekly routine activity not found');
  return result.rows[0];
}

async function getOwnedRoutineActivityOrThrow(
  activityEntryId: string,
  userId: number
): Promise<ActivityRow> {
  const row = await getActivityRowOrThrow(activityEntryId);
  await getOwnedRoutineOrThrow(row.routine_id, userId);
  return row;
}

// ============================================================
// ROUTINES
// ============================================================

async function createRoutine(
  userId: number,
  input: CreateWeeklyRoutineInput
): Promise<WeeklyRoutine> {
  const db = getDbPool();
  const result = await db.query<RoutineRow>(
    `INSERT INTO weekly_routines (user_id, name, description, start_day, day_start_time, day_end_time)
     VALUES ($1, $2, $3, $4, $5::time, $6::time)
     RETURNING *`,
    [
      userId,
      input.name,
      input.description ?? null,
      input.startDay ?? 'monday',
      input.dayStartTime ?? '07:00',
      input.dayEndTime ?? '22:00',
    ]
  );
  return mapRoutine(result.rows[0]);
}

async function getRoutineById(id: string, userId: number): Promise<WeeklyRoutine> {
  const row = await getOwnedRoutineOrThrow(id, userId);
  const routine = mapRoutine(row);
  const activities = await listActivitiesForRoutine(id);
  routine.schedule = buildSchedule(activities);
  return routine;
}

async function listRoutines(
  userId: number,
  options: ListWeeklyRoutinesOptions = {}
): Promise<WeeklyRoutineCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['r.user_id = $1'];
  const params: unknown[] = [userId];
  let i = 2;

  if (options.isActive !== undefined) {
    conditions.push(`r.is_active = $${i++}`);
    params.push(options.isActive);
  }

  const where = conditions.join(' AND ');

  const [dataResult, countResult] = await Promise.all([
    db.query<RoutineRow & { activities_count: string }>(
      `SELECT r.*,
              COUNT(wra.id)::text AS activities_count
       FROM weekly_routines r
       LEFT JOIN weekly_routine_activities wra ON wra.routine_id = r.id
       WHERE ${where}
       GROUP BY r.id
       ORDER BY r.is_active DESC, r.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    ),
    db.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM weekly_routines r WHERE ${where}`,
      params
    ),
  ]);

  return {
    routines: dataResult.rows.map(mapRoutine),
    page,
    limit,
    total: parseInt(countResult.rows[0].total, 10),
  };
}

async function updateRoutine(
  id: string,
  userId: number,
  input: UpdateWeeklyRoutineInput
): Promise<WeeklyRoutine> {
  await getOwnedRoutineOrThrow(id, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) { updates.push(`name = $${i++}`); params.push(input.name); }
  if (input.description !== undefined) { updates.push(`description = $${i++}`); params.push(input.description); }
  if (input.startDay !== undefined) { updates.push(`start_day = $${i++}`); params.push(input.startDay); }
  if (input.dayStartTime !== undefined) { updates.push(`day_start_time = $${i++}::time`); params.push(input.dayStartTime); }
  if (input.dayEndTime !== undefined) { updates.push(`day_end_time = $${i++}::time`); params.push(input.dayEndTime); }

  if (updates.length === 0) throw new BadRequestError('At least one field is required to update');

  params.push(id);
  const result = await getDbPool().query<RoutineRow>(
    `UPDATE weekly_routines SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return mapRoutine(result.rows[0]);
}

async function deleteRoutine(id: string, userId: number): Promise<boolean> {
  await getOwnedRoutineOrThrow(id, userId);
  await getDbPool().query('DELETE FROM weekly_routines WHERE id = $1', [id]);
  return true;
}

async function setRoutineActive(id: string, userId: number): Promise<WeeklyRoutine> {
  await getOwnedRoutineOrThrow(id, userId);
  const db = getDbPool();
  await db.query(
    'UPDATE weekly_routines SET is_active = false WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  const result = await db.query<RoutineRow>(
    'UPDATE weekly_routines SET is_active = true WHERE id = $1 RETURNING *',
    [id]
  );
  return mapRoutine(result.rows[0]);
}

async function toggleRoutineActive(id: string, userId: number): Promise<WeeklyRoutine> {
  const row = await getOwnedRoutineOrThrow(id, userId);

  // Activating: deactivate all others first
  if (!row.is_active) {
    const db = getDbPool();
    await db.query(
      'UPDATE weekly_routines SET is_active = false WHERE user_id = $1 AND is_active = true',
      [userId]
    );
  }

  const result = await getDbPool().query<RoutineRow>(
    'UPDATE weekly_routines SET is_active = NOT is_active WHERE id = $1 RETURNING *',
    [id]
  );
  return mapRoutine(result.rows[0]);
}

async function getActiveRoutine(userId: number): Promise<WeeklyRoutine | null> {
  const result = await getDbPool().query<RoutineRow>(
    'SELECT * FROM weekly_routines WHERE user_id = $1 AND is_active = true LIMIT 1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  const routine = mapRoutine(result.rows[0]);
  const activities = await listActivitiesForRoutine(routine.id);
  routine.schedule = buildSchedule(activities);
  return routine;
}

// ============================================================
// ACTIVITIES
// ============================================================

function timeToMinutesLocal(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function checkConflict(
  activities: ActivityRow[],
  day: DayOfWeek,
  startTime: string,
  durationMinutes: number,
  excludeId?: string,
): boolean {
  const newStart = timeToMinutesLocal(startTime);
  const newEnd = newStart + durationMinutes;
  return activities
    .filter((a) => a.day_of_week === day && a.id !== excludeId)
    .some((a) => {
      const aStart = timeToMinutesLocal(formatTime(a.start_time));
      const aEnd = aStart + a.duration_minutes;
      return newStart < aEnd && newEnd > aStart;
    });
}

async function listActivitiesForRoutine(routineId: string): Promise<WeeklyRoutineActivity[]> {
  const result = await getDbPool().query<ActivityRow>(
    `SELECT * FROM weekly_routine_activities
     WHERE routine_id = $1
     ORDER BY day_of_week, start_time`,
    [routineId]
  );
  return result.rows.map(mapActivity);
}

async function addActivity(
  userId: number,
  input: CreateWeeklyRoutineActivityInput
): Promise<WeeklyRoutineActivity> {
  await getOwnedRoutineOrThrow(input.routineId, userId);
  await activityService.getActivityById(input.activityId, userId);

  const existing = await getDbPool().query<ActivityRow>(
    'SELECT * FROM weekly_routine_activities WHERE routine_id = $1 AND day_of_week = $2',
    [input.routineId, input.dayOfWeek]
  );
  if (checkConflict(existing.rows, input.dayOfWeek, input.startTime, input.durationMinutes)) {
    throw new BadRequestError('El evento se solapa con un evento existente en ese día');
  }

  const result = await getDbPool().query<ActivityRow>(
    `INSERT INTO weekly_routine_activities
       (routine_id, activity_id, day_of_week, start_time, duration_minutes, notes)
     VALUES ($1, $2, $3, $4::time, $5, $6)
     RETURNING *`,
    [input.routineId, parseInt(input.activityId, 10), input.dayOfWeek, input.startTime, input.durationMinutes, input.notes ?? null]
  );
  return mapActivity(result.rows[0]);
}

async function addActivitiesBatch(
  userId: number,
  input: BatchCreateWeeklyRoutineActivityInput
): Promise<WeeklyRoutineActivity[]> {
  await getOwnedRoutineOrThrow(input.routineId, userId);
  await activityService.getActivityById(input.activityId, userId);

  const placeholders = input.days.map((_, i) => `$${i + 2}`).join(', ');
  const existing = await getDbPool().query<ActivityRow>(
    `SELECT * FROM weekly_routine_activities WHERE routine_id = $1 AND day_of_week IN (${placeholders})`,
    [input.routineId, ...input.days]
  );

  const conflictingDays = input.days.filter((day) =>
    checkConflict(existing.rows, day, input.startTime, input.durationMinutes)
  );
  if (conflictingDays.length > 0) {
    throw new BadRequestError(
      `El evento se solapa con eventos existentes en: ${conflictingDays.join(', ')}`
    );
  }

  const db = getDbPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const inserted: WeeklyRoutineActivity[] = [];
    for (const day of input.days) {
      const result = await client.query<ActivityRow>(
        `INSERT INTO weekly_routine_activities
           (routine_id, activity_id, day_of_week, start_time, duration_minutes, notes)
         VALUES ($1, $2, $3, $4::time, $5, $6)
         RETURNING *`,
        [input.routineId, parseInt(input.activityId, 10), day, input.startTime, input.durationMinutes, input.notes ?? null]
      );
      inserted.push(mapActivity(result.rows[0]));
    }
    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateActivity(
  id: string,
  userId: number,
  input: UpdateWeeklyRoutineActivityInput
): Promise<WeeklyRoutineActivity> {
  const existing = await getOwnedRoutineActivityOrThrow(id, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.dayOfWeek !== undefined) { updates.push(`day_of_week = $${i++}`); params.push(input.dayOfWeek); }
  if (input.startTime !== undefined) { updates.push(`start_time = $${i++}::time`); params.push(input.startTime); }
  if (input.durationMinutes !== undefined) {
    if (input.durationMinutes < 1) throw new BadRequestError('Duration must be at least 1 minute');
    updates.push(`duration_minutes = $${i++}`);
    params.push(input.durationMinutes);
  }
  if (input.notes !== undefined) { updates.push(`notes = $${i++}`); params.push(input.notes); }

  if (updates.length === 0) return mapActivity(existing);

  params.push(id);
  const result = await getDbPool().query<ActivityRow>(
    `UPDATE weekly_routine_activities SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return mapActivity(result.rows[0]);
}

async function removeActivity(id: string, userId: number): Promise<boolean> {
  await getOwnedRoutineActivityOrThrow(id, userId);
  await getDbPool().query('DELETE FROM weekly_routine_activities WHERE id = $1', [id]);
  return true;
}

async function getActivityEntry(id: string, userId: number): Promise<WeeklyRoutineActivity> {
  const row = await getOwnedRoutineActivityOrThrow(id, userId);
  return mapActivity(row);
}

export const weeklyRoutineService = {
  createRoutine,
  getRoutineById,
  listRoutines,
  updateRoutine,
  deleteRoutine,
  setRoutineActive,
  toggleRoutineActive,
  getActiveRoutine,
  listActivitiesForRoutine,
  addActivity,
  addActivitiesBatch,
  updateActivity,
  removeActivity,
  getActivityEntry,
};
