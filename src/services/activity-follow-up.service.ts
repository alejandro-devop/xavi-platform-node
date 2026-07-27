import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import { isUuidV7 } from '../shared/database/uuid';
import {
  computeActivityFollowUpEnd,
  formatStartTimeForApi,
} from '../shared/utils/activity-follow-up-time';
import type { ActivitySubtasksCount } from '../types/services/activity.types';
import type {
  ActivityFollowUp,
  ActivityFollowUpSubtask,
  ActivityFollowUpsDateGroup,
  CreateActivityFollowUpInput,
  ListActivityFollowUpsOptions,
  StartActivityFollowUpInput,
  UpdateActivityFollowUpInput,
  UpdateActivityFollowUpSubtaskInput,
  AddActivityFollowUpSubtaskInput,
} from '../types/services/activity-follow-up.types';
import { activityService } from './activity.service';
import { todoService } from './todo.service';

type FollowUpRow = {
  id: number;
  user_id: number;
  activity_id: number;
  date: Date | string;
  start_time: string | Date;
  duration_minutes: number | null;
  notes: string | null;
  linked_todo_id: number | null;
  created_at: Date;
  updated_at: Date;
};

type FollowUpSubtaskRow = {
  id: number;
  follow_up_id: number;
  activity_subtask_id: number | null;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

const CLOSED_FOLLOW_UP_FILTER = 'af.duration_minutes IS NOT NULL';
const SESSION_SUBTASK_RETURNING =
  'id, follow_up_id, activity_subtask_id, title, is_completed, order_index, created_at, updated_at';

function formatDateForApi(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function mapFollowUp(row: FollowUpRow): ActivityFollowUp {
  const date = formatDateForApi(row.date);
  const startTime = formatStartTimeForApi(row.start_time);
  const isOpen = row.duration_minutes === null;

  if (isOpen) {
    return {
      id: String(row.id),
      activityId: String(row.activity_id),
      userId: row.user_id,
      date,
      startTime,
      durationMinutes: null,
      isOpen: true,
      endTime: null,
      endDate: null,
      endDateTime: null,
      notes: row.notes,
      linkedTodoId: row.linked_todo_id !== null ? String(row.linked_todo_id) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const end = computeActivityFollowUpEnd(date, startTime, row.duration_minutes!);
  return {
    id: String(row.id),
    activityId: String(row.activity_id),
    userId: row.user_id,
    date,
    startTime,
    durationMinutes: row.duration_minutes,
    isOpen: false,
    endTime: end.endTime,
    endDate: end.endDate,
    endDateTime: end.endDateTime,
    notes: row.notes,
    linkedTodoId: row.linked_todo_id !== null ? String(row.linked_todo_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSessionSubtask(row: FollowUpSubtaskRow): ActivityFollowUpSubtask {
  return {
    id: String(row.id),
    followUpId: String(row.follow_up_id),
    activitySubtaskId:
      row.activity_subtask_id !== null ? String(row.activity_subtask_id) : null,
    title: row.title,
    isCompleted: row.is_completed,
    orderIndex: row.order_index,
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

function parseSessionSubtaskId(id: string | number): number {
  const sessionSubtaskId = typeof id === 'number' ? id : parseInt(id, 10);
  if (Number.isNaN(sessionSubtaskId)) {
    throw new NotFoundError('Session subtask not found');
  }
  return sessionSubtaskId;
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

async function assertNoOpenFollowUp(userId: number): Promise<void> {
  const db = getDbPool();
  const result = await db.query<{ id: number }>(
    `SELECT id FROM activity_follow_ups
     WHERE user_id = $1 AND duration_minutes IS NULL
     LIMIT 1`,
    [userId]
  );
  if (result.rows.length > 0) {
    throw new BadRequestError(
      'You already have an activity in progress. Finish or cancel it before starting another.'
    );
  }
}

async function validateLinkedTodo(
  linkedTodoId: string | null | undefined,
  userId: number
): Promise<void> {
  if (linkedTodoId === undefined || linkedTodoId === null) {
    return;
  }
  await todoService.getTodoById(linkedTodoId, userId);
}

async function sumSpentTimeMinutes(activityId: number): Promise<number> {
  const db = getDbPool();
  const result = await db.query<{ total: string }>(
    `SELECT COALESCE(SUM(duration_minutes), 0)::text AS total
     FROM activity_follow_ups WHERE activity_id = $1 AND duration_minutes IS NOT NULL`,
    [activityId]
  );
  return parseInt(result.rows[0].total, 10);
}

async function listSessionSubtasks(followUpId: number): Promise<ActivityFollowUpSubtask[]> {
  const db = getDbPool();
  const result = await db.query<FollowUpSubtaskRow>(
    `SELECT ${SESSION_SUBTASK_RETURNING}
     FROM activity_follow_up_subtasks
     WHERE follow_up_id = $1
     ORDER BY order_index ASC, created_at ASC`,
    [followUpId]
  );
  return result.rows.map(mapSessionSubtask);
}

function countSessionSubtasks(subtasks: ActivityFollowUpSubtask[]): ActivitySubtasksCount {
  return {
    total: subtasks.length,
    completed: subtasks.filter((s) => s.isCompleted).length,
  };
}

async function attachSelectedSubtasks(
  followUpId: number,
  activityId: number,
  subtaskIds: string[] | undefined
): Promise<void> {
  if (!subtaskIds || subtaskIds.length === 0) {
    return;
  }

  const uniqueIds = [...new Set(subtaskIds.map((id) => parseInt(id, 10)))];
  if (uniqueIds.some((id) => Number.isNaN(id))) {
    throw new BadRequestError('Invalid subtask ID');
  }

  const db = getDbPool();
  const result = await db.query<{
    id: number;
    title: string;
    order_index: number;
  }>(
    `SELECT id, title, order_index
     FROM activity_subtasks
     WHERE activity_id = $1 AND id = ANY($2::int[])
     ORDER BY order_index ASC, created_at ASC`,
    [activityId, uniqueIds]
  );

  if (result.rows.length !== uniqueIds.length) {
    throw new BadRequestError('One or more subtasks do not belong to this activity');
  }

  for (const row of result.rows) {
    await db.query(
      `INSERT INTO activity_follow_up_subtasks (
         follow_up_id, activity_subtask_id, title, is_completed, order_index
       ) VALUES ($1, $2, $3, FALSE, $4)`,
      [followUpId, row.id, row.title, row.order_index]
    );
  }
}

async function createFollowUp(
  userId: number,
  input: CreateActivityFollowUpInput
): Promise<ActivityFollowUp> {
  const clientId = input.clientId ?? null;
  if (clientId != null) {
    if (!isUuidV7(clientId)) {
      throw new BadRequestError('clientId must be a UUID v7');
    }
    const existing = await findByClientId(userId, clientId);
    if (existing) return existing;
  }

  const activityId = activityService.parseActivityId(input.activityId);
  await activityService.getActivityById(String(activityId), userId);

  const db = getDbPool();
  const result = await db.query<FollowUpRow>(
    `INSERT INTO activity_follow_ups (user_id, activity_id, date, start_time, duration_minutes, notes, client_id)
     VALUES ($1, $2, $3::date, $4::time, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      activityId,
      input.date,
      input.startTime,
      input.durationMinutes,
      input.notes ?? null,
      clientId,
    ]
  );
  return mapFollowUp(result.rows[0]);
}

async function startFollowUp(
  userId: number,
  input: StartActivityFollowUpInput
): Promise<ActivityFollowUp> {
  const clientId = input.clientId ?? null;
  if (clientId != null) {
    if (!isUuidV7(clientId)) {
      throw new BadRequestError('clientId must be a UUID v7');
    }
    const existing = await findByClientId(userId, clientId);
    if (existing) return existing;
  }

  await assertNoOpenFollowUp(userId);
  await validateLinkedTodo(input.linkedTodoId, userId);

  const activityId = activityService.parseActivityId(input.activityId);
  await activityService.getActivityById(String(activityId), userId);

  const linkedTodoId =
    input.linkedTodoId !== undefined && input.linkedTodoId !== null
      ? parseInt(input.linkedTodoId, 10)
      : null;

  const db = getDbPool();
  const result = await db.query<FollowUpRow>(
    `INSERT INTO activity_follow_ups (
       user_id, activity_id, date, start_time, duration_minutes, notes, linked_todo_id, client_id
     )
     VALUES ($1, $2, $3::date, $4::time, NULL, $5, $6, $7)
     RETURNING *`,
    [userId, activityId, input.date, input.startTime, input.notes ?? null, linkedTodoId, clientId]
  );

  const followUp = mapFollowUp(result.rows[0]);
  await attachSelectedSubtasks(result.rows[0].id, activityId, input.subtaskIds);
  return followUp;
}

async function findByClientId(userId: number, clientId: string): Promise<ActivityFollowUp | null> {
  const db = getDbPool();
  const result = await db.query<FollowUpRow>(
    `SELECT * FROM activity_follow_ups WHERE client_id = $1 AND user_id = $2`,
    [clientId, userId]
  );
  if (result.rows.length === 0) return null;
  return mapFollowUp(result.rows[0]);
}

async function getOpenFollowUp(userId: number): Promise<ActivityFollowUp | null> {
  const db = getDbPool();
  const result = await db.query<FollowUpRow>(
    `SELECT * FROM activity_follow_ups
     WHERE user_id = $1 AND duration_minutes IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) {
    return null;
  }
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
    if (input.durationMinutes < 1) {
      throw new BadRequestError('Duration must be at least 1 minute');
    }
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

async function updateSessionSubtask(
  followUpIdStr: string,
  sessionSubtaskIdStr: string,
  userId: number,
  input: UpdateActivityFollowUpSubtaskInput
): Promise<ActivityFollowUpSubtask> {
  const followUpId = parseFollowUpId(followUpIdStr);
  await getOwnedFollowUpOrThrow(followUpId, userId);

  const sessionSubtaskId = parseSessionSubtaskId(sessionSubtaskIdStr);
  const db = getDbPool();
  const result = await db.query<FollowUpSubtaskRow>(
    `UPDATE activity_follow_up_subtasks
     SET is_completed = $1
     WHERE id = $2 AND follow_up_id = $3
     RETURNING ${SESSION_SUBTASK_RETURNING}`,
    [input.isCompleted, sessionSubtaskId, followUpId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Session subtask not found');
  }
  return mapSessionSubtask(result.rows[0]);
}

/**
 * Añade una subtarea a un follow-up abierto.
 * Persiste en `activity_subtasks` (reutiliza si el título ya existe) y la adjunta a la sesión.
 */
async function addSessionSubtask(
  userId: number,
  input: AddActivityFollowUpSubtaskInput
): Promise<ActivityFollowUpSubtask> {
  const title = input.title.trim();
  if (!title) {
    throw new BadRequestError('Title is required');
  }

  const followUpId = parseFollowUpId(input.followUpId);
  const followUp = await getOwnedFollowUpOrThrow(followUpId, userId);
  if (followUp.duration_minutes !== null) {
    throw new BadRequestError('Cannot add subtasks to a closed follow-up');
  }

  const db = getDbPool();
  const activityId = followUp.activity_id;

  const sessionDup = await db.query<{ id: number }>(
    `SELECT id FROM activity_follow_up_subtasks
     WHERE follow_up_id = $1 AND lower(btrim(title)) = lower(btrim($2::text))
     LIMIT 1`,
    [followUpId, title]
  );
  if (sessionDup.rows.length > 0) {
    throw new BadRequestError('Session already has a subtask with this title');
  }

  const existingTemplate = await db.query<{
    id: number;
    title: string;
    order_index: number;
  }>(
    `SELECT id, title, order_index FROM activity_subtasks
     WHERE activity_id = $1 AND lower(btrim(title)) = lower(btrim($2::text))
     LIMIT 1`,
    [activityId, title]
  );

  let activitySubtaskId: number;
  let displayTitle: string;

  if (existingTemplate.rows.length > 0) {
    activitySubtaskId = existingTemplate.rows[0].id;
    displayTitle = existingTemplate.rows[0].title;
  } else {
    const maxTemplate = await db.query<{ max: string | null }>(
      `SELECT MAX(order_index)::text AS max FROM activity_subtasks WHERE activity_id = $1`,
      [activityId]
    );
    const nextTemplateOrder =
      (maxTemplate.rows[0]?.max != null ? parseInt(maxTemplate.rows[0].max, 10) : -1) + 1;
    const created = await db.query<{ id: number; title: string }>(
      `INSERT INTO activity_subtasks (activity_id, title, order_index)
       VALUES ($1, $2, $3)
       RETURNING id, title`,
      [activityId, title, nextTemplateOrder]
    );
    activitySubtaskId = created.rows[0].id;
    displayTitle = created.rows[0].title;
  }

  const maxSession = await db.query<{ max: string | null }>(
    `SELECT MAX(order_index)::text AS max FROM activity_follow_up_subtasks WHERE follow_up_id = $1`,
    [followUpId]
  );
  const orderIndex =
    (maxSession.rows[0]?.max != null ? parseInt(maxSession.rows[0].max, 10) : -1) + 1;

  const inserted = await db.query<FollowUpSubtaskRow>(
    `INSERT INTO activity_follow_up_subtasks (
       follow_up_id, activity_subtask_id, title, is_completed, order_index
     ) VALUES ($1, $2, $3, FALSE, $4)
     RETURNING ${SESSION_SUBTASK_RETURNING}`,
    [followUpId, activitySubtaskId, displayTitle, orderIndex]
  );

  return mapSessionSubtask(inserted.rows[0]);
}

async function listFollowUps(
  userId: number,
  options: ListActivityFollowUpsOptions = {}
): Promise<ActivityFollowUp[]> {
  let query = `SELECT af.* FROM activity_follow_ups af
    INNER JOIN activities a ON a.id = af.activity_id
    WHERE a.user_id = $1 AND ${CLOSED_FOLLOW_UP_FILTER}`;
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
  startFollowUp,
  getOpenFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getFollowUpById,
  listFollowUps,
  listFollowUpsInDates,
  listDayFollowUps,
  listSessionSubtasks,
  countSessionSubtasks,
  updateSessionSubtask,
  addSessionSubtask,
  sumSpentTimeMinutes,
  parseFollowUpId,
};
