import { getDbPool } from '../shared/database/pool';
import { generateUuidV7 } from '../shared/database/uuid';
import { BadRequestError, NotFoundError } from '../shared/errors';
import type {
  CreateExerciseInput,
  Exercise,
  ExerciseBodyRegion,
  ExerciseHistory,
  ExerciseHistorySet,
  ExercisePersonalRecord,
  StartWorkoutSessionInput,
  UpdateExerciseInput,
  UpsertWorkoutSetInput,
  WorkoutExerciseFrequency,
  WorkoutGameProgress,
  WorkoutReportWindowDays,
  WorkoutReports,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSessionXpAward,
  WorkoutSet,
  WorkoutVolumeBucket,
} from '../types/services/workout.types';
import { EXERCISE_BODY_REGIONS, WORKOUT_REPORT_WINDOW_DAYS } from '../types/services/workout.types';
import { parseActivityId } from './activity.service';
import { activityFollowUpService } from './activity-follow-up.service';
import {
  computeSessionXp,
  levelFromXp,
  nextStreak,
} from './workout-game';
type ExerciseRow = {
  id: string;
  user_id: number;
  name: string;
  body_region: string;
  created_at: Date;
  updated_at: Date;
};

type SessionRow = {
  id: string;
  user_id: number;
  activity_follow_up_id: number;
  activity_id: number;
  created_at: Date;
  updated_at: Date;
};

type SessionExerciseRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
  created_at: Date;
};

type SetRow = {
  id: string;
  session_exercise_id: string;
  set_index: number;
  weight_kg: string | number;
  reps: number;
  created_at: Date;
  updated_at: Date;
};

const EXERCISE_RETURNING = `id, user_id, name, body_region, created_at, updated_at`;
const SESSION_RETURNING = `id, user_id, activity_follow_up_id, activity_id, created_at, updated_at`;
const SESSION_EXERCISE_RETURNING = `id, session_id, exercise_id, order_index, created_at`;
const SET_RETURNING = `id, session_exercise_id, set_index, weight_kg, reps, created_at, updated_at`;

function normalizeBodyRegion(raw: string): ExerciseBodyRegion {
  if (!(EXERCISE_BODY_REGIONS as readonly string[]).includes(raw)) {
    throw new BadRequestError(`Invalid body region: ${raw}`);
  }
  return raw as ExerciseBodyRegion;
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    bodyRegion: normalizeBodyRegion(row.body_region),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    userId: row.user_id,
    followUpId: String(row.activity_follow_up_id),
    activityId: String(row.activity_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSessionExercise(row: SessionExerciseRow): WorkoutSessionExercise {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  };
}

function mapSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    sessionExerciseId: row.session_exercise_id,
    setIndex: row.set_index,
    weightKg: typeof row.weight_kg === 'string' ? parseFloat(row.weight_kg) : Number(row.weight_kg),
    reps: row.reps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOwnedExerciseOrThrow(userId: number, id: string): Promise<ExerciseRow> {
  const result = await getDbPool().query<ExerciseRow>(
    `SELECT ${EXERCISE_RETURNING} FROM exercises WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Exercise not found');
  }
  return result.rows[0];
}

async function listExercises(userId: number): Promise<Exercise[]> {
  const result = await getDbPool().query<ExerciseRow>(
    `SELECT ${EXERCISE_RETURNING} FROM exercises
     WHERE user_id = $1
     ORDER BY lower(name) ASC, created_at ASC`,
    [userId]
  );
  return result.rows.map(mapExercise);
}

async function getExerciseById(userId: number, id: string): Promise<Exercise> {
  return mapExercise(await getOwnedExerciseOrThrow(userId, id));
}

async function createExercise(userId: number, input: CreateExerciseInput): Promise<Exercise> {
  const name = input.name.trim();
  if (!name) {
    throw new BadRequestError('Exercise name is required');
  }

  const id = generateUuidV7();
  const db = getDbPool();
  try {
    const result = await db.query<ExerciseRow>(
      `INSERT INTO exercises (id, user_id, name, body_region)
       VALUES ($1, $2, $3, $4)
       RETURNING ${EXERCISE_RETURNING}`,
      [id, userId, name, input.bodyRegion]
    );
    return mapExercise(result.rows[0]);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      throw new BadRequestError('An exercise with this name already exists');
    }
    throw error;
  }
}

async function updateExercise(
  userId: number,
  id: string,
  input: UpdateExerciseInput
): Promise<Exercise> {
  await getOwnedExerciseOrThrow(userId, id);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestError('Exercise name is required');
    }
    updates.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }
  if (input.bodyRegion !== undefined) {
    updates.push(`body_region = $${paramIndex}`);
    params.push(input.bodyRegion);
    paramIndex++;
  }

  if (updates.length === 0) {
    return mapExercise(await getOwnedExerciseOrThrow(userId, id));
  }

  params.push(id, userId);
  try {
    const result = await getDbPool().query<ExerciseRow>(
      `UPDATE exercises SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING ${EXERCISE_RETURNING}`,
      params
    );
    return mapExercise(result.rows[0]);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      throw new BadRequestError('An exercise with this name already exists');
    }
    throw error;
  }
}

async function deleteExercise(userId: number, id: string): Promise<boolean> {
  await getOwnedExerciseOrThrow(userId, id);

  const usage = await getDbPool().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workout_session_exercises WHERE exercise_id = $1`,
    [id]
  );
  if (parseInt(usage.rows[0].count, 10) > 0) {
    throw new BadRequestError('Cannot delete an exercise that appears in workout history');
  }

  await getDbPool().query('DELETE FROM exercises WHERE id = $1 AND user_id = $2', [id, userId]);
  return true;
}

async function listExercisesForActivity(userId: number, activityIdStr: string): Promise<Exercise[]> {
  const activityId = parseActivityId(activityIdStr);
  const owned = await getDbPool().query<{ id: number }>(
    'SELECT id FROM activities WHERE id = $1 AND user_id = $2',
    [activityId, userId]
  );
  if (owned.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  const result = await getDbPool().query<ExerciseRow>(
    `SELECT e.id, e.user_id, e.name, e.body_region, e.created_at, e.updated_at
     FROM activity_workout_exercises awe
     JOIN exercises e ON e.id = awe.exercise_id
     WHERE awe.activity_id = $1 AND e.user_id = $2
     ORDER BY awe.order_index ASC, e.created_at ASC`,
    [activityId, userId]
  );
  return result.rows.map(mapExercise);
}

/**
 * Replaces the workout exercise template for an activity.
 * Empty array clears associations. All exercise IDs must belong to the user.
 */
async function setActivityWorkoutExercises(
  userId: number,
  activityIdStr: string,
  exerciseIds: string[]
): Promise<Exercise[]> {
  const activityId = parseActivityId(activityIdStr);
  const owned = await getDbPool().query<{ id: number; is_workout: boolean }>(
    'SELECT id, is_workout FROM activities WHERE id = $1 AND user_id = $2',
    [activityId, userId]
  );
  if (owned.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  const uniqueIds = [...new Set(exerciseIds)];
  if (uniqueIds.length !== exerciseIds.length) {
    throw new BadRequestError('workoutExerciseIds must not contain duplicates');
  }

  if (uniqueIds.length > 0) {
    const found = await getDbPool().query<{ id: string }>(
      `SELECT id FROM exercises WHERE user_id = $1 AND id = ANY($2::uuid[])`,
      [userId, uniqueIds]
    );
    if (found.rows.length !== uniqueIds.length) {
      throw new BadRequestError('One or more exercises do not belong to you');
    }
  }

  const db = getDbPool();
  await db.query('DELETE FROM activity_workout_exercises WHERE activity_id = $1', [activityId]);

  for (let i = 0; i < uniqueIds.length; i++) {
    await db.query(
      `INSERT INTO activity_workout_exercises (activity_id, exercise_id, order_index)
       VALUES ($1, $2, $3)`,
      [activityId, uniqueIds[i], i]
    );
  }

  return listExercisesForActivity(userId, activityIdStr);
}

async function loadSessionExercises(sessionId: string): Promise<WorkoutSessionExercise[]> {
  const result = await getDbPool().query<SessionExerciseRow>(
    `SELECT ${SESSION_EXERCISE_RETURNING} FROM workout_session_exercises
     WHERE session_id = $1
     ORDER BY order_index ASC, created_at ASC`,
    [sessionId]
  );
  return result.rows.map(mapSessionExercise);
}

async function loadSetsForSessionExercise(sessionExerciseId: string): Promise<WorkoutSet[]> {
  const result = await getDbPool().query<SetRow>(
    `SELECT ${SET_RETURNING} FROM workout_sets
     WHERE session_exercise_id = $1
     ORDER BY set_index ASC`,
    [sessionExerciseId]
  );
  return result.rows.map(mapSet);
}

async function getOwnedSessionOrThrow(userId: number, id: string): Promise<SessionRow> {
  const result = await getDbPool().query<SessionRow>(
    `SELECT ${SESSION_RETURNING} FROM workout_sessions WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Workout session not found');
  }
  return result.rows[0];
}

async function getSessionById(userId: number, id: string): Promise<WorkoutSession> {
  const session = mapSession(await getOwnedSessionOrThrow(userId, id));
  session.sessionExercises = await loadSessionExercises(session.id);
  return session;
}

async function getSessionByFollowUpId(
  userId: number,
  followUpIdStr: string
): Promise<WorkoutSession | null> {
  const followUpId = activityFollowUpService.parseFollowUpId(followUpIdStr);
  const result = await getDbPool().query<SessionRow>(
    `SELECT ${SESSION_RETURNING} FROM workout_sessions
     WHERE activity_follow_up_id = $1 AND user_id = $2`,
    [followUpId, userId]
  );
  if (result.rows.length === 0) {
    return null;
  }
  const session = mapSession(result.rows[0]);
  session.sessionExercises = await loadSessionExercises(session.id);
  return session;
}

async function startWorkoutSession(
  userId: number,
  input: StartWorkoutSessionInput
): Promise<WorkoutSession> {
  const followUp = await activityFollowUpService.getFollowUpById(input.followUpId, userId);
  if (!followUp.isOpen) {
    throw new BadRequestError('Workout session can only be started for an open follow-up');
  }

  const existing = await getSessionByFollowUpId(userId, followUp.id);
  if (existing) {
    throw new BadRequestError('A workout session already exists for this follow-up');
  }

  const activityId = parseActivityId(followUp.activityId);
  const activityResult = await getDbPool().query<{ id: number; is_workout: boolean }>(
    'SELECT id, is_workout FROM activities WHERE id = $1 AND user_id = $2',
    [activityId, userId]
  );
  if (activityResult.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }
  if (!activityResult.rows[0].is_workout) {
    throw new BadRequestError('Activity must have isWorkout enabled');
  }

  const uniqueIds = [...new Set(input.exerciseIds)];
  if (uniqueIds.length === 0) {
    throw new BadRequestError('At least one exercise is required');
  }
  if (uniqueIds.length !== input.exerciseIds.length) {
    throw new BadRequestError('exerciseIds must not contain duplicates');
  }

  const found = await getDbPool().query<{ id: string }>(
    `SELECT id FROM exercises WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [userId, uniqueIds]
  );
  if (found.rows.length !== uniqueIds.length) {
    throw new BadRequestError('One or more exercises do not belong to you');
  }

  const sessionId = generateUuidV7();
  const followUpId = activityFollowUpService.parseFollowUpId(followUp.id);
  const db = getDbPool();

  const sessionResult = await db.query<SessionRow>(
    `INSERT INTO workout_sessions (id, user_id, activity_follow_up_id, activity_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${SESSION_RETURNING}`,
    [sessionId, userId, followUpId, activityId]
  );

  for (let i = 0; i < uniqueIds.length; i++) {
    await db.query(
      `INSERT INTO workout_session_exercises (id, session_id, exercise_id, order_index)
       VALUES ($1, $2, $3, $4)`,
      [generateUuidV7(), sessionId, uniqueIds[i], i]
    );
  }

  const session = mapSession(sessionResult.rows[0]);
  session.sessionExercises = await loadSessionExercises(sessionId);
  return session;
}

async function getOwnedSessionExerciseOrThrow(
  userId: number,
  sessionExerciseId: string
): Promise<SessionExerciseRow & { follow_up_id: number }> {
  const result = await getDbPool().query<SessionExerciseRow & { follow_up_id: number }>(
    `SELECT wse.id, wse.session_id, wse.exercise_id, wse.order_index, wse.created_at,
            ws.activity_follow_up_id AS follow_up_id
     FROM workout_session_exercises wse
     JOIN workout_sessions ws ON ws.id = wse.session_id
     WHERE wse.id = $1 AND ws.user_id = $2`,
    [sessionExerciseId, userId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Workout session exercise not found');
  }
  return result.rows[0];
}

async function assertFollowUpOpenForSets(userId: number, followUpId: number): Promise<void> {
  const followUp = await activityFollowUpService.getFollowUpById(String(followUpId), userId);
  if (!followUp.isOpen) {
    throw new BadRequestError('Sets can only be edited while the follow-up is open');
  }
}

async function upsertSet(userId: number, input: UpsertWorkoutSetInput): Promise<WorkoutSet> {
  if (input.id) {
    const existing = await getDbPool().query<SetRow & { follow_up_id: number }>(
      `SELECT ws.id, ws.session_exercise_id, ws.set_index, ws.weight_kg, ws.reps,
              ws.created_at, ws.updated_at, sess.activity_follow_up_id AS follow_up_id
       FROM workout_sets ws
       JOIN workout_session_exercises wse ON wse.id = ws.session_exercise_id
       JOIN workout_sessions sess ON sess.id = wse.session_id
       WHERE ws.id = $1 AND sess.user_id = $2`,
      [input.id, userId]
    );
    if (existing.rows.length === 0) {
      throw new NotFoundError('Workout set not found');
    }
    await assertFollowUpOpenForSets(userId, existing.rows[0].follow_up_id);

    const result = await getDbPool().query<SetRow>(
      `UPDATE workout_sets
       SET set_index = $1, weight_kg = $2, reps = $3
       WHERE id = $4
       RETURNING ${SET_RETURNING}`,
      [input.setIndex, input.weightKg, input.reps, input.id]
    );
    return mapSet(result.rows[0]);
  }

  const sessionExercise = await getOwnedSessionExerciseOrThrow(userId, input.sessionExerciseId);
  await assertFollowUpOpenForSets(userId, sessionExercise.follow_up_id);

  const existingByIndex = await getDbPool().query<SetRow>(
    `SELECT ${SET_RETURNING} FROM workout_sets
     WHERE session_exercise_id = $1 AND set_index = $2`,
    [input.sessionExerciseId, input.setIndex]
  );

  if (existingByIndex.rows.length > 0) {
    const result = await getDbPool().query<SetRow>(
      `UPDATE workout_sets
       SET weight_kg = $1, reps = $2
       WHERE id = $3
       RETURNING ${SET_RETURNING}`,
      [input.weightKg, input.reps, existingByIndex.rows[0].id]
    );
    return mapSet(result.rows[0]);
  }

  const id = generateUuidV7();
  const result = await getDbPool().query<SetRow>(
    `INSERT INTO workout_sets (id, session_exercise_id, set_index, weight_kg, reps)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SET_RETURNING}`,
    [id, input.sessionExerciseId, input.setIndex, input.weightKg, input.reps]
  );
  return mapSet(result.rows[0]);
}

async function deleteSet(userId: number, id: string): Promise<boolean> {
  const existing = await getDbPool().query<{ id: string; follow_up_id: number }>(
    `SELECT ws.id, sess.activity_follow_up_id AS follow_up_id
     FROM workout_sets ws
     JOIN workout_session_exercises wse ON wse.id = ws.session_exercise_id
     JOIN workout_sessions sess ON sess.id = wse.session_id
     WHERE ws.id = $1 AND sess.user_id = $2`,
    [id, userId]
  );
  if (existing.rows.length === 0) {
    throw new NotFoundError('Workout set not found');
  }
  await assertFollowUpOpenForSets(userId, existing.rows[0].follow_up_id);

  await getDbPool().query('DELETE FROM workout_sets WHERE id = $1', [id]);
  return true;
}

const DEFAULT_HISTORY_LIMIT = 30;

type HistorySetRow = {
  id: string;
  set_index: number;
  weight_kg: string | number;
  reps: number;
  created_at: Date;
  session_id: string;
  session_created_at: Date;
};

function mapHistorySet(row: HistorySetRow): ExerciseHistorySet {
  return {
    id: row.id,
    setIndex: row.set_index,
    weightKg: typeof row.weight_kg === 'string' ? parseFloat(row.weight_kg) : Number(row.weight_kg),
    reps: row.reps,
    createdAt: row.created_at,
    sessionId: row.session_id,
    sessionCreatedAt: row.session_created_at,
  };
}

/**
 * PR = max weightKg with reps ≥ 1. Ties: higher reps, then most recent set.
 */
async function getExerciseHistory(
  userId: number,
  exerciseId: string,
  limit?: number
): Promise<ExerciseHistory> {
  const exercise = mapExercise(await getOwnedExerciseOrThrow(userId, exerciseId));
  const cappedLimit = Math.min(Math.max(limit ?? DEFAULT_HISTORY_LIMIT, 1), 100);
  const db = getDbPool();

  const prResult = await db.query<HistorySetRow>(
    `SELECT ws.id, ws.set_index, ws.weight_kg, ws.reps, ws.created_at,
            sess.id AS session_id, sess.created_at AS session_created_at
     FROM workout_sets ws
     JOIN workout_session_exercises wse ON wse.id = ws.session_exercise_id
     JOIN workout_sessions sess ON sess.id = wse.session_id
     WHERE wse.exercise_id = $1 AND sess.user_id = $2 AND ws.reps >= 1
     ORDER BY ws.weight_kg DESC, ws.reps DESC, ws.created_at DESC
     LIMIT 1`,
    [exerciseId, userId]
  );

  let personalRecord: ExercisePersonalRecord | null = null;
  if (prResult.rows.length > 0) {
    const row = prResult.rows[0];
    personalRecord = {
      weightKg: typeof row.weight_kg === 'string' ? parseFloat(row.weight_kg) : Number(row.weight_kg),
      reps: row.reps,
      setId: row.id,
      achievedAt: row.created_at,
    };
  }

  const historyResult = await db.query<HistorySetRow>(
    `SELECT ws.id, ws.set_index, ws.weight_kg, ws.reps, ws.created_at,
            sess.id AS session_id, sess.created_at AS session_created_at
     FROM workout_sets ws
     JOIN workout_session_exercises wse ON wse.id = ws.session_exercise_id
     JOIN workout_sessions sess ON sess.id = wse.session_id
     WHERE wse.exercise_id = $1 AND sess.user_id = $2
     ORDER BY ws.created_at DESC
     LIMIT $3`,
    [exerciseId, userId, cappedLimit]
  );

  return {
    exercise,
    personalRecord,
    recentSets: historyResult.rows.map(mapHistorySet),
  };
}

const RANKING_LIMIT = 5;

type FrequencyRow = ExerciseRow & {
  session_count: string | number;
  set_count: string | number;
  volume_kg: string | number;
};

type TotalsRow = {
  session_count: string | number;
  set_count: string | number;
  volume_kg: string | number;
};

type BucketRow = {
  period_start: Date;
  session_count: string | number;
  set_count: string | number;
  volume_kg: string | number;
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Monday 00:00 UTC of the ISO week containing `date`. */
function startOfUtcIsoWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = day.getUTCDay(); // 0 Sun … 6 Sat
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addUtcDays(day, offset);
}

function windowSince(windowDays: WorkoutReportWindowDays, now = new Date()): Date {
  const today = startOfUtcDay(now);
  return addUtcDays(today, -(windowDays - 1));
}

function parseNumeric(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : Number(value);
}

function mapFrequency(row: FrequencyRow): WorkoutExerciseFrequency {
  return {
    exercise: mapExercise(row),
    sessionCount: Number(row.session_count),
    setCount: Number(row.set_count),
    volumeKg: parseNumeric(row.volume_kg),
  };
}

function buildVolumeBuckets(
  windowDays: WorkoutReportWindowDays,
  since: Date,
  now: Date,
  rows: BucketRow[]
): WorkoutVolumeBucket[] {
  const byKey = new Map<number, WorkoutVolumeBucket>();
  for (const row of rows) {
    const periodStart = startOfUtcDay(new Date(row.period_start));
    byKey.set(periodStart.getTime(), {
      periodStart,
      sessionCount: Number(row.session_count),
      setCount: Number(row.set_count),
      volumeKg: parseNumeric(row.volume_kg),
    });
  }

  const buckets: WorkoutVolumeBucket[] = [];
  if (windowDays === 7) {
    for (let d = 0; d < windowDays; d += 1) {
      const periodStart = addUtcDays(since, d);
      const existing = byKey.get(periodStart.getTime());
      buckets.push(
        existing ?? { periodStart, sessionCount: 0, setCount: 0, volumeKg: 0 }
      );
    }
    return buckets;
  }

  // 30 / 90: weekly buckets from ISO week of `since` through today.
  let cursor = startOfUtcIsoWeek(since);
  const end = startOfUtcDay(now);
  while (cursor.getTime() <= end.getTime()) {
    const existing = byKey.get(cursor.getTime());
    buckets.push(
      existing ?? { periodStart: new Date(cursor), sessionCount: 0, setCount: 0, volumeKg: 0 }
    );
    cursor = addUtcDays(cursor, 7);
  }
  return buckets;
}

/**
 * Reportes agregados: frecuencia top/bottom, volumen y tendencia en 7/30/90 días.
 */
async function getWorkoutReports(
  userId: number,
  windowDays: WorkoutReportWindowDays,
  now = new Date()
): Promise<WorkoutReports> {
  if (!(WORKOUT_REPORT_WINDOW_DAYS as readonly number[]).includes(windowDays)) {
    throw new BadRequestError('windowDays must be 7, 30, or 90');
  }

  const since = windowSince(windowDays, now);
  const db = getDbPool();

  const totalsResult = await db.query<TotalsRow>(
    `SELECT
       (SELECT COUNT(*)::int FROM workout_sessions
         WHERE user_id = $1 AND created_at >= $2) AS session_count,
       COUNT(ws.id)::int AS set_count,
       COALESCE(SUM(ws.weight_kg * ws.reps), 0)::float AS volume_kg
     FROM workout_sessions sess
     LEFT JOIN workout_session_exercises wse ON wse.session_id = sess.id
     LEFT JOIN workout_sets ws ON ws.session_exercise_id = wse.id
     WHERE sess.user_id = $1 AND sess.created_at >= $2`,
    [userId, since]
  );

  const totals = totalsResult.rows[0] ?? {
    session_count: 0,
    set_count: 0,
    volume_kg: 0,
  };
  const sessionCount = Number(totals.session_count);
  const totalSets = Number(totals.set_count);
  const totalVolumeKg = parseNumeric(totals.volume_kg);

  const frequencyResult = await db.query<FrequencyRow>(
    `SELECT e.id, e.user_id, e.name, e.body_region, e.created_at, e.updated_at,
            COUNT(DISTINCT sess.id)::int AS session_count,
            COUNT(ws.id)::int AS set_count,
            COALESCE(SUM(ws.weight_kg * ws.reps), 0)::float AS volume_kg
     FROM exercises e
     JOIN workout_session_exercises wse ON wse.exercise_id = e.id
     JOIN workout_sessions sess ON sess.id = wse.session_id
     LEFT JOIN workout_sets ws ON ws.session_exercise_id = wse.id
     WHERE e.user_id = $1 AND sess.user_id = $1 AND sess.created_at >= $2
     GROUP BY e.id
     ORDER BY session_count DESC, volume_kg DESC, e.name ASC`,
    [userId, since]
  );

  const ranking = frequencyResult.rows.map(mapFrequency);
  const topExercises = ranking.slice(0, RANKING_LIMIT);
  const bottomExercises = [...ranking]
    .sort((a, b) => {
      if (a.sessionCount !== b.sessionCount) return a.sessionCount - b.sessionCount;
      if (a.volumeKg !== b.volumeKg) return a.volumeKg - b.volumeKg;
      return a.exercise.name.localeCompare(b.exercise.name);
    })
    .slice(0, RANKING_LIMIT);

  const truncUnit = windowDays === 7 ? 'day' : 'week';
  const bucketResult = await db.query<BucketRow>(
    `SELECT date_trunc($3, sess.created_at AT TIME ZONE 'UTC') AS period_start,
            COUNT(DISTINCT sess.id)::int AS session_count,
            COUNT(ws.id)::int AS set_count,
            COALESCE(SUM(ws.weight_kg * ws.reps), 0)::float AS volume_kg
     FROM workout_sessions sess
     LEFT JOIN workout_session_exercises wse ON wse.session_id = sess.id
     LEFT JOIN workout_sets ws ON ws.session_exercise_id = wse.id
     WHERE sess.user_id = $1 AND sess.created_at >= $2
     GROUP BY 1
     ORDER BY 1 ASC`,
    [userId, since, truncUnit]
  );

  const volumeByPeriod = buildVolumeBuckets(windowDays, since, now, bucketResult.rows);
  const sessionsPerWeek = Number((sessionCount / (windowDays / 7)).toFixed(2));

  return {
    windowDays,
    sessionCount,
    totalSets,
    totalVolumeKg,
    sessionsPerWeek,
    topExercises,
    bottomExercises,
    volumeByPeriod,
  };
}

type ProgressRow = {
  user_id: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | Date | null;
  updated_at: Date;
};

type AwardRow = {
  session_id: string;
  user_id: number;
  xp_awarded: number;
  valid_set_count: number;
  volume_kg: string | number;
  awarded_at: Date;
};

function formatDateOnly(value: string | Date | null): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function mapProgress(row: ProgressRow | null | undefined): WorkoutGameProgress {
  const totalXp = row?.total_xp ?? 0;
  const levelInfo = levelFromXp(totalXp);
  return {
    totalXp,
    level: levelInfo.level,
    xpIntoLevel: levelInfo.xpIntoLevel,
    xpForNextLevel: levelInfo.xpForNextLevel,
    currentStreak: row?.current_streak ?? 0,
    longestStreak: row?.longest_streak ?? 0,
    lastWorkoutDate: formatDateOnly(row?.last_workout_date ?? null),
  };
}

function mapAward(row: AwardRow): WorkoutSessionXpAward {
  return {
    sessionId: row.session_id,
    xpAwarded: row.xp_awarded,
    validSetCount: row.valid_set_count,
    volumeKg:
      typeof row.volume_kg === 'string' ? parseFloat(row.volume_kg) : Number(row.volume_kg),
    awardedAt: row.awarded_at,
  };
}

async function getGameProgress(userId: number): Promise<WorkoutGameProgress> {
  const result = await getDbPool().query<ProgressRow>(
    `SELECT user_id, total_xp, current_streak, longest_streak, last_workout_date, updated_at
     FROM workout_game_progress WHERE user_id = $1`,
    [userId]
  );
  return mapProgress(result.rows[0]);
}

async function getXpAwardForFollowUp(
  userId: number,
  followUpId: string
): Promise<WorkoutSessionXpAward | null> {
  const followUpPk = activityFollowUpService.parseFollowUpId(followUpId);
  const result = await getDbPool().query<AwardRow>(
    `SELECT a.session_id, a.user_id, a.xp_awarded, a.valid_set_count, a.volume_kg, a.awarded_at
     FROM workout_session_xp_awards a
     INNER JOIN workout_sessions s ON s.id = a.session_id
     WHERE a.user_id = $1 AND s.activity_follow_up_id = $2`,
    [userId, followUpPk]
  );
  if (result.rows.length === 0) return null;
  return mapAward(result.rows[0]!);
}

/**
 * Al cerrar un follow-up abierto: si hay sesión con ≥1 set válido, otorga XP una sola vez.
 * Idempotente por session_id (re-editar el follow-up no suma XP otra vez).
 */
async function tryAwardXpForClosedFollowUp(
  userId: number,
  followUpId: string,
  awardDate: string
): Promise<WorkoutSessionXpAward | null> {
  const followUpPk = activityFollowUpService.parseFollowUpId(followUpId);
  const db = getDbPool();

  const sessionResult = await db.query<SessionRow>(
    `SELECT ${SESSION_RETURNING} FROM workout_sessions
     WHERE user_id = $1 AND activity_follow_up_id = $2`,
    [userId, followUpPk]
  );
  const session = sessionResult.rows[0];
  if (!session) return null;

  const existingAward = await db.query<AwardRow>(
    `SELECT session_id, user_id, xp_awarded, valid_set_count, volume_kg, awarded_at
     FROM workout_session_xp_awards WHERE session_id = $1`,
    [session.id]
  );
  if (existingAward.rows.length > 0) {
    return mapAward(existingAward.rows[0]!);
  }

  const statsResult = await db.query<{
    valid_set_count: number;
    volume_kg: string | number;
  }>(
    `SELECT COUNT(ws.id)::int AS valid_set_count,
            COALESCE(SUM(ws.weight_kg * ws.reps), 0)::float AS volume_kg
     FROM workout_session_exercises wse
     INNER JOIN workout_sets ws ON ws.session_exercise_id = wse.id
     WHERE wse.session_id = $1
       AND ws.reps >= 1
       AND ws.weight_kg >= 0`,
    [session.id]
  );
  const validSetCount = statsResult.rows[0]?.valid_set_count ?? 0;
  const volumeKg =
    typeof statsResult.rows[0]?.volume_kg === 'string'
      ? parseFloat(statsResult.rows[0].volume_kg)
      : Number(statsResult.rows[0]?.volume_kg ?? 0);

  const xp = computeSessionXp(validSetCount, volumeKg);
  if (xp <= 0) return null;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const insertAward = await client.query<AwardRow>(
      `INSERT INTO workout_session_xp_awards
         (session_id, user_id, xp_awarded, valid_set_count, volume_kg)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id) DO NOTHING
       RETURNING session_id, user_id, xp_awarded, valid_set_count, volume_kg, awarded_at`,
      [session.id, userId, xp, validSetCount, volumeKg]
    );

    if (insertAward.rows.length === 0) {
      await client.query('ROLLBACK');
      const again = await db.query<AwardRow>(
        `SELECT session_id, user_id, xp_awarded, valid_set_count, volume_kg, awarded_at
         FROM workout_session_xp_awards WHERE session_id = $1`,
        [session.id]
      );
      return again.rows[0] ? mapAward(again.rows[0]) : null;
    }

    const progressResult = await client.query<ProgressRow>(
      `SELECT user_id, total_xp, current_streak, longest_streak, last_workout_date, updated_at
       FROM workout_game_progress WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    const prev = progressResult.rows[0];
    const prevXp = prev?.total_xp ?? 0;
    const prevStreak = prev?.current_streak ?? 0;
    const prevLongest = prev?.longest_streak ?? 0;
    const prevDate = formatDateOnly(prev?.last_workout_date ?? null);
    const streak = nextStreak(prevDate, awardDate, prevStreak);
    const longest = Math.max(prevLongest, streak);

    await client.query(
      `INSERT INTO workout_game_progress
         (user_id, total_xp, current_streak, longest_streak, last_workout_date)
       VALUES ($1, $2, $3, $4, $5::date)
       ON CONFLICT (user_id) DO UPDATE SET
         total_xp = EXCLUDED.total_xp,
         current_streak = EXCLUDED.current_streak,
         longest_streak = EXCLUDED.longest_streak,
         last_workout_date = EXCLUDED.last_workout_date`,
      [userId, prevXp + xp, streak, longest, awardDate]
    );

    await client.query('COMMIT');
    return mapAward(insertAward.rows[0]!);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const workoutService = {
  listExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  listExercisesForActivity,
  setActivityWorkoutExercises,
  getSessionById,
  getSessionByFollowUpId,
  startWorkoutSession,
  loadSessionExercises,
  loadSetsForSessionExercise,
  upsertSet,
  deleteSet,
  getExerciseHistory,
  getWorkoutReports,
  getGameProgress,
  getXpAwardForFollowUp,
  tryAwardXpForClosedFollowUp,
};
