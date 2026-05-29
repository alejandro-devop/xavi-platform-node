import { getDbPool } from '../shared/database/pool';
import { BadRequestError } from '../shared/errors';
import { activityService } from './activity.service';
import { todoFolderService } from './todo-folder.service';
import { todoService } from './todo.service';
import type { Todo } from '../types/services/todo.types';
import type { TodoFolder } from '../types/services/todo-folder.types';

async function syncFolders(
  activityId: number,
  userId: number,
  folderIds: string[]
): Promise<void> {
  const uniqueIds = [...new Set(folderIds)];
  for (const folderId of uniqueIds) {
    await todoFolderService.getFolderById(folderId, userId);
  }

  const db = getDbPool();
  await db.query('DELETE FROM activity_todo_folders WHERE activity_id = $1', [activityId]);

  if (uniqueIds.length === 0) return;

  const values = uniqueIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await db.query(
    `INSERT INTO activity_todo_folders (activity_id, folder_id) VALUES ${values}`,
    [activityId, ...uniqueIds.map((id) => parseInt(id, 10))]
  );
}

async function getFolderIdsForActivity(activityId: number): Promise<string[]> {
  const db = getDbPool();
  const result = await db.query<{ folder_id: number }>(
    `SELECT folder_id FROM activity_todo_folders WHERE activity_id = $1 ORDER BY folder_id ASC`,
    [activityId]
  );
  return result.rows.map((r) => String(r.folder_id));
}

async function getFoldersForActivity(activityId: number, userId: number): Promise<TodoFolder[]> {
  const folderIds = await getFolderIdsForActivity(activityId);
  if (folderIds.length === 0) return [];

  const folders: TodoFolder[] = [];
  for (const folderId of folderIds) {
    folders.push(await todoFolderService.getFolderById(folderId, userId));
  }
  return folders;
}

async function listPendingTodosForActivity(
  activityId: string,
  userId: number,
  limit = 50
): Promise<Todo[]> {
  const parsedId = activityService.parseActivityId(activityId);
  await activityService.getActivityById(activityId, userId);

  const folderIds = await getFolderIdsForActivity(parsedId);
  if (folderIds.length === 0) return [];

  const numericFolderIds = folderIds.map((id) => parseInt(id, 10));
  if (numericFolderIds.some((id) => Number.isNaN(id))) {
    throw new BadRequestError('Invalid folder ID');
  }

  const db = getDbPool();
  const result = await db.query<{ id: number }>(
    `SELECT t.id FROM todos t
     WHERE t.user_id = $1
       AND t.status = 'pending'
       AND t.folder_id = ANY($2::int[])
     ORDER BY t.folder_id ASC, t.order_index ASC, t.created_at ASC
     LIMIT $3`,
    [userId, numericFolderIds, limit]
  );

  const todos: Todo[] = [];
  for (const row of result.rows) {
    todos.push(await todoService.getTodoById(String(row.id), userId));
  }
  return todos;
}

export const activityTodoFoldersService = {
  syncFolders,
  getFolderIdsForActivity,
  getFoldersForActivity,
  listPendingTodosForActivity,
};
