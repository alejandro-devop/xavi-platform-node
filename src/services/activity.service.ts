import { getDbPool } from '../shared/database/pool';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  Activity,
  ActivityCollection,
  CreateActivityInput,
  ListActivitiesOptions,
  UpdateActivityInput,
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
  created_at: Date;
  updated_at: Date;
};

const ACTIVITY_RETURNING = `id, user_id, title, description, status, priority, category_id, scheduled_date, completed_at, created_at, updated_at`;

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
  const result = await db.query<ActivityRow>('SELECT * FROM activities WHERE id = $1', [activityId]);
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
    `INSERT INTO activities (user_id, title, description, status, priority, category_id, scheduled_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${ACTIVITY_RETURNING}`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.status ?? 'pending',
      input.priority ?? 'medium',
      categoryId,
      input.scheduledDate ?? null,
    ]
  );
  const activity = mapActivity(result.rows[0]);
  if (input.todoFolderIds !== undefined) {
    await activityTodoFoldersService.syncFolders(parseActivityId(activity.id), userId, input.todoFolderIds);
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

  const db = getDbPool();

  if (updates.length === 0 && input.todoFolderIds === undefined) {
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

export const activityService = {
  createActivity,
  listActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  completeActivity,
  parseActivityId,
};
