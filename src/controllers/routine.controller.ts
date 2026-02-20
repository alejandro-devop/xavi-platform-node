import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

// ============ ROUTINES ============

export async function createRoutine(req: Request, res: Response): Promise<void> {
  const { name, description, daysOfWeek, timeOfDay } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO routines (user_id, name, description, days_of_week, time_of_day)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, name, description, days_of_week, time_of_day, is_active, created_at, updated_at`,
    [userId, name, description || null, daysOfWeek || [], timeOfDay || 'anytime']
  );

  const routine = result.rows[0];

  res.status(201).json(
    successResponse({
      routine: {
        id: routine.id,
        userId: routine.user_id,
        name: routine.name,
        description: routine.description,
        daysOfWeek: routine.days_of_week,
        timeOfDay: routine.time_of_day,
        isActive: routine.is_active,
        createdAt: routine.created_at,
        updatedAt: routine.updated_at,
      },
    })
  );
}

export async function getRoutines(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { isActive, timeOfDay, dayOfWeek, page = '1', limit = '20' } = req.query;

  let query = `
    SELECT 
      r.*,
      COUNT(rs.id) as total_steps,
      COALESCE(SUM(rs.duration_minutes), 0) as total_duration
    FROM routines r
    LEFT JOIN routine_steps rs ON r.id = rs.routine_id
    WHERE r.user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (isActive !== undefined) {
    query += ` AND r.is_active = $${paramIndex}`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  if (timeOfDay) {
    query += ` AND r.time_of_day = $${paramIndex}`;
    params.push(timeOfDay);
    paramIndex++;
  }

  if (dayOfWeek) {
    query += ` AND $${paramIndex} = ANY(r.days_of_week)`;
    params.push(dayOfWeek);
    paramIndex++;
  }

  query += ' GROUP BY r.id ORDER BY r.created_at DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  const routines = result.rows.map((routine) => ({
    id: routine.id,
    userId: routine.user_id,
    name: routine.name,
    description: routine.description,
    daysOfWeek: routine.days_of_week,
    timeOfDay: routine.time_of_day,
    isActive: routine.is_active,
    createdAt: routine.created_at,
    updatedAt: routine.updated_at,
    stepsCount: parseInt(routine.total_steps),
    totalDuration: parseInt(routine.total_duration),
  }));

  res.json(
    successResponse({
      routines,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: routines.length,
      },
    })
  );
}

export async function getRoutineById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const routineResult = await db.query('SELECT * FROM routines WHERE id = $1', [id]);

  if (routineResult.rows.length === 0) {
    throw new NotFoundError('Routine not found');
  }

  const routine = routineResult.rows[0];

  if (routine.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this routine');
  }

  // Get steps for this routine
  const stepsResult = await db.query(
    'SELECT * FROM routine_steps WHERE routine_id = $1 ORDER BY order_index ASC, created_at ASC',
    [id]
  );

  const steps = stepsResult.rows.map((step) => ({
    id: step.id,
    routineId: step.routine_id,
    title: step.title,
    description: step.description,
    durationMinutes: step.duration_minutes,
    orderIndex: step.order_index,
    createdAt: step.created_at,
    updatedAt: step.updated_at,
  }));

  res.json(
    successResponse({
      routine: {
        id: routine.id,
        userId: routine.user_id,
        name: routine.name,
        description: routine.description,
        daysOfWeek: routine.days_of_week,
        timeOfDay: routine.time_of_day,
        isActive: routine.is_active,
        createdAt: routine.created_at,
        updatedAt: routine.updated_at,
        steps,
      },
    })
  );
}

export async function updateRoutine(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM routines WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Routine not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this routine');
  }

  const { name, description, daysOfWeek, timeOfDay, isActive } = req.body;
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

  if (daysOfWeek !== undefined) {
    updates.push(`days_of_week = $${paramIndex}`);
    params.push(daysOfWeek);
    paramIndex++;
  }

  if (timeOfDay !== undefined) {
    updates.push(`time_of_day = $${paramIndex}`);
    params.push(timeOfDay);
    paramIndex++;
  }

  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(isActive);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(id);

  const result = await db.query(
    `UPDATE routines SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const routine = result.rows[0];

  res.json(
    successResponse({
      routine: {
        id: routine.id,
        userId: routine.user_id,
        name: routine.name,
        description: routine.description,
        daysOfWeek: routine.days_of_week,
        timeOfDay: routine.time_of_day,
        isActive: routine.is_active,
        createdAt: routine.created_at,
        updatedAt: routine.updated_at,
      },
    })
  );
}

export async function deleteRoutine(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM routines WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Routine not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this routine');
  }

  await db.query('DELETE FROM routines WHERE id = $1', [id]);

  res.json(successResponse({ message: 'Routine deleted successfully' }));
}

export async function toggleRoutineActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM routines WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Routine not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this routine');
  }

  const result = await db.query(
    'UPDATE routines SET is_active = NOT is_active WHERE id = $1 RETURNING *',
    [id]
  );

  const routine = result.rows[0];

  res.json(
    successResponse({
      routine: {
        id: routine.id,
        userId: routine.user_id,
        name: routine.name,
        description: routine.description,
        daysOfWeek: routine.days_of_week,
        timeOfDay: routine.time_of_day,
        isActive: routine.is_active,
        createdAt: routine.created_at,
        updatedAt: routine.updated_at,
      },
    })
  );
}

// ============ ROUTINE STEPS ============

export async function createRoutineStep(req: Request, res: Response): Promise<void> {
  const { id } = req.params; // routine id
  const { title, description, durationMinutes, orderIndex } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify routine ownership
  const routineResult = await db.query('SELECT * FROM routines WHERE id = $1', [id]);

  if (routineResult.rows.length === 0) {
    throw new NotFoundError('Routine not found');
  }

  if (routineResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to add steps to this routine');
  }

  const result = await db.query(
    `INSERT INTO routine_steps (routine_id, title, description, duration_minutes, order_index)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, routine_id, title, description, duration_minutes, order_index, created_at, updated_at`,
    [id, title, description || null, durationMinutes || null, orderIndex || 0]
  );

  const step = result.rows[0];

  res.status(201).json(
    successResponse({
      step: {
        id: step.id,
        routineId: step.routine_id,
        title: step.title,
        description: step.description,
        durationMinutes: step.duration_minutes,
        orderIndex: step.order_index,
        createdAt: step.created_at,
        updatedAt: step.updated_at,
      },
    })
  );
}

export async function updateRoutineStep(req: Request, res: Response): Promise<void> {
  const { id, stepId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify routine ownership
  const routineResult = await db.query('SELECT * FROM routines WHERE id = $1', [id]);

  if (routineResult.rows.length === 0) {
    throw new NotFoundError('Routine not found');
  }

  if (routineResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update steps in this routine');
  }

  // Verify step exists in this routine
  const stepCheck = await db.query(
    'SELECT * FROM routine_steps WHERE id = $1 AND routine_id = $2',
    [stepId, id]
  );

  if (stepCheck.rows.length === 0) {
    throw new NotFoundError('Step not found in this routine');
  }

  const { title, description, durationMinutes, orderIndex } = req.body;
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

  if (durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${paramIndex}`);
    params.push(durationMinutes);
    paramIndex++;
  }

  if (orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(orderIndex);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(stepId);

  const result = await db.query(
    `UPDATE routine_steps SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const step = result.rows[0];

  res.json(
    successResponse({
      step: {
        id: step.id,
        routineId: step.routine_id,
        title: step.title,
        description: step.description,
        durationMinutes: step.duration_minutes,
        orderIndex: step.order_index,
        createdAt: step.created_at,
        updatedAt: step.updated_at,
      },
    })
  );
}

export async function deleteRoutineStep(req: Request, res: Response): Promise<void> {
  const { id, stepId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify routine ownership
  const routineResult = await db.query('SELECT * FROM routines WHERE id = $1', [id]);

  if (routineResult.rows.length === 0) {
    throw new NotFoundError('Routine not found');
  }

  if (routineResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete steps from this routine');
  }

  // Verify step exists in this routine
  const stepCheck = await db.query(
    'SELECT * FROM routine_steps WHERE id = $1 AND routine_id = $2',
    [stepId, id]
  );

  if (stepCheck.rows.length === 0) {
    throw new NotFoundError('Step not found in this routine');
  }

  await db.query('DELETE FROM routine_steps WHERE id = $1', [stepId]);

  res.json(successResponse({ message: 'Step deleted successfully' }));
}
