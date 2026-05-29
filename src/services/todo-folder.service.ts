import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateTodoFolderInput,
  TodoFolder,
  UpdateTodoFolderInput,
} from '../types/services/todo-folder.types';

type FolderRow = {
  id: number;
  user_id: number;
  name: string;
  color: string;
  order_index: number;
  created_at: Date;
  updated_at: Date;
  todo_count?: string;
};

const FOLDER_RETURNING = `id, user_id, name, color, order_index, created_at, updated_at`;

function mapFolder(row: FolderRow): TodoFolder {
  return {
    id: String(row.id),
    userId: row.user_id,
    name: row.name,
    color: row.color,
    orderIndex: row.order_index,
    todoCount: row.todo_count !== undefined ? parseInt(row.todo_count, 10) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseFolderId(id: string): number {
  const folderId = parseInt(id, 10);
  if (Number.isNaN(folderId)) throw new NotFoundError('Todo folder not found');
  return folderId;
}

async function getFolderRowOrThrow(folderId: number): Promise<FolderRow> {
  const db = getDbPool();
  const result = await db.query<FolderRow>('SELECT * FROM todo_folders WHERE id = $1', [folderId]);
  if (result.rows.length === 0) throw new NotFoundError('Todo folder not found');
  return result.rows[0];
}

async function getOwnedFolderOrThrow(folderId: number, userId: number): Promise<FolderRow> {
  const row = await getFolderRowOrThrow(folderId);
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this todo folder');
  }
  return row;
}

async function listFolders(userId: number): Promise<TodoFolder[]> {
  const db = getDbPool();
  const result = await db.query<FolderRow>(
    `SELECT f.id, f.user_id, f.name, f.color, f.order_index, f.created_at, f.updated_at,
      COUNT(t.id)::text AS todo_count
     FROM todo_folders f
     LEFT JOIN todos t ON t.folder_id = f.id AND t.user_id = f.user_id
     WHERE f.user_id = $1
     GROUP BY f.id
     ORDER BY f.order_index ASC, f.name ASC`,
    [userId]
  );
  return result.rows.map(mapFolder);
}

async function getFolderById(id: string, userId: number): Promise<TodoFolder> {
  const folderId = parseFolderId(id);
  await getOwnedFolderOrThrow(folderId, userId);

  const db = getDbPool();
  const result = await db.query<FolderRow>(
    `SELECT f.id, f.user_id, f.name, f.color, f.order_index, f.created_at, f.updated_at,
      COUNT(t.id)::text AS todo_count
     FROM todo_folders f
     LEFT JOIN todos t ON t.folder_id = f.id AND t.user_id = f.user_id
     WHERE f.id = $1
     GROUP BY f.id`,
    [folderId]
  );
  return mapFolder(result.rows[0]);
}

async function createFolder(userId: number, input: CreateTodoFolderInput): Promise<TodoFolder> {
  const db = getDbPool();
  try {
    const result = await db.query<FolderRow>(
      `INSERT INTO todo_folders (user_id, name, color, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING ${FOLDER_RETURNING}`,
      [userId, input.name.trim(), input.color, input.orderIndex ?? 0]
    );
    return mapFolder({ ...result.rows[0], todo_count: '0' });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new BadRequestError('A folder with this name already exists');
    }
    throw err;
  }
}

async function updateFolder(
  id: string,
  userId: number,
  input: UpdateTodoFolderInput
): Promise<TodoFolder> {
  const folderId = parseFolderId(id);
  await getOwnedFolderOrThrow(folderId, userId);

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
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(input.orderIndex);
    paramIndex++;
  }

  if (updates.length === 0) {
    return getFolderById(id, userId);
  }

  params.push(folderId);
  const db = getDbPool();
  try {
    await db.query(
      `UPDATE todo_folders SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );
    return getFolderById(id, userId);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new BadRequestError('A folder with this name already exists');
    }
    throw err;
  }
}

async function deleteFolder(id: string, userId: number): Promise<boolean> {
  const folderId = parseFolderId(id);
  await getOwnedFolderOrThrow(folderId, userId);
  await getDbPool().query('DELETE FROM todo_folders WHERE id = $1', [folderId]);
  return true;
}

async function resolveFolderIdForTodo(
  userId: number,
  folderId: string | null | undefined
): Promise<number | null | undefined> {
  if (folderId === undefined) return undefined;
  if (folderId === null) return null;
  const numericId = parseFolderId(folderId);
  await getOwnedFolderOrThrow(numericId, userId);
  return numericId;
}

export const todoFolderService = {
  listFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  resolveFolderIdForTodo,
  getOwnedFolderOrThrow,
};
