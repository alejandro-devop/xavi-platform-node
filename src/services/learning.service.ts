import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateLearningProgressInput,
  CreateLearningResourceInput,
  LearningProgressSession,
  LearningProgressStats,
  LearningResource,
  LearningResourceCollection,
  LearningResourceStatus,
  ListLearningResourcesOptions,
  UpdateLearningProgressInput,
  UpdateLearningResourceInput,
} from '../types/services/learning.types';

type LearningResourceRow = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  category: string | null;
  priority: string;
  status: string;
  estimated_duration_minutes: number | null;
  created_at: Date;
  updated_at: Date;
};

type LearningResourceListRow = LearningResourceRow & {
  total_sessions: string;
  total_time_spent: string;
  current_progress: string | null;
};

type LearningProgressRow = {
  id: number;
  resource_id: number;
  session_date: Date;
  duration_minutes: number;
  notes: string | null;
  progress_percentage: number | null;
  created_at: Date;
  updated_at: Date;
};

const RESOURCE_RETURNING = `id, user_id, title, description, resource_type, url, category, priority, status, estimated_duration_minutes, created_at, updated_at`;
const PROGRESS_RETURNING = `id, resource_id, session_date, duration_minutes, notes, progress_percentage, created_at, updated_at`;

function mapProgressStats(row: {
  total_sessions?: string;
  total_time_spent?: string;
  current_progress?: string | null;
}): LearningProgressStats | undefined {
  if (row.total_sessions === undefined) return undefined;
  return {
    totalSessions: parseInt(row.total_sessions, 10),
    totalTimeSpent: parseInt(row.total_time_spent ?? '0', 10),
    currentProgress: row.current_progress ? parseInt(row.current_progress, 10) : 0,
  };
}

function mapResource(
  row: LearningResourceRow,
  extras?: { progressStats?: LearningProgressStats; progressSessions?: LearningProgressSession[] }
): LearningResource {
  return {
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    description: row.description,
    resourceType: row.resource_type as LearningResource['resourceType'],
    url: row.url,
    category: row.category,
    priority: row.priority as LearningResource['priority'],
    status: row.status as LearningResource['status'],
    estimatedDurationMinutes: row.estimated_duration_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    progressStats: extras?.progressStats,
    progressSessions: extras?.progressSessions,
  };
}

function mapListResource(row: LearningResourceListRow): LearningResource {
  return mapResource(row, { progressStats: mapProgressStats(row) });
}

function mapProgress(row: LearningProgressRow): LearningProgressSession {
  return {
    id: String(row.id),
    resourceId: String(row.resource_id),
    sessionDate: row.session_date,
    durationMinutes: row.duration_minutes,
    notes: row.notes,
    progressPercentage: row.progress_percentage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseResourceId(id: string): number {
  const resourceId = parseInt(id, 10);
  if (Number.isNaN(resourceId)) throw new NotFoundError('Learning resource not found');
  return resourceId;
}

function parseSessionId(id: string): number {
  const sessionId = parseInt(id, 10);
  if (Number.isNaN(sessionId)) throw new NotFoundError('Progress session not found');
  return sessionId;
}

function assertResourceOwnership(resource: { user_id: number }, userId: number): void {
  if (resource.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }
}

async function getResourceRowOrThrow(resourceId: number): Promise<LearningResourceRow> {
  const db = getDbPool();
  const result = await db.query<LearningResourceRow>(
    'SELECT * FROM learning_resources WHERE id = $1',
    [resourceId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Learning resource not found');
  return result.rows[0];
}

async function getOwnedResourceOrThrow(
  resourceId: number,
  userId: number
): Promise<LearningResourceRow> {
  const row = await getResourceRowOrThrow(resourceId);
  assertResourceOwnership(row, userId);
  return row;
}

async function applyProgressStatusUpdate(
  resourceId: number,
  currentStatus: string,
  progressPercentage: number | null | undefined
): Promise<void> {
  if (progressPercentage === undefined || progressPercentage === null) return;

  let newStatus: LearningResourceStatus = currentStatus as LearningResourceStatus;
  if (progressPercentage >= 100 && newStatus !== 'completed') {
    newStatus = 'completed';
  } else if (progressPercentage > 0 && progressPercentage < 100 && newStatus === 'not_started') {
    newStatus = 'in_progress';
  }

  if (newStatus !== currentStatus) {
    await getDbPool().query('UPDATE learning_resources SET status = $1 WHERE id = $2', [
      newStatus,
      resourceId,
    ]);
  }
}

async function listProgressSessions(resourceId: number): Promise<LearningProgressSession[]> {
  const db = getDbPool();
  const result = await db.query<LearningProgressRow>(
    'SELECT * FROM learning_progress WHERE resource_id = $1 ORDER BY session_date DESC',
    [resourceId]
  );
  return result.rows.map(mapProgress);
}

async function createLearningResource(
  userId: number,
  input: CreateLearningResourceInput
): Promise<LearningResource> {
  const db = getDbPool();
  const result = await db.query<LearningResourceRow>(
    `INSERT INTO learning_resources (user_id, title, description, resource_type, url, category, priority, estimated_duration_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${RESOURCE_RETURNING}`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.resourceType,
      input.url ?? null,
      input.category ?? null,
      input.priority ?? 'medium',
      input.estimatedDurationMinutes ?? null,
    ]
  );
  return mapResource(result.rows[0], {
    progressStats: { totalSessions: 0, totalTimeSpent: 0, currentProgress: 0 },
  });
}

async function listLearningResources(
  userId: number,
  options: ListLearningResourcesOptions = {}
): Promise<LearningResourceCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE lr.user_id = $1';
  const params: (number | string)[] = [userId];
  let paramIndex = 2;

  if (options.resourceType) {
    whereClause += ` AND lr.resource_type = $${paramIndex}`;
    params.push(options.resourceType);
    paramIndex++;
  }
  if (options.status) {
    whereClause += ` AND lr.status = $${paramIndex}`;
    params.push(options.status);
    paramIndex++;
  }
  if (options.priority) {
    whereClause += ` AND lr.priority = $${paramIndex}`;
    params.push(options.priority);
    paramIndex++;
  }
  if (options.category) {
    whereClause += ` AND lr.category = $${paramIndex}`;
    params.push(options.category);
    paramIndex++;
  }

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM learning_resources lr ${whereClause}`,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await db.query<LearningResourceListRow>(
    `SELECT lr.*,
      COUNT(lp.id)::text AS total_sessions,
      COALESCE(SUM(lp.duration_minutes), 0)::text AS total_time_spent,
      MAX(lp.progress_percentage)::text AS current_progress
     FROM learning_resources lr
     LEFT JOIN learning_progress lp ON lr.id = lp.resource_id
     ${whereClause}
     GROUP BY lr.id
     ORDER BY lr.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  return {
    resources: result.rows.map(mapListResource),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getLearningResourceById(id: string, userId: number): Promise<LearningResource> {
  const resourceId = parseResourceId(id);
  const row = await getOwnedResourceOrThrow(resourceId, userId);
  const progressSessions = await listProgressSessions(resourceId);
  const stats = await loadProgressStatsForResource(resourceId);
  return mapResource(row, { progressSessions, progressStats: stats });
}

async function loadProgressStatsForResource(
  resourceId: number
): Promise<LearningProgressStats> {
  const db = getDbPool();
  const result = await db.query<{
    total_sessions: string;
    total_time_spent: string;
    current_progress: string | null;
  }>(
    `SELECT COUNT(id)::text AS total_sessions,
      COALESCE(SUM(duration_minutes), 0)::text AS total_time_spent,
      MAX(progress_percentage)::text AS current_progress
     FROM learning_progress WHERE resource_id = $1`,
    [resourceId]
  );
  const row = result.rows[0];
  return {
    totalSessions: parseInt(row.total_sessions, 10),
    totalTimeSpent: parseInt(row.total_time_spent, 10),
    currentProgress: row.current_progress ? parseInt(row.current_progress, 10) : 0,
  };
}

async function updateLearningResource(
  id: string,
  userId: number,
  input: UpdateLearningResourceInput
): Promise<LearningResource> {
  const resourceId = parseResourceId(id);
  await getOwnedResourceOrThrow(resourceId, userId);

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
  if (input.resourceType !== undefined) {
    updates.push(`resource_type = $${paramIndex}`);
    params.push(input.resourceType);
    paramIndex++;
  }
  if (input.url !== undefined) {
    updates.push(`url = $${paramIndex}`);
    params.push(input.url);
    paramIndex++;
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex}`);
    params.push(input.category);
    paramIndex++;
  }
  if (input.priority !== undefined) {
    updates.push(`priority = $${paramIndex}`);
    params.push(input.priority);
    paramIndex++;
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(input.status);
    paramIndex++;
  }
  if (input.estimatedDurationMinutes !== undefined) {
    updates.push(`estimated_duration_minutes = $${paramIndex}`);
    params.push(input.estimatedDurationMinutes);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(resourceId);
  const db = getDbPool();
  const result = await db.query<LearningResourceRow>(
    `UPDATE learning_resources SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${RESOURCE_RETURNING}`,
    params
  );
  const stats = await loadProgressStatsForResource(resourceId);
  return mapResource(result.rows[0], { progressStats: stats });
}

async function deleteLearningResource(id: string, userId: number): Promise<boolean> {
  const resourceId = parseResourceId(id);
  await getOwnedResourceOrThrow(resourceId, userId);
  await getDbPool().query('DELETE FROM learning_resources WHERE id = $1', [resourceId]);
  return true;
}

async function createProgressSession(
  userId: number,
  input: CreateLearningProgressInput
): Promise<LearningProgressSession> {
  const resourceId = parseResourceId(input.resourceId);
  const resource = await getOwnedResourceOrThrow(resourceId, userId);

  const db = getDbPool();
  const result = await db.query<LearningProgressRow>(
    `INSERT INTO learning_progress (resource_id, session_date, duration_minutes, notes, progress_percentage)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PROGRESS_RETURNING}`,
    [
      resourceId,
      input.sessionDate ?? new Date(),
      input.durationMinutes,
      input.notes ?? null,
      input.progressPercentage ?? null,
    ]
  );

  await applyProgressStatusUpdate(resourceId, resource.status, input.progressPercentage);
  return mapProgress(result.rows[0]);
}

async function updateProgressSession(
  resourceIdStr: string,
  sessionIdStr: string,
  userId: number,
  input: UpdateLearningProgressInput
): Promise<LearningProgressSession> {
  const resourceId = parseResourceId(resourceIdStr);
  const resource = await getOwnedResourceOrThrow(resourceId, userId);

  const sessionId = parseSessionId(sessionIdStr);
  const db = getDbPool();
  const check = await db.query('SELECT id FROM learning_progress WHERE id = $1 AND resource_id = $2', [
    sessionId,
    resourceId,
  ]);
  if (check.rows.length === 0) throw new NotFoundError('Progress session not found');

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${paramIndex}`);
    params.push(input.durationMinutes);
    paramIndex++;
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(input.notes);
    paramIndex++;
  }
  if (input.progressPercentage !== undefined) {
    updates.push(`progress_percentage = $${paramIndex}`);
    params.push(input.progressPercentage);
    paramIndex++;
  }
  if (input.sessionDate !== undefined) {
    updates.push(`session_date = $${paramIndex}`);
    params.push(input.sessionDate);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(sessionId);
  const result = await db.query<LearningProgressRow>(
    `UPDATE learning_progress SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${PROGRESS_RETURNING}`,
    params
  );

  await applyProgressStatusUpdate(resourceId, resource.status, input.progressPercentage);
  return mapProgress(result.rows[0]);
}

async function deleteProgressSession(
  resourceIdStr: string,
  sessionIdStr: string,
  userId: number
): Promise<boolean> {
  const resourceId = parseResourceId(resourceIdStr);
  await getOwnedResourceOrThrow(resourceId, userId);

  const sessionId = parseSessionId(sessionIdStr);
  const db = getDbPool();
  const result = await db.query(
    'DELETE FROM learning_progress WHERE id = $1 AND resource_id = $2 RETURNING id',
    [sessionId, resourceId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Progress session not found');
  return true;
}

export const learningService = {
  createLearningResource,
  listLearningResources,
  getLearningResourceById,
  updateLearningResource,
  deleteLearningResource,
  createProgressSession,
  updateProgressSession,
  deleteProgressSession,
  listProgressSessions,
};
