import { getDbPool } from '../shared/database/pool';
import { generateUuidV7 } from '../shared/database/uuid';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateTodoDailyTemplateInput,
  TodoDailyTemplate,
  UpdateTodoDailyTemplateInput,
} from '../types/services/todo-daily-template.types';

type TemplateRow = {
  id: string;
  user_id: number;
  title: string;
  description: string | null;
  priority: string;
  folder_id: number | null;
  days: number[];
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

const RETURNING = `id, user_id, title, description, priority, folder_id, days, order_index, created_at, updated_at`;

function mapTemplate(row: TemplateRow): TodoDailyTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    priority: row.priority as TodoDailyTemplate['priority'],
    folderId: row.folder_id != null ? String(row.folder_id) : null,
    days: row.days ?? [],
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertOwnership(id: string, userId: number): Promise<TemplateRow> {
  const db = getDbPool();
  const result = await db.query<TemplateRow>(
    'SELECT * FROM todo_daily_templates WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) throw new NotFoundError('Daily template not found');
  if (result.rows[0].user_id !== userId) throw new ForbiddenError('Access denied');
  return result.rows[0];
}

async function list(userId: number): Promise<TodoDailyTemplate[]> {
  const db = getDbPool();
  const result = await db.query<TemplateRow>(
    `SELECT ${RETURNING} FROM todo_daily_templates WHERE user_id = $1 ORDER BY order_index ASC, created_at ASC`,
    [userId]
  );
  return result.rows.map(mapTemplate);
}

async function listByDay(userId: number, day: number): Promise<TodoDailyTemplate[]> {
  const db = getDbPool();
  const result = await db.query<TemplateRow>(
    `SELECT ${RETURNING} FROM todo_daily_templates WHERE user_id = $1 AND $2 = ANY(days) ORDER BY order_index ASC, created_at ASC`,
    [userId, day]
  );
  return result.rows.map(mapTemplate);
}

async function getById(userId: number, id: string): Promise<TodoDailyTemplate> {
  const row = await assertOwnership(id, userId);
  return mapTemplate(row);
}

async function create(
  userId: number,
  input: CreateTodoDailyTemplateInput
): Promise<TodoDailyTemplate> {
  const db = getDbPool();
  let orderIndex = input.orderIndex;
  if (orderIndex === undefined) {
    const max = await db.query<{ max: string | null }>(
      `SELECT MAX(order_index)::text AS max FROM todo_daily_templates WHERE user_id = $1`,
      [userId]
    );
    const m = max.rows[0]?.max;
    orderIndex = m != null ? parseInt(m, 10) + 1 : 0;
  }

  const folderId =
    input.folderId != null ? parseInt(input.folderId, 10) : null;

  const result = await db.query<TemplateRow>(
    `INSERT INTO todo_daily_templates (id, user_id, title, description, priority, folder_id, days, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${RETURNING}`,
    [
      generateUuidV7(),
      userId,
      input.title,
      input.description ?? null,
      input.priority ?? 'medium',
      folderId,
      input.days,
      orderIndex,
    ]
  );
  return mapTemplate(result.rows[0]);
}

async function update(
  userId: number,
  input: UpdateTodoDailyTemplateInput
): Promise<TodoDailyTemplate> {
  await assertOwnership(input.id, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${i++}`);
    params.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${i++}`);
    params.push(input.description);
  }
  if (input.priority !== undefined) {
    updates.push(`priority = $${i++}`);
    params.push(input.priority);
  }
  if (input.folderId !== undefined) {
    updates.push(`folder_id = $${i++}`);
    params.push(input.folderId != null ? parseInt(input.folderId, 10) : null);
  }
  if (input.days !== undefined) {
    updates.push(`days = $${i++}`);
    params.push(input.days);
  }
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${i++}`);
    params.push(input.orderIndex);
  }

  if (updates.length === 0) {
    const row = await assertOwnership(input.id, userId);
    return mapTemplate(row);
  }

  updates.push(`updated_at = now()`);
  params.push(input.id);

  const db = getDbPool();
  const result = await db.query<TemplateRow>(
    `UPDATE todo_daily_templates SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${RETURNING}`,
    params
  );
  return mapTemplate(result.rows[0]);
}

async function remove(userId: number, id: string): Promise<boolean> {
  await assertOwnership(id, userId);
  await getDbPool().query('DELETE FROM todo_daily_templates WHERE id = $1', [id]);
  return true;
}

export const todoDailyTemplateService = { list, listByDay, getById, create, update, remove };
