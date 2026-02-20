import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError } from '../shared/errors';

export async function createTodo(req: Request, res: Response): Promise<void> {
  const { title, description, status, priority, dueDate } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO todos (user_id, title, description, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, description, status, priority, due_date, completed_at, created_at, updated_at`,
    [userId, title, description || null, status || 'pending', priority || 'medium', dueDate || null]
  );

  const todo = result.rows[0];

  res.status(201).json(
    successResponse({
      todo: {
        id: todo.id,
        userId: todo.user_id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        completedAt: todo.completed_at,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      },
    })
  );
}

export async function getTodos(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { status, priority, dueBefore, dueAfter, page = '1', limit = '20' } = req.query;

  let query = 'SELECT * FROM todos WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

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

  if (dueBefore) {
    query += ` AND due_date <= $${paramIndex}`;
    params.push(dueBefore);
    paramIndex++;
  }

  if (dueAfter) {
    query += ` AND due_date >= $${paramIndex}`;
    params.push(dueAfter);
    paramIndex++;
  }

  query += ' ORDER BY due_date ASC NULLS LAST, priority DESC, created_at DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  // Get subtasks count for each todo
  const todoIds = result.rows.map((row) => row.id);
  let subtaskCounts: { [key: number]: { total: number; completed: number } } = {};

  if (todoIds.length > 0) {
    const subtasksResult = await db.query(
      `SELECT todo_id, COUNT(*) as total, SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
       FROM todo_subtasks
       WHERE todo_id = ANY($1)
       GROUP BY todo_id`,
      [todoIds]
    );

    subtasksResult.rows.forEach((row) => {
      subtaskCounts[row.todo_id] = {
        total: parseInt(row.total, 10),
        completed: parseInt(row.completed, 10),
      };
    });
  }

  const todos = result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subtasksCount: subtaskCounts[row.id] || { total: 0, completed: 0 },
  }));

  res.json(successResponse({ todos }));
}

export async function getTodoById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query('SELECT * FROM todos WHERE id = $1', [parseInt(id, 10)]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Todo not found');
  }

  const todo = result.rows[0];

  if (todo.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this todo');
  }

  // Get subtasks
  const subtasksResult = await db.query(
    'SELECT * FROM todo_subtasks WHERE todo_id = $1 ORDER BY order_index ASC, created_at ASC',
    [parseInt(id, 10)]
  );

  const subtasks = subtasksResult.rows.map((row) => ({
    id: row.id,
    todoId: row.todo_id,
    title: row.title,
    isCompleted: row.is_completed,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json(
    successResponse({
      todo: {
        id: todo.id,
        userId: todo.user_id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        completedAt: todo.completed_at,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
        subtasks,
      },
    })
  );
}

export async function updateTodo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, status, priority, dueDate } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT user_id FROM todos WHERE id = $1', [parseInt(id, 10)]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Todo not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this todo');
  }

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

  if (dueDate !== undefined) {
    updates.push(`due_date = $${paramIndex}`);
    params.push(dueDate);
    paramIndex++;
  }

  params.push(parseInt(id, 10));

  const result = await db.query(
    `UPDATE todos 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, user_id, title, description, status, priority, due_date, completed_at, created_at, updated_at`,
    params
  );

  const todo = result.rows[0];

  res.json(
    successResponse({
      todo: {
        id: todo.id,
        userId: todo.user_id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        completedAt: todo.completed_at,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      },
    })
  );
}

export async function deleteTodo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT user_id FROM todos WHERE id = $1', [parseInt(id, 10)]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Todo not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this todo');
  }

  await db.query('DELETE FROM todos WHERE id = $1', [parseInt(id, 10)]);

  res.json(
    successResponse({
      message: 'Todo deleted successfully',
    })
  );
}

export async function completeTodo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT user_id FROM todos WHERE id = $1', [parseInt(id, 10)]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Todo not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to complete this todo');
  }

  const result = await db.query(
    `UPDATE todos 
     SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, user_id, title, description, status, priority, due_date, completed_at, created_at, updated_at`,
    [parseInt(id, 10)]
  );

  const todo = result.rows[0];

  res.json(
    successResponse({
      todo: {
        id: todo.id,
        userId: todo.user_id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        completedAt: todo.completed_at,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      },
    })
  );
}

// Subtasks
export async function createSubtask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, orderIndex } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify todo ownership
  const todoResult = await db.query('SELECT user_id FROM todos WHERE id = $1', [parseInt(id, 10)]);

  if (todoResult.rows.length === 0) {
    throw new NotFoundError('Todo not found');
  }

  if (todoResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to add subtasks to this todo');
  }

  const result = await db.query(
    `INSERT INTO todo_subtasks (todo_id, title, order_index)
     VALUES ($1, $2, $3)
     RETURNING id, todo_id, title, is_completed, order_index, created_at, updated_at`,
    [parseInt(id, 10), title, orderIndex || 0]
  );

  const subtask = result.rows[0];

  res.status(201).json(
    successResponse({
      subtask: {
        id: subtask.id,
        todoId: subtask.todo_id,
        title: subtask.title,
        isCompleted: subtask.is_completed,
        orderIndex: subtask.order_index,
        createdAt: subtask.created_at,
        updatedAt: subtask.updated_at,
      },
    })
  );
}

export async function updateSubtask(req: Request, res: Response): Promise<void> {
  const { id, subtaskId } = req.params;
  const { title, isCompleted, orderIndex } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify todo ownership
  const todoResult = await db.query('SELECT user_id FROM todos WHERE id = $1', [parseInt(id, 10)]);

  if (todoResult.rows.length === 0) {
    throw new NotFoundError('Todo not found');
  }

  if (todoResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this subtask');
  }

  // Verify subtask belongs to todo
  const subtaskCheck = await db.query(
    'SELECT id FROM todo_subtasks WHERE id = $1 AND todo_id = $2',
    [parseInt(subtaskId, 10), parseInt(id, 10)]
  );

  if (subtaskCheck.rows.length === 0) {
    throw new NotFoundError('Subtask not found');
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(title);
    paramIndex++;
  }

  if (isCompleted !== undefined) {
    updates.push(`is_completed = $${paramIndex}`);
    params.push(isCompleted);
    paramIndex++;
  }

  if (orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(orderIndex);
    paramIndex++;
  }

  params.push(parseInt(subtaskId, 10));

  const result = await db.query(
    `UPDATE todo_subtasks 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, todo_id, title, is_completed, order_index, created_at, updated_at`,
    params
  );

  const subtask = result.rows[0];

  res.json(
    successResponse({
      subtask: {
        id: subtask.id,
        todoId: subtask.todo_id,
        title: subtask.title,
        isCompleted: subtask.is_completed,
        orderIndex: subtask.order_index,
        createdAt: subtask.created_at,
        updatedAt: subtask.updated_at,
      },
    })
  );
}

export async function deleteSubtask(req: Request, res: Response): Promise<void> {
  const { id, subtaskId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify todo ownership
  const todoResult = await db.query('SELECT user_id FROM todos WHERE id = $1', [parseInt(id, 10)]);

  if (todoResult.rows.length === 0) {
    throw new NotFoundError('Todo not found');
  }

  if (todoResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this subtask');
  }

  // Delete subtask
  const result = await db.query(
    'DELETE FROM todo_subtasks WHERE id = $1 AND todo_id = $2 RETURNING id',
    [parseInt(subtaskId, 10), parseInt(id, 10)]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Subtask not found');
  }

  res.json(
    successResponse({
      message: 'Subtask deleted successfully',
    })
  );
}
