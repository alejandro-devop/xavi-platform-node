import { getDbPool } from '../shared/database/pool';
import { ConflictError, ForbiddenError, NotFoundError } from '../shared/errors';
import { habitCategoryService } from './habit-category.service';
import { habitMeasureService } from './habit-measure.service';
import { activityService } from './activity.service';
import { applyFailedStreak, isFollowUpGoalMet, recalculateStreakFromDates } from './habit-streak';
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
  created_at: Date;
  updated_at: Date;
};

const HABIT_RETURNING = `id, user_id, name, description, frequency, target_count, icon, color, is_active,
  order_index, start_date, end_date, should_avoid, should_keep, is_counter, is_timer,
  is_incremental, is_decremental, days, streak, max_streak, daily_goal, timer_goal, times_goal,
  step, category_id, measure_id, activity_id, created_at, updated_at`;

const LOG_RETURNING = `id, habit_id, user_id, completed_date, count, time, notes, story, archived,
  is_accomplished, is_failed, created_at, updated_at`;

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

/** Recalculates streak/maxStreak/days from non-archived accomplished logs (Phase 3). */
export async function syncHabitStreakFromLogs(habitId: number): Promise<void> {
  const db = getDbPool();
  const logs = await db.query<{ completed_date: Date }>(
    `SELECT completed_date FROM habit_logs
     WHERE habit_id = $1 AND archived = FALSE AND is_accomplished = TRUE
     ORDER BY completed_date DESC`,
    [habitId]
  );
  const dates = logs.rows.map((r) => formatDate(r.completed_date)!);
  const { streak, max_streak } = recalculateStreakFromDates(dates);

  const daysResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM habit_logs
     WHERE habit_id = $1 AND archived = FALSE`,
    [habitId]
  );
  const days = parseInt(daysResult.rows[0].count, 10);

  await db.query(
    `UPDATE habits SET streak = $1, max_streak = GREATEST(max_streak, $2), days = $3 WHERE id = $4`,
    [streak, max_streak, days, habitId]
  );
}

async function applyStreakAfterFollowUp(
  habit: HabitRow,
  date: string,
  isAccomplished: boolean,
  isFailed: boolean
): Promise<void> {
  const db = getDbPool();

  if (isFailed) {
    const failed = applyFailedStreak(habit, date);
    await db.query(
      `UPDATE habit_logs SET archived = TRUE
       WHERE habit_id = $1 AND completed_date <= $2::date AND archived = FALSE`,
      [habit.id, date]
    );
    await db.query(`UPDATE habits SET streak = $1, end_date = $2::date WHERE id = $3`, [
      failed.streak,
      failed.end_date,
      habit.id,
    ]);
    return;
  }

  if (isAccomplished) {
    await syncHabitStreakFromLogs(habit.id);
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

async function addHabitLog(
  habitIdStr: string,
  userId: number,
  input: AddHabitLogInput
): Promise<HabitLog> {
  const habitId = parseHabitId(habitIdStr);
  const habit = await getOwnedHabitOrThrow(habitId, userId);
  const date = input.completedDate ?? new Date().toISOString().split('T')[0];
  const count = input.count ?? 1;
  const time = input.time ?? 0;
  const db = getDbPool();

  const existing = await db.query<HabitLogRow>(
    `SELECT * FROM habit_logs WHERE habit_id = $1 AND completed_date = $2::date`,
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
      `UPDATE habit_logs SET count = $1, time = $2, notes = COALESCE($3, notes), story = COALESCE($4, story),
        is_accomplished = $5, is_failed = $6, updated_at = NOW()
       WHERE id = $7 RETURNING ${LOG_RETURNING}`,
      [
        mergedCount,
        mergedTime,
        input.notes ?? null,
        input.story ?? null,
        accomplished,
        isFailed,
        existing.rows[0].id,
      ]
    );
    logRow = updateResult.rows[0];
    await applyStreakAfterFollowUp(habit, date, accomplished, isFailed);
  } else {
    const insertResult = await db.query<HabitLogRow>(
      `INSERT INTO habit_logs (habit_id, user_id, completed_date, count, time, notes, story, is_accomplished, is_failed)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9)
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
      ]
    );
    logRow = insertResult.rows[0];
    await applyStreakAfterFollowUp(habit, date, isAccomplished, isFailed);
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
    `UPDATE habit_logs SET
      count = $1, time = $2, notes = COALESCE($3, notes), story = COALESCE($4, story),
      is_accomplished = $5, is_failed = $6, archived = COALESCE($7, archived), updated_at = NOW()
     WHERE id = $8 RETURNING ${LOG_RETURNING}`,
    [
      count,
      time,
      input.notes,
      input.story,
      isAccomplished,
      isFailed,
      input.archived,
      id,
    ]
  );

  const date = formatDate(log.completed_date)!;
  await applyStreakAfterFollowUp(habit, date, isAccomplished, isFailed);

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
  const { habits } = await listHabits(userId, { isActive: true, limit: 200 });
  const db = getDbPool();

  const entries: HabitMyDayEntry[] = [];
  for (const habit of habits) {
    const result = await db.query<HabitLogRow>(
      `SELECT * FROM habit_logs WHERE habit_id = $1 AND completed_date = $2::date AND archived = FALSE LIMIT 1`,
      [parseInt(habit.id, 10), date]
    );
    entries.push({
      habit,
      followUp: result.rows.length > 0 ? mapHabitLog(result.rows[0]) : null,
    });
  }
  return entries;
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
