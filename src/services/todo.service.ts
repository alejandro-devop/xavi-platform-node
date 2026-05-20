import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateTodoInput,
  CreateTodoSubtaskInput,
  ListTodosOptions,
  Todo,
  TodoCollection,
  TodoSubtask,
  TodoSubtasksCount,
  UpdateTodoInput,
  UpdateTodoSubtaskInput,
} from '../types/services/todo.types';

type TodoRow = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type SubtaskRow = {
  id: number;
  todo_id: number;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

const TODO_RETURNING = `id, user_id, title, description, status, priority, due_date, completed_at, created_at, updated_at`;
const SUBTASK_RETURNING = `id, todo_id, title, is_completed, order_index, created_at, updated_at`;

function mapTodo(row: TodoRow, extras?: { subtasksCount?: TodoSubtasksCount }): Todo {
  return {
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status as Todo['status'],
    priority: row.priority as Todo['priority'],
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subtasksCount: extras?.subtasksCount,
  };
}

function mapSubtask(row: SubtaskRow): TodoSubtask {
  return {
    id: String(row.id),
    todoId: String(row.todo_id),
    title: row.title,
    isCompleted: row.is_completed,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseTodoId(id: string): number {
  const todoId = parseInt(id, 10);
  if (Number.isNaN(todoId)) throw new NotFoundError('Todo not found');
  return todoId;
}

function parseSubtaskId(id: string): number {
  const subtaskId = parseInt(id, 10);
  if (Number.isNaN(subtaskId)) throw new NotFoundError('Subtask not found');
  return subtaskId;
}

function assertTodoOwnership(todo: { user_id: number }, userId: number): void {
  if (todo.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this todo');
  }
}

async function getTodoRowOrThrow(todoId: number): Promise<TodoRow> {
  const db = getDbPool();
  const result = await db.query<TodoRow>('SELECT * FROM todos WHERE id = $1', [todoId]);
  if (result.rows.length === 0) throw new NotFoundError('Todo not found');
  return result.rows[0];
}

async function getOwnedTodoOrThrow(todoId: number, userId: number): Promise<TodoRow> {
  const row = await getTodoRowOrThrow(todoId);
  assertTodoOwnership(row, userId);
  return row;
}

async function loadSubtasksCounts(todoIds: number[]): Promise<Map<number, TodoSubtasksCount>> {
  const map = new Map<number, TodoSubtasksCount>();
  if (todoIds.length === 0) return map;

  const db = getDbPool();
  const result = await db.query<{ todo_id: number; total: string; completed: string }>(
    `SELECT todo_id, COUNT(*)::text AS total,
      COALESCE(SUM(CASE WHEN is_completed THEN 1 ELSE 0 END), 0)::text AS completed
     FROM todo_subtasks WHERE todo_id = ANY($1) GROUP BY todo_id`,
    [todoIds]
  );

  for (const row of result.rows) {
    map.set(row.todo_id, {
      total: parseInt(row.total, 10),
      completed: parseInt(row.completed, 10),
    });
  }
  return map;
}

async function listSubtasksForTodo(todoId: number): Promise<TodoSubtask[]> {
  const db = getDbPool();
  const result = await db.query<SubtaskRow>(
    `SELECT * FROM todo_subtasks WHERE todo_id = $1 ORDER BY order_index ASC, created_at ASC`,
    [todoId]
  );
  return result.rows.map(mapSubtask);
}

async function createTodo(userId: number, input: CreateTodoInput): Promise<Todo> {
  const db = getDbPool();
  const result = await db.query<TodoRow>(
    `INSERT INTO todos (user_id, title, description, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${TODO_RETURNING}`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.status ?? 'pending',
      input.priority ?? 'medium',
      input.dueDate ?? null,
    ]
  );
  return mapTodo(result.rows[0], { subtasksCount: { total: 0, completed: 0 } });
}

async function listTodos(userId: number, options: ListTodosOptions = {}): Promise<TodoCollection> {
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
  if (options.dueBefore) {
    whereClause += ` AND due_date <= $${paramIndex}`;
    params.push(options.dueBefore as string);
    paramIndex++;
  }
  if (options.dueAfter) {
    whereClause += ` AND due_date >= $${paramIndex}`;
    params.push(options.dueAfter as string);
    paramIndex++;
  }

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM todos ${whereClause}`,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await db.query<TodoRow>(
    `SELECT * FROM todos ${whereClause}
     ORDER BY due_date ASC NULLS LAST, priority DESC, created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  const todoIds = result.rows.map((r) => r.id);
  const counts = await loadSubtasksCounts(todoIds);

  return {
    todos: result.rows.map((row) =>
      mapTodo(row, {
        subtasksCount: counts.get(row.id) ?? { total: 0, completed: 0 },
      })
    ),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getTodoById(id: string, userId: number): Promise<Todo> {
  const todoId = parseTodoId(id);
  const row = await getOwnedTodoOrThrow(todoId, userId);
  const subtasks = await listSubtasksForTodo(todoId);
  const completed = subtasks.filter((s) => s.isCompleted).length;
  return {
    ...mapTodo(row),
    subtasks,
    subtasksCount: { total: subtasks.length, completed },
  };
}

async function updateTodo(id: string, userId: number, input: UpdateTodoInput): Promise<Todo> {
  const todoId = parseTodoId(id);
  await getOwnedTodoOrThrow(todoId, userId);

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
  if (input.dueDate !== undefined) {
    updates.push(`due_date = $${paramIndex}`);
    params.push(input.dueDate);
    paramIndex++;
  }

  if (updates.length === 0) {
    return mapTodo(await getTodoRowOrThrow(todoId));
  }

  params.push(todoId);
  const db = getDbPool();
  const result = await db.query<TodoRow>(
    `UPDATE todos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${TODO_RETURNING}`,
    params
  );
  return mapTodo(result.rows[0]);
}

async function deleteTodo(id: string, userId: number): Promise<boolean> {
  const todoId = parseTodoId(id);
  await getOwnedTodoOrThrow(todoId, userId);
  await getDbPool().query('DELETE FROM todos WHERE id = $1', [todoId]);
  return true;
}

async function completeTodo(id: string, userId: number): Promise<Todo> {
  const todoId = parseTodoId(id);
  await getOwnedTodoOrThrow(todoId, userId);

  const db = getDbPool();
  const result = await db.query<TodoRow>(
    `UPDATE todos SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING ${TODO_RETURNING}`,
    [todoId]
  );
  return mapTodo(result.rows[0]);
}

async function createSubtask(userId: number, input: CreateTodoSubtaskInput): Promise<TodoSubtask> {
  const todoId = parseTodoId(input.todoId);
  await getOwnedTodoOrThrow(todoId, userId);

  const db = getDbPool();
  const result = await db.query<SubtaskRow>(
    `INSERT INTO todo_subtasks (todo_id, title, order_index)
     VALUES ($1, $2, $3) RETURNING ${SUBTASK_RETURNING}`,
    [todoId, input.title, input.orderIndex ?? 0]
  );
  return mapSubtask(result.rows[0]);
}

async function updateSubtask(
  todoIdStr: string,
  subtaskIdStr: string,
  userId: number,
  input: UpdateTodoSubtaskInput
): Promise<TodoSubtask> {
  const todoId = parseTodoId(todoIdStr);
  await getOwnedTodoOrThrow(todoId, userId);

  const subtaskId = parseSubtaskId(subtaskIdStr);
  const db = getDbPool();
  const check = await db.query('SELECT id FROM todo_subtasks WHERE id = $1 AND todo_id = $2', [
    subtaskId,
    todoId,
  ]);
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
  const result = await db.query<SubtaskRow>(
    `UPDATE todo_subtasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${SUBTASK_RETURNING}`,
    params
  );
  return mapSubtask(result.rows[0]);
}

async function deleteSubtask(
  todoIdStr: string,
  subtaskIdStr: string,
  userId: number
): Promise<boolean> {
  const todoId = parseTodoId(todoIdStr);
  await getOwnedTodoOrThrow(todoId, userId);

  const subtaskId = parseSubtaskId(subtaskIdStr);
  const db = getDbPool();
  const result = await db.query(
    'DELETE FROM todo_subtasks WHERE id = $1 AND todo_id = $2 RETURNING id',
    [subtaskId, todoId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Subtask not found');
  return true;
}

export const todoService = {
  createTodo,
  listTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
  completeTodo,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  listSubtasksForTodo,
};
