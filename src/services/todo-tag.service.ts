import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateTodoTagInput,
  TodoTag,
  UpdateTodoTagInput,
} from '../types/services/todo-tag.types';

type TagRow = {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
};

const TAG_RETURNING = `id, user_id, name, color, created_at, updated_at`;

function mapTag(row: TagRow): TodoTag {
  return {
    id: String(row.id),
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseTagId(id: string): number {
  const tagId = parseInt(id, 10);
  if (Number.isNaN(tagId)) throw new NotFoundError('Todo tag not found');
  return tagId;
}

async function getTagRowOrThrow(tagId: number): Promise<TagRow> {
  const db = getDbPool();
  const result = await db.query<TagRow>('SELECT * FROM todo_tags WHERE id = $1', [tagId]);
  if (result.rows.length === 0) throw new NotFoundError('Todo tag not found');
  return result.rows[0];
}

async function getOwnedTagOrThrow(tagId: number, userId: number): Promise<TagRow> {
  const row = await getTagRowOrThrow(tagId);
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this todo tag');
  }
  return row;
}

async function listTags(userId: number): Promise<TodoTag[]> {
  const db = getDbPool();
  const result = await db.query<TagRow>(
    `SELECT ${TAG_RETURNING} FROM todo_tags WHERE user_id = $1 ORDER BY name ASC`,
    [userId]
  );
  return result.rows.map(mapTag);
}

async function getTagById(id: string, userId: number): Promise<TodoTag> {
  const tagId = parseTagId(id);
  const row = await getOwnedTagOrThrow(tagId, userId);
  return mapTag(row);
}

async function createTag(userId: number, input: CreateTodoTagInput): Promise<TodoTag> {
  const db = getDbPool();
  try {
    const result = await db.query<TagRow>(
      `INSERT INTO todo_tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING ${TAG_RETURNING}`,
      [userId, input.name.trim(), input.color]
    );
    return mapTag(result.rows[0]);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new BadRequestError('A tag with this name already exists');
    }
    throw err;
  }
}

async function updateTag(id: string, userId: number, input: UpdateTodoTagInput): Promise<TodoTag> {
  const tagId = parseTagId(id);
  await getOwnedTagOrThrow(tagId, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(input.name.trim());
    paramIndex++;
  }
  if (input.color !== undefined) {
    updates.push(`color = $${paramIndex}`);
    params.push(input.color);
    paramIndex++;
  }

  if (updates.length === 0) {
    return mapTag(await getTagRowOrThrow(tagId));
  }

  params.push(tagId);
  const db = getDbPool();
  try {
    const result = await db.query<TagRow>(
      `UPDATE todo_tags SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${TAG_RETURNING}`,
      params
    );
    return mapTag(result.rows[0]);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new BadRequestError('A tag with this name already exists');
    }
    throw err;
  }
}

async function deleteTag(id: string, userId: number): Promise<boolean> {
  const tagId = parseTagId(id);
  await getOwnedTagOrThrow(tagId, userId);
  await getDbPool().query('DELETE FROM todo_tags WHERE id = $1', [tagId]);
  return true;
}

async function assertTagsOwnedByUser(userId: number, tagIds: string[]): Promise<number[]> {
  if (tagIds.length === 0) return [];

  const uniqueIds = [...new Set(tagIds)];
  const numericIds = uniqueIds.map(parseTagId);
  const db = getDbPool();
  const result = await db.query<{ id: number }>(
    'SELECT id FROM todo_tags WHERE user_id = $1 AND id = ANY($2)',
    [userId, numericIds]
  );

  if (result.rows.length !== numericIds.length) {
    throw new BadRequestError('One or more tags are invalid');
  }

  return numericIds;
}

async function setTodoTags(todoId: number, userId: number, tagIds: string[]): Promise<void> {
  const numericTagIds = await assertTagsOwnedByUser(userId, tagIds);
  const db = getDbPool();

  await db.query('DELETE FROM todo_tag_assignments WHERE todo_id = $1', [todoId]);

  if (numericTagIds.length === 0) return;

  const values = numericTagIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await db.query(
    `INSERT INTO todo_tag_assignments (todo_id, tag_id) VALUES ${values}`,
    [todoId, ...numericTagIds]
  );
}

async function listTagsForTodo(todoId: number): Promise<TodoTag[]> {
  const db = getDbPool();
  const result = await db.query<TagRow>(
    `SELECT t.id, t.user_id, t.name, t.color, t.created_at, t.updated_at
     FROM todo_tags t
     INNER JOIN todo_tag_assignments a ON a.tag_id = t.id
     WHERE a.todo_id = $1
     ORDER BY t.name ASC`,
    [todoId]
  );
  return result.rows.map(mapTag);
}

async function loadTagsForTodoIds(todoIds: number[]): Promise<Map<number, TodoTag[]>> {
  const map = new Map<number, TodoTag[]>();
  if (todoIds.length === 0) return map;

  const db = getDbPool();
  const result = await db.query<TagRow & { todo_id: number }>(
    `SELECT a.todo_id, t.id, t.user_id, t.name, t.color, t.created_at, t.updated_at
     FROM todo_tag_assignments a
     INNER JOIN todo_tags t ON t.id = a.tag_id
     WHERE a.todo_id = ANY($1)
     ORDER BY t.name ASC`,
    [todoIds]
  );

  for (const row of result.rows) {
    const { todo_id, ...tagRow } = row;
    const list = map.get(todo_id) ?? [];
    list.push(mapTag(tagRow));
    map.set(todo_id, list);
  }

  return map;
}

export const todoTagService = {
  listTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  setTodoTags,
  listTagsForTodo,
  loadTagsForTodoIds,
  assertTagsOwnedByUser,
};
