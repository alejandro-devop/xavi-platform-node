import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError } from '../shared/errors';

export async function createActivity(req: Request, res: Response): Promise<void> {
  const { title, description, status, priority, scheduledDate } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO activities (user_id, title, description, status, priority, scheduled_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, description, status, priority, scheduled_date, completed_at, created_at, updated_at`,
    [userId, title, description || null, status || 'pending', priority || 'medium', scheduledDate || null]
  );

  const activity = result.rows[0];

  res.status(201).json(successResponse({
    activity: {
      id: activity.id,
      userId: activity.user_id,
      title: activity.title,
      description: activity.description,
      status: activity.status,
      priority: activity.priority,
      scheduledDate: activity.scheduled_date,
      completedAt: activity.completed_at,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    },
  }));
}

export async function getActivities(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();

  // Query params for filtering
  const { status, priority, startDate, endDate, page = '1', limit = '20' } = req.query;

  let query = 'SELECT * FROM activities WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  // Add filters
  if (status) {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (priority) {
    query += ` AND priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }

  if (startDate) {
    query += ` AND scheduled_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND scheduled_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  // Add ordering
  query += ' ORDER BY scheduled_date DESC, created_at DESC';

  // Add pagination
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  // Execute query
  const result = await db.query(query, params);

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) FROM activities WHERE user_id = $1';
  const countParams: any[] = [userId];
  let countIndex = 2;

  if (status) {
    countQuery += ` AND status = $${countIndex}`;
    countParams.push(status);
    countIndex++;
  }

  if (priority) {
    countQuery += ` AND priority = $${countIndex}`;
    countParams.push(priority);
    countIndex++;
  }

  if (startDate) {
    countQuery += ` AND scheduled_date >= $${countIndex}`;
    countParams.push(startDate);
    countIndex++;
  }

  if (endDate) {
    countQuery += ` AND scheduled_date <= $${countIndex}`;
    countParams.push(endDate);
  }

  const countResult = await db.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const activities = result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    scheduledDate: row.scheduled_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json(successResponse({
    activities,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }));
}

export async function getActivityById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    'SELECT * FROM activities WHERE id = $1',
    [parseInt(id, 10)]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  const activity = result.rows[0];

  // Check ownership
  if (activity.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this activity');
  }

  res.json(successResponse({
    activity: {
      id: activity.id,
      userId: activity.user_id,
      title: activity.title,
      description: activity.description,
      status: activity.status,
      priority: activity.priority,
      scheduledDate: activity.scheduled_date,
      completedAt: activity.completed_at,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    },
  }));
}

export async function updateActivity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, status, priority, scheduledDate } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Check if activity exists and belongs to user
  const checkResult = await db.query(
    'SELECT user_id FROM activities WHERE id = $1',
    [parseInt(id, 10)]
  );

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update this activity');
  }

  // Build update query dynamically
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

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (priority !== undefined) {
    updates.push(`priority = $${paramIndex}`);
    params.push(priority);
    paramIndex++;
  }

  if (scheduledDate !== undefined) {
    updates.push(`scheduled_date = $${paramIndex}`);
    params.push(scheduledDate);
    paramIndex++;
  }

  params.push(parseInt(id, 10));

  const result = await db.query(
    `UPDATE activities 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, user_id, title, description, status, priority, scheduled_date, completed_at, created_at, updated_at`,
    params
  );

  const activity = result.rows[0];

  res.json(successResponse({
    activity: {
      id: activity.id,
      userId: activity.user_id,
      title: activity.title,
      description: activity.description,
      status: activity.status,
      priority: activity.priority,
      scheduledDate: activity.scheduled_date,
      completedAt: activity.completed_at,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    },
  }));
}

export async function deleteActivity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Check if activity exists and belongs to user
  const checkResult = await db.query(
    'SELECT user_id FROM activities WHERE id = $1',
    [parseInt(id, 10)]
  );

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this activity');
  }

  await db.query('DELETE FROM activities WHERE id = $1', [parseInt(id, 10)]);

  res.json(successResponse({
    message: 'Activity deleted successfully',
  }));
}

export async function completeActivity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Check if activity exists and belongs to user
  const checkResult = await db.query(
    'SELECT user_id, status FROM activities WHERE id = $1',
    [parseInt(id, 10)]
  );

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to complete this activity');
  }

  // Mark as completed
  const result = await db.query(
    `UPDATE activities 
     SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, user_id, title, description, status, priority, scheduled_date, completed_at, created_at, updated_at`,
    [parseInt(id, 10)]
  );

  const activity = result.rows[0];

  res.json(successResponse({
    activity: {
      id: activity.id,
      userId: activity.user_id,
      title: activity.title,
      description: activity.description,
      status: activity.status,
      priority: activity.priority,
      scheduledDate: activity.scheduled_date,
      completedAt: activity.completed_at,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    },
  }));
}
