import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

// ============ LEARNING RESOURCES ============

export async function createLearningResource(req: Request, res: Response): Promise<void> {
  const { title, description, resourceType, url, category, priority, estimatedDurationMinutes } =
    req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO learning_resources (user_id, title, description, resource_type, url, category, priority, estimated_duration_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, title, description, resource_type, url, category, priority, status, estimated_duration_minutes, created_at, updated_at`,
    [
      userId,
      title,
      description || null,
      resourceType,
      url || null,
      category || null,
      priority || 'medium',
      estimatedDurationMinutes || null,
    ]
  );

  const resource = result.rows[0];

  res.status(201).json(
    successResponse({
      resource: {
        id: resource.id,
        userId: resource.user_id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resource_type,
        url: resource.url,
        category: resource.category,
        priority: resource.priority,
        status: resource.status,
        estimatedDurationMinutes: resource.estimated_duration_minutes,
        createdAt: resource.created_at,
        updatedAt: resource.updated_at,
      },
    })
  );
}

export async function getLearningResources(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { resourceType, status, priority, category, page = '1', limit = '20' } = req.query;

  let query = `
    SELECT 
      lr.*,
      COUNT(lp.id) as total_sessions,
      COALESCE(SUM(lp.duration_minutes), 0) as total_time_spent,
      MAX(lp.progress_percentage) as current_progress
    FROM learning_resources lr
    LEFT JOIN learning_progress lp ON lr.id = lp.resource_id
    WHERE lr.user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (resourceType) {
    query += ` AND lr.resource_type = $${paramIndex}`;
    params.push(resourceType);
    paramIndex++;
  }

  if (status) {
    query += ` AND lr.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (priority) {
    query += ` AND lr.priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }

  if (category) {
    query += ` AND lr.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  query += ' GROUP BY lr.id ORDER BY lr.created_at DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  const resources = result.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    resourceType: r.resource_type,
    url: r.url,
    category: r.category,
    priority: r.priority,
    status: r.status,
    estimatedDurationMinutes: r.estimated_duration_minutes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    progressStats: {
      totalSessions: parseInt(r.total_sessions),
      totalTimeSpent: parseInt(r.total_time_spent),
      currentProgress: r.current_progress || 0,
    },
  }));

  res.json(
    successResponse({
      resources,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: resources.length,
      },
    })
  );
}

export async function getLearningResourceById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const resourceResult = await db.query('SELECT * FROM learning_resources WHERE id = $1', [id]);

  if (resourceResult.rows.length === 0) {
    throw new NotFoundError('Learning resource not found');
  }

  const resource = resourceResult.rows[0];

  if (resource.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  // Get progress sessions for this resource
  const progressResult = await db.query(
    'SELECT * FROM learning_progress WHERE resource_id = $1 ORDER BY session_date DESC',
    [id]
  );

  const progressSessions = progressResult.rows.map((p) => ({
    id: p.id,
    resourceId: p.resource_id,
    sessionDate: p.session_date,
    durationMinutes: p.duration_minutes,
    notes: p.notes,
    progressPercentage: p.progress_percentage,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  res.json(
    successResponse({
      resource: {
        id: resource.id,
        userId: resource.user_id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resource_type,
        url: resource.url,
        category: resource.category,
        priority: resource.priority,
        status: resource.status,
        estimatedDurationMinutes: resource.estimated_duration_minutes,
        createdAt: resource.created_at,
        updatedAt: resource.updated_at,
        progressSessions,
      },
    })
  );
}

export async function updateLearningResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM learning_resources WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Learning resource not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this resource');
  }

  const {
    title,
    description,
    resourceType,
    url,
    category,
    priority,
    status,
    estimatedDurationMinutes,
  } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(title);
    paramIndex++;
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(description);
    paramIndex++;
  }

  if (resourceType !== undefined) {
    updates.push(`resource_type = $${paramIndex}`);
    params.push(resourceType);
    paramIndex++;
  }

  if (url !== undefined) {
    updates.push(`url = $${paramIndex}`);
    params.push(url);
    paramIndex++;
  }

  if (category !== undefined) {
    updates.push(`category = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  if (priority !== undefined) {
    updates.push(`priority = $${paramIndex}`);
    params.push(priority);
    paramIndex++;
  }

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (estimatedDurationMinutes !== undefined) {
    updates.push(`estimated_duration_minutes = $${paramIndex}`);
    params.push(estimatedDurationMinutes);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(id);

  const result = await db.query(
    `UPDATE learning_resources SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const resource = result.rows[0];

  res.json(
    successResponse({
      resource: {
        id: resource.id,
        userId: resource.user_id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resource_type,
        url: resource.url,
        category: resource.category,
        priority: resource.priority,
        status: resource.status,
        estimatedDurationMinutes: resource.estimated_duration_minutes,
        createdAt: resource.created_at,
        updatedAt: resource.updated_at,
      },
    })
  );
}

export async function deleteLearningResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM learning_resources WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Learning resource not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this resource');
  }

  await db.query('DELETE FROM learning_resources WHERE id = $1', [id]);

  res.json(successResponse({ message: 'Learning resource deleted successfully' }));
}

// ============ LEARNING PROGRESS ============

export async function logProgress(req: Request, res: Response): Promise<void> {
  const { id } = req.params; // resource id
  const { durationMinutes, notes, progressPercentage, sessionDate } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify resource ownership
  const resourceResult = await db.query('SELECT * FROM learning_resources WHERE id = $1', [id]);

  if (resourceResult.rows.length === 0) {
    throw new NotFoundError('Learning resource not found');
  }

  if (resourceResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to log progress for this resource');
  }

  // Insert progress log
  const result = await db.query(
    `INSERT INTO learning_progress (resource_id, session_date, duration_minutes, notes, progress_percentage)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, resource_id, session_date, duration_minutes, notes, progress_percentage, created_at, updated_at`,
    [id, sessionDate || new Date(), durationMinutes, notes || null, progressPercentage || null]
  );

  const progress = result.rows[0];

  // Auto-update resource status based on progress
  if (progressPercentage !== undefined) {
    let newStatus = resourceResult.rows[0].status;

    if (progressPercentage >= 100 && newStatus !== 'completed') {
      newStatus = 'completed';
    } else if (progressPercentage > 0 && progressPercentage < 100 && newStatus === 'not_started') {
      newStatus = 'in_progress';
    }

    if (newStatus !== resourceResult.rows[0].status) {
      await db.query('UPDATE learning_resources SET status = $1 WHERE id = $2', [newStatus, id]);
    }
  }

  res.status(201).json(
    successResponse({
      progress: {
        id: progress.id,
        resourceId: progress.resource_id,
        sessionDate: progress.session_date,
        durationMinutes: progress.duration_minutes,
        notes: progress.notes,
        progressPercentage: progress.progress_percentage,
        createdAt: progress.created_at,
        updatedAt: progress.updated_at,
      },
    })
  );
}

export async function getProgressSessions(req: Request, res: Response): Promise<void> {
  const { id } = req.params; // resource id
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify resource ownership
  const resourceResult = await db.query('SELECT * FROM learning_resources WHERE id = $1', [id]);

  if (resourceResult.rows.length === 0) {
    throw new NotFoundError('Learning resource not found');
  }

  if (resourceResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  const result = await db.query(
    'SELECT * FROM learning_progress WHERE resource_id = $1 ORDER BY session_date DESC',
    [id]
  );

  const sessions = result.rows.map((p) => ({
    id: p.id,
    resourceId: p.resource_id,
    sessionDate: p.session_date,
    durationMinutes: p.duration_minutes,
    notes: p.notes,
    progressPercentage: p.progress_percentage,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  res.json(successResponse({ sessions }));
}

export async function updateProgressSession(req: Request, res: Response): Promise<void> {
  const { id, sessionId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify resource ownership
  const resourceResult = await db.query('SELECT * FROM learning_resources WHERE id = $1', [id]);

  if (resourceResult.rows.length === 0) {
    throw new NotFoundError('Learning resource not found');
  }

  if (resourceResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update progress for this resource');
  }

  // Verify session exists for this resource
  const sessionCheck = await db.query(
    'SELECT * FROM learning_progress WHERE id = $1 AND resource_id = $2',
    [sessionId, id]
  );

  if (sessionCheck.rows.length === 0) {
    throw new NotFoundError('Progress session not found');
  }

  const { durationMinutes, notes, progressPercentage, sessionDate } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${paramIndex}`);
    params.push(durationMinutes);
    paramIndex++;
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(notes);
    paramIndex++;
  }

  if (progressPercentage !== undefined) {
    updates.push(`progress_percentage = $${paramIndex}`);
    params.push(progressPercentage);
    paramIndex++;
  }

  if (sessionDate !== undefined) {
    updates.push(`session_date = $${paramIndex}`);
    params.push(sessionDate);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(sessionId);

  const result = await db.query(
    `UPDATE learning_progress SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const progress = result.rows[0];

  res.json(
    successResponse({
      progress: {
        id: progress.id,
        resourceId: progress.resource_id,
        sessionDate: progress.session_date,
        durationMinutes: progress.duration_minutes,
        notes: progress.notes,
        progressPercentage: progress.progress_percentage,
        createdAt: progress.created_at,
        updatedAt: progress.updated_at,
      },
    })
  );
}

export async function deleteProgressSession(req: Request, res: Response): Promise<void> {
  const { id, sessionId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify resource ownership
  const resourceResult = await db.query('SELECT * FROM learning_resources WHERE id = $1', [id]);

  if (resourceResult.rows.length === 0) {
    throw new NotFoundError('Learning resource not found');
  }

  if (resourceResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete progress for this resource');
  }

  // Verify session exists for this resource
  const sessionCheck = await db.query(
    'SELECT * FROM learning_progress WHERE id = $1 AND resource_id = $2',
    [sessionId, id]
  );

  if (sessionCheck.rows.length === 0) {
    throw new NotFoundError('Progress session not found');
  }

  await db.query('DELETE FROM learning_progress WHERE id = $1', [sessionId]);

  res.json(successResponse({ message: 'Progress session deleted successfully' }));
}
