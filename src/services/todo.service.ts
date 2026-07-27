import { todoFolderService } from './todo-folder.service';
import { todoTagService } from './todo-tag.service';
import { getDbPool } from '../shared/database/pool';
import { isUuidV7 } from '../shared/database/uuid';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateTodoInput,
  CreateTodoSubtaskInput,
  ListTodosOptions,
  Todo,
  TodoCollection,
  TodoSubtask,
  TodoSubtasksCount,
  ReorderTodosInFolderInput,
  UpdateTodoInput,
  UpdateTodoSubtaskInput,
} from '../types/services/todo.types';

type FolderIdKey = number | null;

type TodoRow = {
  id: number;
  user_id: number;
  folder_id: number | null;
  order_index: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: Date | null;
  completed_at: Date | null;
  selected_today: boolean;
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

const TODO_RETURNING = `id, user_id, folder_id, order_index, title, description, status, priority, due_date, completed_at, selected_today, created_at, updated_at`;
const SUBTASK_RETURNING = `id, todo_id, title, is_completed, order_index, created_at, updated_at`;

import type { TodoTag } from '../types/services/todo-tag.types';

function mapTodo(
  row: TodoRow,
  extras?: { subtasksCount?: TodoSubtasksCount; tags?: TodoTag[] }
): Todo {
  return {
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status as Todo['status'],
    priority: row.priority as Todo['priority'],
    dueDate: row.due_date,
    completedAt: row.completed_at,
    selectedToday: row.selected_today,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    folderId: row.folder_id != null ? String(row.folder_id) : null,
    orderIndex: row.order_index,
    subtasksCount: extras?.subtasksCount,
    tags: extras?.tags,
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

async function getNextOrderIndexInFolder(userId: number, folderId: FolderIdKey): Promise<number> {
  const db = getDbPool();
  const result = await db.query<{ max: string | null }>(
    `SELECT MAX(order_index)::text AS max FROM todos
     WHERE user_id = $1 AND folder_id IS NOT DISTINCT FROM $2`,
    [userId, folderId]
  );
  const max = result.rows[0]?.max;
  return max != null ? parseInt(max, 10) + 1 : 0;
}

function listOrderClause(options: ListTodosOptions): string {
  if (options.folderId || options.withoutFolder) {
    return 'ORDER BY order_index ASC, created_at DESC';
  }
  return 'ORDER BY due_date ASC NULLS LAST, priority DESC, created_at DESC';
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
  const resolvedFolderId = await todoFolderService.resolveFolderIdForTodo(userId, input.folderId);
  const folderKey: FolderIdKey = resolvedFolderId ?? null;

  let orderIndex = input.orderIndex;
  if (orderIndex === undefined) {
    orderIndex = await getNextOrderIndexInFolder(userId, folderKey);
  }

  const clientId = input.clientId && isUuidV7(input.clientId) ? input.clientId : null;

  const db = getDbPool();

  // Idempotencia offline: si el clientId ya existe, devolver el todo original sin duplicar.
  if (clientId) {
    const existing = await db.query<TodoRow>(
      `SELECT ${TODO_RETURNING} FROM todos WHERE client_id = $1 AND user_id = $2`,
      [clientId, userId]
    );
    if (existing.rows.length > 0) {
      const tags = await todoTagService.listTagsForTodo(existing.rows[0].id);
      return mapTodo(existing.rows[0], { tags });
    }
  }

  const result = await db.query<TodoRow>(
    `INSERT INTO todos (user_id, folder_id, order_index, title, description, status, priority, due_date, selected_today, client_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${TODO_RETURNING}`,
    [
      userId,
      folderKey,
      orderIndex,
      input.title,
      input.description ?? null,
      input.status ?? 'pending',
      input.priority ?? 'medium',
      input.dueDate ?? null,
      input.selectedToday ?? false,
      clientId,
    ]
  );
  const row = result.rows[0];
  if (input.tagIds !== undefined) {
    await todoTagService.setTodoTags(row.id, userId, input.tagIds);
  }
  const tags =
    input.tagIds !== undefined && input.tagIds.length > 0
      ? await todoTagService.listTagsForTodo(row.id)
      : [];
  return mapTodo(row, { subtasksCount: { total: 0, completed: 0 }, tags });
}

async function listTodos(userId: number, options: ListTodosOptions = {}): Promise<TodoCollection> {
  if (options.folderId && options.withoutFolder) {
    throw new BadRequestError('Cannot use folderId and withoutFolder filters together');
  }

  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE user_id = $1';
  const params: unknown[] = [userId];
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
  if (options.tagId) {
    const tagId = parseInt(options.tagId, 10);
    if (Number.isNaN(tagId)) throw new BadRequestError('Invalid tag ID');
    whereClause += ` AND EXISTS (
      SELECT 1 FROM todo_tag_assignments a WHERE a.todo_id = todos.id AND a.tag_id = $${paramIndex}
    )`;
    params.push(tagId);
    paramIndex++;
  }
  if (options.folderId) {
    const folderId = parseInt(options.folderId, 10);
    if (Number.isNaN(folderId)) throw new BadRequestError('Invalid folder ID');
    whereClause += ` AND folder_id = $${paramIndex}`;
    params.push(folderId);
    paramIndex++;
  }
  if (options.withoutFolder) {
    whereClause += ' AND folder_id IS NULL';
  }
  if (options.selectedToday !== undefined) {
    whereClause += ` AND selected_today = $${paramIndex}`;
    params.push(options.selectedToday);
    paramIndex++;
  }
  if (options.pendingOnly) {
    whereClause += ` AND status != 'completed'`;
  }

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM todos ${whereClause}`,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await db.query<TodoRow>(
    `SELECT * FROM todos ${whereClause}
     ${listOrderClause(options)}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  const todoIds = result.rows.map((r) => r.id);
  const [counts, tagsByTodo] = await Promise.all([
    loadSubtasksCounts(todoIds),
    todoTagService.loadTagsForTodoIds(todoIds),
  ]);

  return {
    todos: result.rows.map((row) =>
      mapTodo(row, {
        subtasksCount: counts.get(row.id) ?? { total: 0, completed: 0 },
        tags: tagsByTodo.get(row.id) ?? [],
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
  const [subtasks, tags] = await Promise.all([
    listSubtasksForTodo(todoId),
    todoTagService.listTagsForTodo(todoId),
  ]);
  const completed = subtasks.filter((s) => s.isCompleted).length;
  return {
    ...mapTodo(row, { tags }),
    subtasks,
    subtasksCount: { total: subtasks.length, completed },
  };
}

async function updateTodo(id: string, userId: number, input: UpdateTodoInput): Promise<Todo> {
  const todoId = parseTodoId(id);
  const existing = await getOwnedTodoOrThrow(todoId, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;
  let resolvedFolderId: FolderIdKey | undefined;

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
  if (input.selectedToday !== undefined) {
    updates.push(`selected_today = $${paramIndex}`);
    params.push(input.selectedToday);
    paramIndex++;
  }
  if (input.folderId !== undefined) {
    resolvedFolderId = (await todoFolderService.resolveFolderIdForTodo(
      userId,
      input.folderId
    )) as FolderIdKey;
    updates.push(`folder_id = $${paramIndex}`);
    params.push(resolvedFolderId);
    paramIndex++;
  }

  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(input.orderIndex);
    paramIndex++;
  } else if (resolvedFolderId !== undefined && resolvedFolderId !== existing.folder_id) {
    const nextIndex = await getNextOrderIndexInFolder(userId, resolvedFolderId);
    updates.push(`order_index = $${paramIndex}`);
    params.push(nextIndex);
    paramIndex++;
  }

  const db = getDbPool();

  if (input.tagIds !== undefined) {
    await todoTagService.setTodoTags(todoId, userId, input.tagIds);
  }

  if (updates.length === 0) {
    const row = await getTodoRowOrThrow(todoId);
    const tags = await todoTagService.listTagsForTodo(todoId);
    return mapTodo(row, { tags });
  }

  params.push(todoId);
  const result = await db.query<TodoRow>(
    `UPDATE todos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${TODO_RETURNING}`,
    params
  );
  const tags = await todoTagService.listTagsForTodo(todoId);
  return mapTodo(result.rows[0], { tags });
}

async function reorderTodosInFolder(
  userId: number,
  input: ReorderTodosInFolderInput
): Promise<Todo[]> {
  const folderKey: FolderIdKey =
    input.folderId === null
      ? null
      : (await todoFolderService.resolveFolderIdForTodo(userId, input.folderId))!;

  const uniqueIds = [...new Set(input.todoIds)];
  const numericTodoIds = uniqueIds.map(parseTodoId);

  const db = getDbPool();
  const check = await db.query<{ id: number }>(
    `SELECT id FROM todos
     WHERE user_id = $1 AND folder_id IS NOT DISTINCT FROM $2 AND id = ANY($3)`,
    [userId, folderKey, numericTodoIds]
  );

  if (check.rows.length !== numericTodoIds.length) {
    throw new BadRequestError('All todos must belong to you and the specified folder');
  }

  for (let i = 0; i < numericTodoIds.length; i++) {
    await db.query('UPDATE todos SET order_index = $1 WHERE id = $2', [i, numericTodoIds[i]]);
  }

  const result = await db.query<TodoRow>(
    `SELECT * FROM todos WHERE id = ANY($1) ORDER BY order_index ASC`,
    [numericTodoIds]
  );

  const tagsByTodo = await todoTagService.loadTagsForTodoIds(numericTodoIds);
  return result.rows.map((row) =>
    mapTodo(row, { tags: tagsByTodo.get(row.id) ?? [], subtasksCount: { total: 0, completed: 0 } })
  );
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
  reorderTodosInFolder,
  deleteTodo,
  completeTodo,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  listSubtasksForTodo,
};
