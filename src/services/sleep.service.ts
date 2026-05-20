import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateSleepLogInput,
  ListSleepLogsOptions,
  SleepLog,
  SleepLogCollection,
  SleepStats,
  SleepStatsOptions,
  UpdateSleepLogInput,
} from '../types/services/sleep.types';

type SleepLogRow = {
  id: number;
  user_id: number;
  sleep_date: Date;
  bedtime: Date;
  wake_time: Date;
  duration_minutes: number;
  quality: string | null;
  mood_on_waking: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

const SLEEP_LOG_RETURNING = `id, user_id, sleep_date, bedtime, wake_time, duration_minutes, quality, mood_on_waking, notes, created_at, updated_at`;

function formatDurationHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function calculateDurationMinutes(bedtime: Date | string, wakeTime: Date | string): number {
  const bedtimeDate = new Date(bedtime);
  const wakeTimeDate = new Date(wakeTime);
  const durationMinutes = Math.round(
    (wakeTimeDate.getTime() - bedtimeDate.getTime()) / (1000 * 60)
  );
  if (durationMinutes <= 0) {
    throw new BadRequestError('Wake time must be after bedtime');
  }
  return durationMinutes;
}

function mapSleepLog(row: SleepLogRow): SleepLog {
  return {
    id: String(row.id),
    userId: row.user_id,
    sleepDate: row.sleep_date,
    bedtime: row.bedtime,
    wakeTime: row.wake_time,
    durationMinutes: row.duration_minutes,
    durationHours: formatDurationHours(row.duration_minutes),
    quality: row.quality as SleepLog['quality'],
    moodOnWaking: row.mood_on_waking as SleepLog['moodOnWaking'],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSleepLogId(id: string): number {
  const sleepLogId = parseInt(id, 10);
  if (Number.isNaN(sleepLogId)) throw new NotFoundError('Sleep log not found');
  return sleepLogId;
}

function assertSleepLogOwnership(log: { user_id: number }, userId: number): void {
  if (log.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this sleep log');
  }
}

async function getSleepLogRowOrThrow(sleepLogId: number): Promise<SleepLogRow> {
  const db = getDbPool();
  const result = await db.query<SleepLogRow>('SELECT * FROM sleep_logs WHERE id = $1', [sleepLogId]);
  if (result.rows.length === 0) throw new NotFoundError('Sleep log not found');
  return result.rows[0];
}

async function getOwnedSleepLogOrThrow(sleepLogId: number, userId: number): Promise<SleepLogRow> {
  const row = await getSleepLogRowOrThrow(sleepLogId);
  assertSleepLogOwnership(row, userId);
  return row;
}

async function createSleepLog(userId: number, input: CreateSleepLogInput): Promise<SleepLog> {
  const durationMinutes = calculateDurationMinutes(input.bedtime, input.wakeTime);
  const db = getDbPool();
  const result = await db.query<SleepLogRow>(
    `INSERT INTO sleep_logs (user_id, sleep_date, bedtime, wake_time, duration_minutes, quality, mood_on_waking, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${SLEEP_LOG_RETURNING}`,
    [
      userId,
      input.sleepDate,
      input.bedtime,
      input.wakeTime,
      durationMinutes,
      input.quality ?? null,
      input.moodOnWaking ?? null,
      input.notes ?? null,
    ]
  );
  return mapSleepLog(result.rows[0]);
}

async function listSleepLogs(
  userId: number,
  options: ListSleepLogsOptions = {}
): Promise<SleepLogCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 30;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE user_id = $1';
  const params: (number | string)[] = [userId];
  let paramIndex = 2;

  if (options.startDate) {
    whereClause += ` AND sleep_date >= $${paramIndex}`;
    params.push(options.startDate as string);
    paramIndex++;
  }
  if (options.endDate) {
    whereClause += ` AND sleep_date <= $${paramIndex}`;
    params.push(options.endDate as string);
    paramIndex++;
  }
  if (options.quality) {
    whereClause += ` AND quality = $${paramIndex}`;
    params.push(options.quality);
    paramIndex++;
  }

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sleep_logs ${whereClause}`,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await db.query<SleepLogRow>(
    `SELECT * FROM sleep_logs ${whereClause}
     ORDER BY sleep_date DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  return {
    sleepLogs: result.rows.map(mapSleepLog),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getSleepLogById(id: string, userId: number): Promise<SleepLog> {
  const sleepLogId = parseSleepLogId(id);
  const row = await getOwnedSleepLogOrThrow(sleepLogId, userId);
  return mapSleepLog(row);
}

async function updateSleepLog(
  id: string,
  userId: number,
  input: UpdateSleepLogInput
): Promise<SleepLog> {
  const sleepLogId = parseSleepLogId(id);
  const existing = await getOwnedSleepLogOrThrow(sleepLogId, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.sleepDate !== undefined) {
    updates.push(`sleep_date = $${paramIndex}`);
    params.push(input.sleepDate);
    paramIndex++;
  }
  if (input.bedtime !== undefined) {
    updates.push(`bedtime = $${paramIndex}`);
    params.push(input.bedtime);
    paramIndex++;
  }
  if (input.wakeTime !== undefined) {
    updates.push(`wake_time = $${paramIndex}`);
    params.push(input.wakeTime);
    paramIndex++;
  }

  if (input.bedtime !== undefined || input.wakeTime !== undefined) {
    const newBedtime = input.bedtime ?? existing.bedtime;
    const newWakeTime = input.wakeTime ?? existing.wake_time;
    const durationMinutes = calculateDurationMinutes(newBedtime, newWakeTime);
    updates.push(`duration_minutes = $${paramIndex}`);
    params.push(durationMinutes);
    paramIndex++;
  }

  if (input.quality !== undefined) {
    updates.push(`quality = $${paramIndex}`);
    params.push(input.quality);
    paramIndex++;
  }
  if (input.moodOnWaking !== undefined) {
    updates.push(`mood_on_waking = $${paramIndex}`);
    params.push(input.moodOnWaking);
    paramIndex++;
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(input.notes);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(sleepLogId);
  const db = getDbPool();
  const result = await db.query<SleepLogRow>(
    `UPDATE sleep_logs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${SLEEP_LOG_RETURNING}`,
    params
  );
  return mapSleepLog(result.rows[0]);
}

async function deleteSleepLog(id: string, userId: number): Promise<boolean> {
  const sleepLogId = parseSleepLogId(id);
  await getOwnedSleepLogOrThrow(sleepLogId, userId);
  await getDbPool().query('DELETE FROM sleep_logs WHERE id = $1', [sleepLogId]);
  return true;
}

async function getSleepStats(userId: number, options: SleepStatsOptions = {}): Promise<SleepStats> {
  const db = getDbPool();
  let whereClause = 'WHERE user_id = $1';
  const params: (number | string)[] = [userId];
  let paramIndex = 2;

  if (options.startDate) {
    whereClause += ` AND sleep_date >= $${paramIndex}`;
    params.push(options.startDate as string);
    paramIndex++;
  }
  if (options.endDate) {
    whereClause += ` AND sleep_date <= $${paramIndex}`;
    params.push(options.endDate as string);
    paramIndex++;
  }

  const result = await db.query<{
    total_nights: string;
    avg_duration: string | null;
    min_duration: string | null;
    max_duration: string | null;
    poor_quality: string;
    fair_quality: string;
    good_quality: string;
    excellent_quality: string;
  }>(
    `SELECT
      COUNT(*)::text AS total_nights,
      AVG(duration_minutes)::text AS avg_duration,
      MIN(duration_minutes)::text AS min_duration,
      MAX(duration_minutes)::text AS max_duration,
      COUNT(CASE WHEN quality = 'poor' THEN 1 END)::text AS poor_quality,
      COUNT(CASE WHEN quality = 'fair' THEN 1 END)::text AS fair_quality,
      COUNT(CASE WHEN quality = 'good' THEN 1 END)::text AS good_quality,
      COUNT(CASE WHEN quality = 'excellent' THEN 1 END)::text AS excellent_quality
     FROM sleep_logs ${whereClause}`,
    params
  );

  const stats = result.rows[0];
  const avgDuration = parseFloat(stats.avg_duration ?? '0') || 0;
  const minDuration = parseInt(stats.min_duration ?? '0', 10) || 0;
  const maxDuration = parseInt(stats.max_duration ?? '0', 10) || 0;

  return {
    totalNights: parseInt(stats.total_nights, 10),
    avgDurationMinutes: Math.round(avgDuration),
    avgDurationHours: formatDurationHours(avgDuration),
    minDurationMinutes: minDuration,
    minDurationHours: formatDurationHours(minDuration),
    maxDurationMinutes: maxDuration,
    maxDurationHours: formatDurationHours(maxDuration),
    qualityDistribution: {
      poor: parseInt(stats.poor_quality, 10),
      fair: parseInt(stats.fair_quality, 10),
      good: parseInt(stats.good_quality, 10),
      excellent: parseInt(stats.excellent_quality, 10),
    },
    period: {
      startDate: options.startDate ? new Date(options.startDate) : null,
      endDate: options.endDate ? new Date(options.endDate) : null,
    },
  };
}

export const sleepService = {
  createSleepLog,
  listSleepLogs,
  getSleepLogById,
  updateSleepLog,
  deleteSleepLog,
  getSleepStats,
};
