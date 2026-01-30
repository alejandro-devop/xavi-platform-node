import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError, ConflictError } from '../shared/errors';

export async function createHabit(req: Request, res: Response): Promise<void> {
  const { name, description, frequency, targetCount, icon, color } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO habits (user_id, name, description, frequency, target_count, icon, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, name, description, frequency, target_count, icon, color, is_active, created_at, updated_at`,
    [userId, name, description || null, frequency || 'daily', targetCount || 1, icon || null, color || null]
  );

  const habit = result.rows[0];

  res.status(201).json(successResponse({
    habit: {
      id: habit.id,
      userId: habit.user_id,
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      targetCount: habit.target_count,
      icon: habit.icon,
      color: habit.color,
      isActive: habit.is_active,
      createdAt: habit.created_at,
      updatedAt: habit.updated_at,
    },
  }));
}

export async function getHabits(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { isActive, page = '1', limit = '50' } = req.query;

  let query = 'SELECT * FROM habits WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (isActive !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  query += ' ORDER BY created_at DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  const habits = result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    frequency: row.frequency,
    targetCount: row.target_count,
    icon: row.icon,
    color: row.color,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json(successResponse({ habits }));
}

export async function getHabitById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query('SELECT * FROM habits WHERE id = $1', [parseInt(id, 10)]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  const habit = result.rows[0];

  if (habit.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this habit');
  }

  res.json(successResponse({
    habit: {
      id: habit.id,
      userId: habit.user_id,
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      targetCount: habit.target_count,
      icon: habit.icon,
      color: habit.color,
      isActive: habit.is_active,
      createdAt: habit.created_at,
      updatedAt: habit.updated_at,
    },
  }));
}

export async function updateHabit(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, description, frequency, targetCount, icon, color, isActive } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT user_id FROM habits WHERE id = $1', [parseInt(id, 10)]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update this habit');
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(description);
    paramIndex++;
  }

  if (frequency !== undefined) {
    updates.push(`frequency = $${paramIndex}`);
    params.push(frequency);
    paramIndex++;
  }

  if (targetCount !== undefined) {
    updates.push(`target_count = $${paramIndex}`);
    params.push(targetCount);
    paramIndex++;
  }

  if (icon !== undefined) {
    updates.push(`icon = $${paramIndex}`);
    params.push(icon);
    paramIndex++;
  }

  if (color !== undefined) {
    updates.push(`color = $${paramIndex}`);
    params.push(color);
    paramIndex++;
  }

  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(isActive);
    paramIndex++;
  }

  params.push(parseInt(id, 10));

  const result = await db.query(
    `UPDATE habits 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, user_id, name, description, frequency, target_count, icon, color, is_active, created_at, updated_at`,
    params
  );

  const habit = result.rows[0];

  res.json(successResponse({
    habit: {
      id: habit.id,
      userId: habit.user_id,
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      targetCount: habit.target_count,
      icon: habit.icon,
      color: habit.color,
      isActive: habit.is_active,
      createdAt: habit.created_at,
      updatedAt: habit.updated_at,
    },
  }));
}

export async function deleteHabit(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT user_id FROM habits WHERE id = $1', [parseInt(id, 10)]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this habit');
  }

  await db.query('DELETE FROM habits WHERE id = $1', [parseInt(id, 10)]);

  res.json(successResponse({
    message: 'Habit deleted successfully',
  }));
}

export async function logHabitCompletion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { completedDate, count, notes } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify habit ownership
  const habitResult = await db.query('SELECT user_id FROM habits WHERE id = $1', [parseInt(id, 10)]);

  if (habitResult.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  if (habitResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to log this habit');
  }

  const date = completedDate || new Date().toISOString().split('T')[0];

  // Check if already logged for this date
  const existingLog = await db.query(
    'SELECT id FROM habit_logs WHERE habit_id = $1 AND completed_date = $2',
    [parseInt(id, 10), date]
  );

  if (existingLog.rows.length > 0) {
    throw new ConflictError('Habit already logged for this date');
  }

  const result = await db.query(
    `INSERT INTO habit_logs (habit_id, completed_date, count, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, habit_id, completed_date, count, notes, created_at`,
    [parseInt(id, 10), date, count || 1, notes || null]
  );

  const log = result.rows[0];

  res.status(201).json(successResponse({
    log: {
      id: log.id,
      habitId: log.habit_id,
      completedDate: log.completed_date,
      count: log.count,
      notes: log.notes,
      createdAt: log.created_at,
    },
  }));
}

export async function getHabitLogs(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();
  const { startDate, endDate, limit = '30' } = req.query;

  // Verify habit ownership
  const habitResult = await db.query('SELECT user_id FROM habits WHERE id = $1', [parseInt(id, 10)]);

  if (habitResult.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  if (habitResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access these logs');
  }

  let query = 'SELECT * FROM habit_logs WHERE habit_id = $1';
  const params: any[] = [parseInt(id, 10)];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND completed_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND completed_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  query += ` ORDER BY completed_date DESC LIMIT $${paramIndex}`;
  params.push(parseInt(limit as string, 10));

  const result = await db.query(query, params);

  const logs = result.rows.map((row) => ({
    id: row.id,
    habitId: row.habit_id,
    completedDate: row.completed_date,
    count: row.count,
    notes: row.notes,
    createdAt: row.created_at,
  }));

  res.json(successResponse({ logs }));
}

export async function getHabitStats(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify habit ownership
  const habitResult = await db.query('SELECT user_id FROM habits WHERE id = $1', [parseInt(id, 10)]);

  if (habitResult.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  if (habitResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access these stats');
  }

  // Get total completions
  const totalResult = await db.query(
    'SELECT COUNT(*) as total, SUM(count) as total_count FROM habit_logs WHERE habit_id = $1',
    [parseInt(id, 10)]
  );

  // Get current streak
  const streakResult = await db.query(
    `SELECT completed_date 
     FROM habit_logs 
     WHERE habit_id = $1 
     ORDER BY completed_date DESC`,
    [parseInt(id, 10)]
  );

  let currentStreak = 0;
  if (streakResult.rows.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let checkDate = new Date(streakResult.rows[0].completed_date);
    checkDate.setHours(0, 0, 0, 0);

    // Check if logged today or yesterday
    if (checkDate.getTime() === today.getTime() || checkDate.getTime() === yesterday.getTime()) {
      currentStreak = 1;
      
      for (let i = 1; i < streakResult.rows.length; i++) {
        const prevDate = new Date(streakResult.rows[i - 1].completed_date);
        const currDate = new Date(streakResult.rows[i].completed_date);
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Get completions in last 30 days
  const last30DaysResult = await db.query(
    `SELECT COUNT(*) as count 
     FROM habit_logs 
     WHERE habit_id = $1 AND completed_date >= CURRENT_DATE - INTERVAL '30 days'`,
    [parseInt(id, 10)]
  );

  res.json(successResponse({
    stats: {
      totalCompletions: parseInt(totalResult.rows[0].total, 10),
      totalCount: parseInt(totalResult.rows[0].total_count || '0', 10),
      currentStreak,
      last30Days: parseInt(last30DaysResult.rows[0].count, 10),
    },
  }));
}
