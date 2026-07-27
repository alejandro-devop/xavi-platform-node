import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  Activity,
  ActivityCollection,
  ActivitySubtask,
  ActivitySubtasksCount,
  CreateActivityInput,
  CreateActivitySubtaskInput,
  ListActivitiesOptions,
  UpdateActivityInput,
  UpdateActivitySubtaskInput,
} from '../types/services/activity.types';
import { activityCategoryService } from './activity-category.service';
import { activityTodoFoldersService } from './activity-todo-folders.service';

type ActivityRow = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category_id: string | null;
  scheduled_date: Date | null;
  completed_at: Date | null;
  is_workout?: boolean;
  created_at: Date;
  updated_at: Date;
};

type ActivitySubtaskRow = {
  id: number;
  activity_id: number;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

const ACTIVITY_RETURNING = `id, user_id, title, description, status, priority, category_id, scheduled_date, completed_at, is_workout, created_at, updated_at`;
const ACTIVITY_SUBTASK_RETURNING = `id, activity_id, title, is_completed, order_index, created_at, updated_at`;

function mapActivity(row: ActivityRow): Activity {
  return {
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status as Activity['status'],
    priority: row.priority as Activity['priority'],
    categoryId: row.category_id,
    scheduledDate: row.scheduled_date,
    completedAt: row.completed_at,
    isWorkout: Boolean(row.is_workout),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubtask(row: ActivitySubtaskRow): ActivitySubtask {
  return {
    id: String(row.id),
    activityId: String(row.activity_id),
    title: row.title,
    isCompleted: row.is_completed,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSubtaskId(id: string): number {
  const subtaskId = parseInt(id, 10);
  if (Number.isNaN(subtaskId)) throw new NotFoundError('Subtask not found');
  return subtaskId;
}

async function resolveCategoryId(
  userId: number,
  categoryId: string | null | undefined
): Promise<string | null> {
  if (categoryId === undefined || categoryId === null) {
    return null;
  }
  await activityCategoryService.getCategoryById(categoryId, userId);
  return categoryId;
}

export function parseActivityId(id: string | number): number {
  const activityId = typeof id === 'number' ? id : parseInt(id, 10);
  if (Number.isNaN(activityId)) {
    throw new NotFoundError('Activity not found');
  }
  return activityId;
}

function assertActivityOwnership(activity: { user_id: number }, userId: number): void {
  if (activity.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this activity');
  }
}

async function getActivityRowOrThrow(activityId: number): Promise<ActivityRow> {
  const db = getDbPool();
  const result = await db.query<ActivityRow>('SELECT * FROM activities WHERE id = $1', [
    activityId,
  ]);
  if (result.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }
  return result.rows[0];
}

async function getOwnedActivityOrThrow(activityId: number, userId: number): Promise<ActivityRow> {
  const row = await getActivityRowOrThrow(activityId);
  assertActivityOwnership(row, userId);
  return row;
}

async function createActivity(userId: number, input: CreateActivityInput): Promise<Activity> {
  const categoryId = await resolveCategoryId(userId, input.categoryId);
  const db = getDbPool();
  const result = await db.query<ActivityRow>(
    `INSERT INTO activities (user_id, title, description, status, priority, category_id, scheduled_date, is_workout)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${ACTIVITY_RETURNING}`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.status ?? 'pending',
      input.priority ?? 'medium',
      categoryId,
      input.scheduledDate ?? null,
      input.isWorkout ?? false,
    ]
  );
  const activity = mapActivity(result.rows[0]);
  if (input.todoFolderIds !== undefined) {
    await activityTodoFoldersService.syncFolders(
      parseActivityId(activity.id),
      userId,
      input.todoFolderIds
    );
  }
  return activity;
}

async function listActivities(
  userId: number,
  options: ListActivitiesOptions = {}
): Promise<ActivityCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE user_id = $1';
  const params: (number | string)[] = [userId];
  let paramIndex = 2;

  if (options.status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(options.status);
    paramIndex++;
  }
  if (options.priority) {
    whereClause += ` AND priority = $${paramIndex}`;
    params.push(options.priority);
    paramIndex++;
  }
  if (options.categoryId) {
    whereClause += ` AND category_id = $${paramIndex}`;
    params.push(options.categoryId);
    paramIndex++;
  }
  if (options.startDate) {
    whereClause += ` AND scheduled_date >= $${paramIndex}`;
    params.push(options.startDate as string);
    paramIndex++;
  }
  if (options.endDate) {
    whereClause += ` AND scheduled_date <= $${paramIndex}`;
    params.push(options.endDate as string);
    paramIndex++;
  }

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM activities ${whereClause}`,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await db.query<ActivityRow>(
    `SELECT * FROM activities ${whereClause}
     ORDER BY scheduled_date DESC NULLS LAST, created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  return {
    activities: result.rows.map(mapActivity),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getActivityById(id: string, userId: number): Promise<Activity> {
  const activityId = parseActivityId(id);
  const row = await getOwnedActivityOrThrow(activityId, userId);
  return mapActivity(row);
}

async function updateActivity(
  id: string,
  userId: number,
  input: UpdateActivityInput
): Promise<Activity> {
  const activityId = parseActivityId(id);
  await getOwnedActivityOrThrow(activityId, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(input.title);
    paramIndex++;
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(input.description);
    paramIndex++;
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(input.status);
    paramIndex++;
  }
  if (input.priority !== undefined) {
    updates.push(`priority = $${paramIndex}`);
    params.push(input.priority);
    paramIndex++;
  }
  if (input.scheduledDate !== undefined) {
    updates.push(`scheduled_date = $${paramIndex}`);
    params.push(input.scheduledDate);
    paramIndex++;
  }
  if (input.categoryId !== undefined) {
    const categoryId = await resolveCategoryId(userId, input.categoryId);
    updates.push(`category_id = $${paramIndex}`);
    params.push(categoryId);
    paramIndex++;
  }
  if (input.isWorkout !== undefined) {
    updates.push(`is_workout = $${paramIndex}`);
    params.push(input.isWorkout);
    paramIndex++;
  }

  const db = getDbPool();

  if (
    updates.length === 0 &&
    input.todoFolderIds === undefined &&
    input.workoutExerciseIds === undefined
  ) {
    return mapActivity(await getActivityRowOrThrow(activityId));
  }

  let activity: Activity;
  if (updates.length === 0) {
    activity = mapActivity(await getActivityRowOrThrow(activityId));
  } else {
    params.push(activityId);
    const result = await db.query<ActivityRow>(
      `UPDATE activities SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${ACTIVITY_RETURNING}`,
      params
    );
    activity = mapActivity(result.rows[0]);
  }

  if (input.todoFolderIds !== undefined) {
    await activityTodoFoldersService.syncFolders(activityId, userId, input.todoFolderIds);
  }

  return activity;
}

async function deleteActivity(id: string, userId: number): Promise<boolean> {
  const activityId = parseActivityId(id);
  await getOwnedActivityOrThrow(activityId, userId);
  await getDbPool().query('DELETE FROM activities WHERE id = $1', [activityId]);
  return true;
}

async function completeActivity(id: string, userId: number): Promise<Activity> {
  const activityId = parseActivityId(id);
  await getOwnedActivityOrThrow(activityId, userId);

  const db = getDbPool();
  const result = await db.query<ActivityRow>(
    `UPDATE activities SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING ${ACTIVITY_RETURNING}`,
    [activityId]
  );
  return mapActivity(result.rows[0]);
}

async function listSubtasksForActivity(activityId: number): Promise<ActivitySubtask[]> {
  const db = getDbPool();
  const result = await db.query<ActivitySubtaskRow>(
    `SELECT * FROM activity_subtasks WHERE activity_id = $1 ORDER BY order_index ASC, created_at ASC`,
    [activityId]
  );
  return result.rows.map(mapSubtask);
}

async function loadSubtasksCounts(
  activityIds: number[]
): Promise<Map<number, ActivitySubtasksCount>> {
  const map = new Map<number, ActivitySubtasksCount>();
  if (activityIds.length === 0) return map;

  const db = getDbPool();
  const result = await db.query<{ activity_id: number; total: string; completed: string }>(
    `SELECT activity_id, COUNT(*)::text AS total,
      COALESCE(SUM(CASE WHEN is_completed THEN 1 ELSE 0 END), 0)::text AS completed
     FROM activity_subtasks WHERE activity_id = ANY($1) GROUP BY activity_id`,
    [activityIds]
  );

  for (const row of result.rows) {
    map.set(row.activity_id, {
      total: parseInt(row.total, 10),
      completed: parseInt(row.completed, 10),
    });
  }
  return map;
}

async function createSubtask(
  userId: number,
  input: CreateActivitySubtaskInput
): Promise<ActivitySubtask> {
  const activityId = parseActivityId(input.activityId);
  await getOwnedActivityOrThrow(activityId, userId);

  const db = getDbPool();
  const result = await db.query<ActivitySubtaskRow>(
    `INSERT INTO activity_subtasks (activity_id, title, order_index)
     VALUES ($1, $2, $3) RETURNING ${ACTIVITY_SUBTASK_RETURNING}`,
    [activityId, input.title, input.orderIndex ?? 0]
  );
  return mapSubtask(result.rows[0]);
}

async function updateSubtask(
  activityIdStr: string,
  subtaskIdStr: string,
  userId: number,
  input: UpdateActivitySubtaskInput
): Promise<ActivitySubtask> {
  const activityId = parseActivityId(activityIdStr);
  await getOwnedActivityOrThrow(activityId, userId);

  const subtaskId = parseSubtaskId(subtaskIdStr);
  const db = getDbPool();
  const check = await db.query(
    'SELECT id FROM activity_subtasks WHERE id = $1 AND activity_id = $2',
    [subtaskId, activityId]
  );
  if (check.rows.length === 0) throw new NotFoundError('Subtask not found');

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(input.title);
    paramIndex++;
  }
  if (input.isCompleted !== undefined) {
    updates.push(`is_completed = $${paramIndex}`);
    params.push(input.isCompleted);
    paramIndex++;
  }
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(input.orderIndex);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(subtaskId);
  const result = await db.query<ActivitySubtaskRow>(
    `UPDATE activity_subtasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${ACTIVITY_SUBTASK_RETURNING}`,
    params
  );
  return mapSubtask(result.rows[0]);
}

async function deleteSubtask(
  activityIdStr: string,
  subtaskIdStr: string,
  userId: number
): Promise<boolean> {
  const activityId = parseActivityId(activityIdStr);
  await getOwnedActivityOrThrow(activityId, userId);

  const subtaskId = parseSubtaskId(subtaskIdStr);
  const db = getDbPool();
  const result = await db.query(
    'DELETE FROM activity_subtasks WHERE id = $1 AND activity_id = $2 RETURNING id',
    [subtaskId, activityId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Subtask not found');
  return true;
}

export const activityService = {
  createActivity,
  listActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  completeActivity,
  parseActivityId,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  listSubtasksForActivity,
  loadSubtasksCounts,
};
