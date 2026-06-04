import { getDbPool } from '../shared/database/pool';
import { ConflictError, ForbiddenError, NotFoundError } from '../shared/errors';
import { habitCategoryService } from './habit-category.service';
import { habitMeasureService } from './habit-measure.service';
import { activityService } from './activity.service';
import {
  addDaysToDateString,
  applyFailedStreak,
  applyLifelineToEndDate,
  isFollowUpGoalMet,
} from './habit-streak';
import type {
  AddHabitLogInput,
  CreateHabitInput,
  Habit,
  HabitCollection,
  HabitFollowUp,
  HabitLog,
  HabitFollowUpsDateGroup,
  HabitMyDayEntry,
  HabitStats,
  ListHabitFollowUpsOptions,
  ListHabitLogsOptions,
  ListHabitsOptions,
  UpdateHabitFollowUpInput,
  UpdateHabitInput,
} from '../types/services/habit.types';

type HabitRow = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'custom';
  target_count: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  order_index: number;
  start_date: Date | string | null;
  end_date: Date | string | null;
  should_avoid: boolean;
  should_keep: boolean;
  is_counter: boolean;
  is_timer: boolean;
  is_incremental: boolean;
  is_decremental: boolean;
  days: number;
  streak: number;
  max_streak: number;
  daily_goal: number;
  timer_goal: number;
  times_goal: number;
  step: number | null;
  category_id: string | null;
  measure_id: string | null;
  activity_id: number | null;
  habit_type: 'boolean' | 'count' | 'time';
  period_days: number;
  restart_count: number;
  weekly_lifelines: number;
  status: 'active' | 'completed' | 'archived';
  created_at: Date;
  updated_at: Date;
};

type HabitLogRow = {
  id: number;
  habit_id: number;
  user_id: number;
  completed_date: Date | string;
  count: number;
  time: number;
  notes: string | null;
  story: string | null;
  archived: boolean;
  is_accomplished: boolean;
  is_failed: boolean;
  difficulty: number | null;
  is_lifeline: boolean;
  created_at: Date;
  updated_at: Date;
};

const HABIT_RETURNING = `id, user_id, name, description, frequency, target_count, icon, color, is_active,
  order_index, start_date, end_date, should_avoid, should_keep, is_counter, is_timer,
  is_incremental, is_decremental, days, streak, max_streak, daily_goal, timer_goal, times_goal,
  step, category_id, measure_id, activity_id,
  habit_type, period_days, restart_count, weekly_lifelines, status,
  created_at, updated_at`;

const LOG_RETURNING = `id, habit_id, user_id, completed_date, count, time, notes, story, archived,
  is_accomplished, is_failed, difficulty, is_lifeline, created_at, updated_at`;

function formatDate(value: Date | string | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).split('T')[0];
}

function mapHabit(row: HabitRow): Habit {
  return {
    id: String(row.id),
    userId: row.user_id,
    name: row.name,
    description: row.description,
    frequency: row.frequency,
    targetCount: row.target_count,
    icon: row.icon,
    color: row.color,
    isActive: row.is_active,
    orderIndex: row.order_index ?? 0,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    shouldAvoid: row.should_avoid ?? false,
    shouldKeep: row.should_keep ?? true,
    isCounter: row.is_counter ?? true,
    isTimer: row.is_timer ?? false,
    isIncremental: row.is_incremental ?? false,
    isDecremental: row.is_decremental ?? false,
    days: row.days ?? 0,
    streak: row.streak ?? 0,
    maxStreak: row.max_streak ?? 0,
    dailyGoal: row.daily_goal ?? 0,
    timerGoal: row.timer_goal ?? 0,
    timesGoal: row.times_goal ?? 0,
    step: row.step ?? null,
    categoryId: row.category_id ?? null,
    measureId: row.measure_id ?? null,
    activityId: row.activity_id ?? null,
    habitType: row.habit_type ?? 'boolean',
    periodDays: row.period_days ?? 0,
    restartCount: row.restart_count ?? 0,
    weeklyLifelines: row.weekly_lifelines ?? 0,
    status: row.status ?? 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHabitLog(row: HabitLogRow): HabitLog {
  return {
    id: String(row.id),
    habitId: String(row.habit_id),
    userId: row.user_id,
    completedDate: formatDate(row.completed_date)!,
    count: row.count,
    time: row.time ?? 0,
    notes: row.notes,
    story: row.story ?? null,
    archived: row.archived ?? false,
    isAccomplished: row.is_accomplished ?? false,
    isFailed: row.is_failed ?? false,
    difficulty: row.difficulty ?? null,
    isLifeline: row.is_lifeline ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export function parseHabitId(id: string): number {
  const habitId = parseInt(id, 10);
  if (Number.isNaN(habitId)) {
    throw new NotFoundError('Habit not found');
  }
  return habitId;
}

function assertHabitOwnership(habit: { user_id: number }, userId: number): void {
  if (habit.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this habit');
  }
}

/**
 * Computes consecutive-day streak from log dates (newest first) — Phase 1 fallback.
 */
export function calculateCurrentStreak(completedDates: Date[]): number {
  if (completedDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let checkDate = new Date(completedDates[0]);
  checkDate.setHours(0, 0, 0, 0);

  if (checkDate.getTime() !== today.getTime() && checkDate.getTime() !== yesterday.getTime()) {
    return 0;
  }

  let currentStreak = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const prevDate = new Date(completedDates[i - 1]);
    prevDate.setHours(0, 0, 0, 0);
    const currDate = new Date(completedDates[i]);
    currDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) currentStreak++;
    else break;
  }
  return currentStreak;
}

async function getHabitRowOrThrow(habitId: number): Promise<HabitRow> {
  const db = getDbPool();
  const result = await db.query<HabitRow>(`SELECT * FROM habits WHERE id = $1`, [habitId]);
  if (result.rows.length === 0) throw new NotFoundError('Habit not found');
  return result.rows[0];
}

async function getOwnedHabitOrThrow(habitId: number, userId: number): Promise<HabitRow> {
  const habit = await getHabitRowOrThrow(habitId);
  assertHabitOwnership(habit, userId);
  return habit;
}

async function resolveCategoryId(userId: number, categoryId?: string | null): Promise<string> {
  if (categoryId) {
    await habitCategoryService.getCategoryById(categoryId, userId);
    return categoryId;
  }
  return habitCategoryService.ensureDefaultCategoryId(userId);
}

async function verifyMeasureId(userId: number, measureId?: string | null): Promise<void> {
  if (measureId) {
    await habitMeasureService.getMeasureById(measureId, userId);
  }
}

async function verifyActivityId(userId: number, activityId?: number | null): Promise<void> {
  if (activityId == null) return;
  await activityService.getActivityById(String(activityId), userId);
}

export async function syncHabitStreakFromLogs(habitId: number): Promise<void> {
  const db = getDbPool();

  const streakResult = await db.query<{ streak: number }>(
    `SELECT COUNT(*)::int AS streak
     FROM habit_logs
     WHERE habit_id = $1
       AND is_accomplished = TRUE
       AND is_lifeline = FALSE
       AND archived = FALSE
       AND completed_date > (
         SELECT COALESCE(MAX(completed_date), '1970-01-01'::date)
         FROM habit_logs
         WHERE habit_id = $1 AND is_failed = TRUE
       )`,
    [habitId]
  );
  const streak = streakResult.rows[0].streak;

  const maxStreakResult = await db.query<{ max_streak: number }>(
    `WITH failure_dates AS (
       SELECT completed_date AS fd
       FROM habit_logs
       WHERE habit_id = $1 AND is_failed = TRUE
     ),
     boundaries AS (
       SELECT '1970-01-01'::date AS epoch_start,
              MIN(fd) AS epoch_end
       FROM failure_dates
       UNION ALL
       SELECT fd AS epoch_start,
              LEAD(fd) OVER (ORDER BY fd) AS epoch_end
       FROM failure_dates
     ),
     epoch_counts AS (
       SELECT b.epoch_start,
              COALESCE(b.epoch_end, '9999-12-31'::date) AS epoch_end,
              COUNT(hl.id) AS cnt
       FROM boundaries b
       LEFT JOIN habit_logs hl
         ON hl.habit_id = $1
         AND hl.is_accomplished = TRUE
         AND hl.is_lifeline = FALSE
         AND hl.archived = FALSE
         AND hl.completed_date > b.epoch_start
         AND hl.completed_date < COALESCE(b.epoch_end, '9999-12-31'::date)
       GROUP BY b.epoch_start, b.epoch_end
     )
     SELECT COALESCE(MAX(cnt), 0) AS max_streak FROM epoch_counts`,
    [habitId]
  );
  const max_streak = maxStreakResult.rows[0].max_streak;

  await db.query(
    `UPDATE habits
     SET streak = $1,
         max_streak = $2,
         days = (SELECT COUNT(*) FROM habit_logs WHERE habit_id = $3 AND archived = FALSE)
     WHERE id = $3`,
    [streak, max_streak, habitId]
  );
}

async function applyStreakAfterFollowUp(
  habit: HabitRow,
  date: string,
  isAccomplished: boolean,
  isFailed: boolean,
  isLifeline: boolean
): Promise<void> {
  const db = getDbPool();

  if (isLifeline) {
    const { end_date } = applyLifelineToEndDate(habit);
    await db.query(`UPDATE habits SET end_date = $1 WHERE id = $2`, [end_date, habit.id]);
    return;
  }

  if (isFailed) {
    const failed = applyFailedStreak(habit, date);
    await db.query(
      `UPDATE habit_logs SET archived = TRUE
       WHERE habit_id = $1 AND completed_date <= $2::date AND archived = FALSE`,
      [habit.id, date]
    );
    await db.query(
      `UPDATE habits SET streak = $1, end_date = $2, restart_count = $3 WHERE id = $4`,
      [failed.streak, failed.end_date, failed.restart_count, habit.id]
    );
    return;
  }

  if (isAccomplished) {
    await db.query(
      `UPDATE habits
       SET streak = streak + 1,
           max_streak = GREATEST(max_streak, streak + 1),
           days = days + 1
       WHERE id = $1`,
      [habit.id]
    );
  }
}

async function createHabit(userId: number, input: CreateHabitInput): Promise<Habit> {
  const categoryId = await resolveCategoryId(userId, input.categoryId);
  await verifyMeasureId(userId, input.measureId);
  await verifyActivityId(userId, input.activityId);

  const dailyGoal = input.dailyGoal ?? input.targetCount ?? 1;
  const db = getDbPool();
  const result = await db.query<HabitRow>(
    `INSERT INTO habits (
      user_id, name, description, frequency, target_count, icon, color,
      category_id, measure_id, activity_id, start_date, end_date,
      should_avoid, should_keep, is_counter, is_timer, is_incremental, is_decremental,
      daily_goal, timer_goal, times_goal, step, order_index
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    ) RETURNING ${HABIT_RETURNING}`,
    [
      userId,
      input.name,
      input.description ?? null,
      input.frequency ?? 'daily',
      input.targetCount ?? dailyGoal,
      input.icon ?? null,
      input.color ?? null,
      categoryId,
      input.measureId ?? null,
      input.activityId ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.shouldAvoid ?? false,
      input.shouldKeep ?? true,
      input.isCounter ?? true,
      input.isTimer ?? false,
      input.isIncremental ?? false,
      input.isDecremental ?? false,
      dailyGoal,
      input.timerGoal ?? 0,
      input.timesGoal ?? 0,
      input.step ?? null,
      input.orderIndex ?? 0,
    ]
  );
  return mapHabit(result.rows[0]);
}

async function listHabits(userId: number, options: ListHabitsOptions = {}): Promise<HabitCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE user_id = $1';
  const params: (number | boolean | string)[] = [userId];

  if (options.isActive !== undefined) {
    params.push(options.isActive);
    whereClause += ` AND is_active = $${params.length}`;
  }
  if (options.categoryId) {
    params.push(options.categoryId);
    whereClause += ` AND category_id = $${params.length}`;
  }

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM habits ${whereClause}`,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await db.query<HabitRow>(
    `SELECT * FROM habits ${whereClause} ORDER BY order_index ASC, created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    listParams
  );

  return {
    habits: result.rows.map(mapHabit),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getHabitById(id: string, userId: number): Promise<Habit> {
  const habit = await getOwnedHabitOrThrow(parseHabitId(id), userId);
  return mapHabit(habit);
}

async function updateHabit(id: string, userId: number, input: UpdateHabitInput): Promise<Habit> {
  const habitId = parseHabitId(id);
  await getOwnedHabitOrThrow(habitId, userId);

  if (input.categoryId) {
    await habitCategoryService.getCategoryById(input.categoryId, userId);
  }
  await verifyMeasureId(userId, input.measureId);
  await verifyActivityId(userId, input.activityId);

  const fieldMap: Record<string, keyof UpdateHabitInput> = {
    name: 'name',
    description: 'description',
    frequency: 'frequency',
    target_count: 'targetCount',
    icon: 'icon',
    color: 'color',
    is_active: 'isActive',
    category_id: 'categoryId',
    measure_id: 'measureId',
    activity_id: 'activityId',
    start_date: 'startDate',
    end_date: 'endDate',
    should_avoid: 'shouldAvoid',
    should_keep: 'shouldKeep',
    is_counter: 'isCounter',
    is_timer: 'isTimer',
    is_incremental: 'isIncremental',
    is_decremental: 'isDecremental',
    daily_goal: 'dailyGoal',
    timer_goal: 'timerGoal',
    times_goal: 'timesGoal',
    step: 'step',
    order_index: 'orderIndex',
  };

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [col, key] of Object.entries(fieldMap)) {
    const val = input[key as keyof UpdateHabitInput];
    if (val !== undefined) {
      updates.push(`${col} = $${paramIndex}`);
      params.push(val);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return mapHabit(await getHabitRowOrThrow(habitId));
  }

  params.push(habitId);
  const db = getDbPool();
  const result = await db.query<HabitRow>(
    `UPDATE habits SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${HABIT_RETURNING}`,
    params
  );
  return mapHabit(result.rows[0]);
}

async function deleteHabit(id: string, userId: number): Promise<boolean> {
  const habitId = parseHabitId(id);
  await getOwnedHabitOrThrow(habitId, userId);
  await getDbPool().query('DELETE FROM habits WHERE id = $1', [habitId]);
  return true;
}

async function getLifelinesUsedThisWeek(habitId: number): Promise<number> {
  const db = getDbPool();
  const result = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM habit_logs
     WHERE habit_id = $1
       AND is_lifeline = TRUE
       AND DATE_TRUNC('week', completed_date) = DATE_TRUNC('week', CURRENT_DATE)`,
    [habitId]
  );
  return result.rows[0].count;
}

async function addHabitLog(
  habitIdStr: string,
  userId: number,
  input: AddHabitLogInput
): Promise<HabitLog> {
  const habitId = parseHabitId(habitIdStr);
  const habit = await getOwnedHabitOrThrow(habitId, userId);
  const date = input.completedDate ?? new Date().toISOString().split('T')[0];
  const db = getDbPool();

  if (input.isLifeline === true) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = addDaysToDateString(today, -1);
    if (date < yesterday) {
      throw new ConflictError('Lifeline can only be applied to today or yesterday');
    }
    if (habit.weekly_lifelines <= 0) {
      throw new ConflictError('This habit has no lifelines configured');
    }
    const used = await getLifelinesUsedThisWeek(habitId);
    if (used >= habit.weekly_lifelines) {
      throw new ConflictError('Weekly lifeline limit reached');
    }
    const insertResult = await db.query<HabitLogRow>(
      `INSERT INTO habit_logs
         (habit_id, user_id, completed_date, count, time, notes, story,
          is_accomplished, is_failed, is_lifeline, difficulty)
       VALUES ($1, $2, $3::date, 0, 0, $4, $5, FALSE, FALSE, TRUE, $6)
       RETURNING ${LOG_RETURNING}`,
      [habitId, userId, date, input.notes ?? null, input.story ?? null, input.difficulty ?? null]
    );
    await applyStreakAfterFollowUp(habit, date, false, false, true);
    return mapHabitLog(insertResult.rows[0]);
  }

  const count = input.count ?? 1;
  const time = input.time ?? 0;

  const existing = await db.query<HabitLogRow>(
    `SELECT * FROM habit_logs WHERE habit_id = $1 AND completed_date = $2::date AND is_lifeline = FALSE`,
    [habitId, date]
  );

  const followUpPayload = { count, time };
  const goalMet = isFollowUpGoalMet(habit, followUpPayload);
  const isFailed = input.isFailed === true;
  const isAccomplished =
    input.isAccomplished === true || (input.isAccomplished !== false && goalMet && !isFailed);

  let logRow: HabitLogRow;

  if (existing.rows.length > 0) {
    const mergedCount = existing.rows[0].count + count;
    const mergedTime = existing.rows[0].time + time;
    const mergedGoalMet = isFollowUpGoalMet(habit, { count: mergedCount, time: mergedTime });
    const accomplished =
      input.isAccomplished === true ||
      (input.isAccomplished !== false && mergedGoalMet && !isFailed);

    const updateResult = await db.query<HabitLogRow>(
      `UPDATE habit_logs
       SET count = $1, time = $2, notes = COALESCE($3, notes), story = COALESCE($4, story),
           is_accomplished = $5, is_failed = $6,
           difficulty = COALESCE($7, difficulty), updated_at = NOW()
       WHERE id = $8
       RETURNING ${LOG_RETURNING}`,
      [
        mergedCount,
        mergedTime,
        input.notes ?? null,
        input.story ?? null,
        accomplished,
        isFailed,
        input.difficulty ?? null,
        existing.rows[0].id,
      ]
    );
    logRow = updateResult.rows[0];
    await applyStreakAfterFollowUp(habit, date, accomplished, isFailed, false);
  } else {
    const insertResult = await db.query<HabitLogRow>(
      `INSERT INTO habit_logs
         (habit_id, user_id, completed_date, count, time, notes, story,
          is_accomplished, is_failed, is_lifeline, difficulty)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, FALSE, $10)
       RETURNING ${LOG_RETURNING}`,
      [
        habitId,
        userId,
        date,
        count,
        time,
        input.notes ?? null,
        input.story ?? null,
        isAccomplished,
        isFailed,
        input.difficulty ?? null,
      ]
    );
    logRow = insertResult.rows[0];
    await applyStreakAfterFollowUp(habit, date, isAccomplished, isFailed, false);
  }

  return mapHabitLog(logRow);
}

async function updateHabitFollowUp(
  followUpId: string,
  userId: number,
  input: UpdateHabitFollowUpInput
): Promise<HabitFollowUp> {
  const db = getDbPool();
  const id = parseInt(followUpId, 10);
  if (Number.isNaN(id)) throw new NotFoundError('Follow-up not found');

  const existing = await db.query<HabitLogRow & { habit_id: number }>(
    `SELECT hl.*, hl.habit_id FROM habit_logs hl WHERE hl.id = $1`,
    [id]
  );
  if (existing.rows.length === 0) throw new NotFoundError('Follow-up not found');

  const log = existing.rows[0];
  const habit = await getOwnedHabitOrThrow(log.habit_id, userId);

  const count = input.count ?? log.count;
  const time = input.time ?? log.time;
  const isFailed = input.isFailed ?? log.is_failed;
  const goalMet = isFollowUpGoalMet(habit, { count, time });
  const isAccomplished =
    input.isAccomplished ?? (goalMet && !isFailed ? true : log.is_accomplished);

  const result = await db.query<HabitLogRow>(
    `UPDATE habit_logs
     SET count = $1, time = $2, notes = COALESCE($3, notes), story = COALESCE($4, story),
         is_accomplished = $5, is_failed = $6, archived = COALESCE($7, archived),
         difficulty = COALESCE($8, difficulty), updated_at = NOW()
     WHERE id = $9
     RETURNING ${LOG_RETURNING}`,
    [count, time, input.notes, input.story, isAccomplished, isFailed, input.archived, input.difficulty ?? null, id]
  );

  const date = formatDate(log.completed_date)!;
  await applyStreakAfterFollowUp(habit, date, isAccomplished, isFailed, false);

  return mapHabitLog(result.rows[0]);
}

async function removeHabitFollowUp(followUpId: string, userId: number): Promise<boolean> {
  const db = getDbPool();
  const id = parseInt(followUpId, 10);
  if (Number.isNaN(id)) throw new NotFoundError('Follow-up not found');

  const existing = await db.query<{ habit_id: number; user_id: number }>(
    'SELECT habit_id, user_id FROM habit_logs WHERE id = $1',
    [id]
  );
  if (existing.rows.length === 0) throw new NotFoundError('Follow-up not found');
  if (existing.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this follow-up');
  }

  await db.query('DELETE FROM habit_logs WHERE id = $1', [id]);
  await syncHabitStreakFromLogs(existing.rows[0].habit_id);
  return true;
}

async function listHabitLogs(
  habitIdStr: string,
  userId: number,
  options: ListHabitLogsOptions = {}
): Promise<HabitLog[]> {
  const habitId = parseHabitId(habitIdStr);
  await getOwnedHabitOrThrow(habitId, userId);

  let query = 'SELECT * FROM habit_logs WHERE habit_id = $1';
  const params: (number | string | boolean)[] = [habitId];
  let paramIndex = 2;

  if (options.isArchived !== undefined) {
    query += ` AND archived = $${paramIndex}`;
    params.push(options.isArchived);
    paramIndex++;
  }
  if (options.startDate) {
    query += ` AND completed_date >= $${paramIndex}::date`;
    params.push(options.startDate);
    paramIndex++;
  }
  if (options.endDate) {
    query += ` AND completed_date <= $${paramIndex}::date`;
    params.push(options.endDate);
    paramIndex++;
  }

  const limit = options.limit ?? 30;
  query += ` ORDER BY completed_date DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await getDbPool().query<HabitLogRow>(query, params);
  return result.rows.map(mapHabitLog);
}

async function listHabitFollowUps(
  userId: number,
  options: ListHabitFollowUpsOptions
): Promise<HabitFollowUp[]> {
  let query = `SELECT hl.* FROM habit_logs hl
    INNER JOIN habits h ON h.id = hl.habit_id
    WHERE h.user_id = $1`;
  const params: (number | string | boolean)[] = [userId];
  let paramIndex = 2;

  if (options.habitId) {
    const habitId = parseHabitId(options.habitId);
    await getOwnedHabitOrThrow(habitId, userId);
    query += ` AND hl.habit_id = $${paramIndex}`;
    params.push(habitId);
    paramIndex++;
  }
  if (options.from) {
    query += ` AND hl.completed_date >= $${paramIndex}::date`;
    params.push(options.from);
    paramIndex++;
  }
  if (options.to) {
    query += ` AND hl.completed_date <= $${paramIndex}::date`;
    params.push(options.to);
    paramIndex++;
  }
  if (options.isArchived !== undefined) {
    query += ` AND hl.archived = $${paramIndex}`;
    params.push(options.isArchived);
    paramIndex++;
  }

  const limit = options.limit ?? 100;
  query += ` ORDER BY hl.completed_date DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await getDbPool().query<HabitLogRow>(query, params);
  return result.rows.map(mapHabitLog);
}

async function listHabitFollowUpsInDates(
  userId: number,
  from: string,
  to: string
): Promise<HabitFollowUpsDateGroup[]> {
  const followUps = await listHabitFollowUps(userId, {
    from,
    to,
    isArchived: false,
    limit: 500,
  });

  const byDate = new Map<string, HabitFollowUp[]>();
  for (const followUp of followUps) {
    const list = byDate.get(followUp.completedDate) ?? [];
    list.push(followUp);
    byDate.set(followUp.completedDate, list);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, followUps: items }));
}

async function getHabitMyDay(userId: number, date: string): Promise<HabitMyDayEntry[]> {
  const db = getDbPool();

  type HabitMyDayRow = HabitRow & {
    log_id: number | null;
    completed_date: Date | string | null;
    count: number | null;
    time: number | null;
    notes: string | null;
    story: string | null;
    archived: boolean | null;
    is_accomplished: boolean | null;
    is_failed: boolean | null;
    difficulty: number | null;
    is_lifeline: boolean | null;
    log_created_at: Date | null;
    log_updated_at: Date | null;
  };

  const result = await db.query<HabitMyDayRow>(
    `SELECT h.*,
            hl.id AS log_id, hl.completed_date, hl.count, hl.time,
            hl.notes, hl.story, hl.archived, hl.is_accomplished, hl.is_failed,
            hl.difficulty, hl.is_lifeline,
            hl.created_at AS log_created_at, hl.updated_at AS log_updated_at
     FROM habits h
     LEFT JOIN habit_logs hl
       ON hl.habit_id = h.id
       AND hl.completed_date = $2::date
       AND hl.archived = FALSE
       AND hl.is_lifeline = FALSE
     WHERE h.user_id = $1
       AND h.status = 'active'
     ORDER BY h.order_index ASC`,
    [userId, date]
  );

  return result.rows.map((row) => {
    const habit = mapHabit(row);
    const followUp =
      row.log_id != null
        ? mapHabitLog({
            id: row.log_id,
            habit_id: parseInt(habit.id, 10),
            user_id: row.user_id,
            completed_date: row.completed_date!,
            count: row.count ?? 0,
            time: row.time ?? 0,
            notes: row.notes ?? null,
            story: row.story ?? null,
            archived: row.archived ?? false,
            is_accomplished: row.is_accomplished ?? false,
            is_failed: row.is_failed ?? false,
            difficulty: row.difficulty ?? null,
            is_lifeline: row.is_lifeline ?? false,
            created_at: row.log_created_at!,
            updated_at: row.log_updated_at ?? row.log_created_at!,
          })
        : null;
    return { habit, followUp };
  });
}

async function getHabitStats(habitIdStr: string, userId: number): Promise<HabitStats> {
  const habitId = parseHabitId(habitIdStr);
  const habit = await getOwnedHabitOrThrow(habitId, userId);
  const db = getDbPool();

  const totalResult = await db.query<{ total: string; total_count: string | null }>(
    `SELECT COUNT(*)::text AS total, COALESCE(SUM(count), 0)::text AS total_count
     FROM habit_logs WHERE habit_id = $1 AND archived = FALSE`,
    [habitId]
  );

  const last30DaysResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM habit_logs
     WHERE habit_id = $1 AND archived = FALSE AND completed_date >= CURRENT_DATE - INTERVAL '30 days'`,
    [habitId]
  );

  return {
    totalCompletions: parseInt(totalResult.rows[0].total, 10),
    totalCount: parseInt(totalResult.rows[0].total_count ?? '0', 10),
    currentStreak: habit.streak ?? 0,
    last30Days: parseInt(last30DaysResult.rows[0].count, 10),
    streak: habit.streak ?? 0,
    maxStreak: habit.max_streak ?? 0,
  };
}

export const habitService = {
  createHabit,
  listHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  addHabitLog,
  updateHabitFollowUp,
  removeHabitFollowUp,
  listHabitLogs,
  listHabitFollowUps,
  listHabitFollowUpsInDates,
  getHabitMyDay,
  getHabitStats,
  syncHabitStreakFromLogs,
  calculateCurrentStreak,
};
