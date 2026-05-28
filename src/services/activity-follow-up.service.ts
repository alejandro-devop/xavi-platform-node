import { getDbPool } from '../shared/database/pool';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import {
  computeActivityFollowUpEnd,
  formatStartTimeForApi,
} from '../shared/utils/activity-follow-up-time';
import type {
  ActivityFollowUp,
  ActivityFollowUpsDateGroup,
  CreateActivityFollowUpInput,
  ListActivityFollowUpsOptions,
  UpdateActivityFollowUpInput,
} from '../types/services/activity-follow-up.types';
import { activityService } from './activity.service';

type FollowUpRow = {
  id: number;
  user_id: number;
  activity_id: number;
  date: Date | string;
  start_time: string | Date;
  duration_minutes: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function formatDateForApi(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function mapFollowUp(row: FollowUpRow): ActivityFollowUp {
  const date = formatDateForApi(row.date);
  const startTime = formatStartTimeForApi(row.start_time);
  const end = computeActivityFollowUpEnd(date, startTime, row.duration_minutes);
  return {
    id: String(row.id),
    activityId: String(row.activity_id),
    userId: row.user_id,
    date,
    startTime,
    durationMinutes: row.duration_minutes,
    endTime: end.endTime,
    endDate: end.endDate,
    endDateTime: end.endDateTime,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseFollowUpId(id: string | number): number {
  const followUpId = typeof id === 'number' ? id : parseInt(id, 10);
  if (Number.isNaN(followUpId)) {
    throw new NotFoundError('Activity follow-up not found');
  }
  return followUpId;
}

async function getFollowUpRowOrThrow(followUpId: number): Promise<FollowUpRow> {
  const db = getDbPool();
  const result = await db.query<FollowUpRow>(
    'SELECT * FROM activity_follow_ups WHERE id = $1',
    [followUpId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Activity follow-up not found');
  }
  return result.rows[0];
}

async function getOwnedFollowUpOrThrow(
  followUpId: number,
  userId: number
): Promise<FollowUpRow> {
  const row = await getFollowUpRowOrThrow(followUpId);
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this activity follow-up');
  }
  return row;
}

async function sumSpentTimeMinutes(activityId: number): Promise<number> {
  const db = getDbPool();
  const result = await db.query<{ total: string }>(
    `SELECT COALESCE(SUM(duration_minutes), 0)::text AS total
     FROM activity_follow_ups WHERE activity_id = $1`,
    [activityId]
  );
  return parseInt(result.rows[0].total, 10);
}

async function createFollowUp(
  userId: number,
  input: CreateActivityFollowUpInput
): Promise<ActivityFollowUp> {
  const activityId = activityService.parseActivityId(input.activityId);
  await activityService.getActivityById(String(activityId), userId);

  const db = getDbPool();
  const result = await db.query<FollowUpRow>(
    `INSERT INTO activity_follow_ups (user_id, activity_id, date, start_time, duration_minutes, notes)
     VALUES ($1, $2, $3::date, $4::time, $5, $6)
     RETURNING *`,
    [userId, activityId, input.date, input.startTime, input.durationMinutes, input.notes ?? null]
  );
  return mapFollowUp(result.rows[0]);
}

async function updateFollowUp(
  id: string,
  userId: number,
  input: UpdateActivityFollowUpInput
): Promise<ActivityFollowUp> {
  const followUpId = parseFollowUpId(id);
  const existing = await getOwnedFollowUpOrThrow(followUpId, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.date !== undefined) {
    updates.push(`date = $${i++}::date`);
    params.push(input.date);
  }
  if (input.startTime !== undefined) {
    updates.push(`start_time = $${i++}::time`);
    params.push(input.startTime);
  }
  if (input.durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${i++}`);
    params.push(input.durationMinutes);
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${i++}`);
    params.push(input.notes);
  }

  if (updates.length === 0) {
    return mapFollowUp(existing);
  }

  params.push(followUpId);
  const db = getDbPool();
  const result = await db.query<FollowUpRow>(
    `UPDATE activity_follow_ups SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return mapFollowUp(result.rows[0]);
}

async function deleteFollowUp(id: string, userId: number): Promise<boolean> {
  const followUpId = parseFollowUpId(id);
  await getOwnedFollowUpOrThrow(followUpId, userId);
  await getDbPool().query('DELETE FROM activity_follow_ups WHERE id = $1', [followUpId]);
  return true;
}

async function getFollowUpById(id: string, userId: number): Promise<ActivityFollowUp> {
  const followUpId = parseFollowUpId(id);
  const row = await getOwnedFollowUpOrThrow(followUpId, userId);
  return mapFollowUp(row);
}

async function listFollowUps(
  userId: number,
  options: ListActivityFollowUpsOptions = {}
): Promise<ActivityFollowUp[]> {
  let query = `SELECT af.* FROM activity_follow_ups af
    INNER JOIN activities a ON a.id = af.activity_id
    WHERE a.user_id = $1`;
  const params: (number | string)[] = [userId];
  let paramIndex = 2;

  if (options.activityId) {
    const activityId = activityService.parseActivityId(options.activityId);
    await activityService.getActivityById(String(activityId), userId);
    query += ` AND af.activity_id = $${paramIndex}`;
    params.push(activityId);
    paramIndex++;
  }
  if (options.from) {
    query += ` AND af.date >= $${paramIndex}::date`;
    params.push(options.from);
    paramIndex++;
  }
  if (options.to) {
    query += ` AND af.date <= $${paramIndex}::date`;
    params.push(options.to);
    paramIndex++;
  }

  const limit = options.limit ?? 100;
  query += ` ORDER BY af.date DESC, af.start_time DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await getDbPool().query<FollowUpRow>(query, params);
  return result.rows.map(mapFollowUp);
}

async function listFollowUpsInDates(
  userId: number,
  from: string,
  to: string
): Promise<ActivityFollowUpsDateGroup[]> {
  const followUps = await listFollowUps(userId, { from, to, limit: 500 });
  const byDate = new Map<string, ActivityFollowUp[]>();
  for (const followUp of followUps) {
    const list = byDate.get(followUp.date) ?? [];
    list.push(followUp);
    byDate.set(followUp.date, list);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, followUps: items }));
}

async function listDayFollowUps(userId: number, date: string): Promise<ActivityFollowUp[]> {
  return listFollowUps(userId, { from: date, to: date, limit: 200 });
}

export const activityFollowUpService = {
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getFollowUpById,
  listFollowUps,
  listFollowUpsInDates,
  listDayFollowUps,
  sumSpentTimeMinutes,
  parseFollowUpId,
};
