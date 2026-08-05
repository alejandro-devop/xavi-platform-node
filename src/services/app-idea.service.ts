import { getDbPool } from '../shared/database/pool';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  AppIdea,
  AppIdeaCollection,
  AppIdeaStatus,
  CreateAppIdeaInput,
  ListAppIdeasOptions,
  UpdateAppIdeaInput,
} from '../types/services/app-idea.types';

type IdeaRow = {
  id: string;
  user_id: number;
  title: string;
  content_markdown: string;
  status: AppIdeaStatus;
  created_at: Date;
  updated_at: Date;
};

const IDEA_RETURNING = `id, user_id, title, content_markdown, status, created_at, updated_at`;

function mapIdea(row: IdeaRow): AppIdea {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentMarkdown: row.content_markdown,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getIdeaRowOrThrow(id: string): Promise<IdeaRow> {
  const db = getDbPool();
  const result = await db.query<IdeaRow>(
    `SELECT ${IDEA_RETURNING} FROM app_ideas WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) throw new NotFoundError('App idea not found');
  return result.rows[0];
}

async function getOwnedIdeaOrThrow(id: string, userId: number): Promise<IdeaRow> {
  const row = await getIdeaRowOrThrow(id);
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this app idea');
  }
  return row;
}

async function listAppIdeas(
  userId: number,
  options: ListAppIdeasOptions = {},
): Promise<AppIdeaCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;
  const search = options.search?.trim() || undefined;
  const status = options.status;

  const conditions: string[] = ['i.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (search) {
    conditions.push(`i.search_vector @@ plainto_tsquery('spanish', $${paramIndex})`);
    params.push(search);
    paramIndex++;
  }

  if (status) {
    conditions.push(`i.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const where = conditions.join(' AND ');
  const orderBy = search
    ? `ts_rank(i.search_vector, plainto_tsquery('spanish', $2)) DESC, i.updated_at DESC`
    : `i.updated_at DESC`;

  const [ideasResult, countResult] = await Promise.all([
    db.query<IdeaRow>(
      `SELECT i.id, i.user_id, i.title, i.content_markdown, i.status, i.created_at, i.updated_at
       FROM app_ideas i
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM app_ideas i WHERE ${where}`,
      params,
    ),
  ]);

  return {
    ideas: ideasResult.rows.map(mapIdea),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getAppIdeaById(id: string, userId: number): Promise<AppIdea> {
  const row = await getOwnedIdeaOrThrow(id, userId);
  return mapIdea(row);
}

async function createAppIdea(userId: number, input: CreateAppIdeaInput): Promise<AppIdea> {
  const db = getDbPool();
  const result = await db.query<IdeaRow>(
    `INSERT INTO app_ideas (user_id, title, content_markdown, status)
     VALUES ($1, $2, $3, $4)
     RETURNING ${IDEA_RETURNING}`,
    [userId, input.title.trim(), input.contentMarkdown ?? '', input.status ?? 'draft'],
  );
  return mapIdea(result.rows[0]);
}

async function updateAppIdea(
  id: string,
  userId: number,
  input: UpdateAppIdeaInput,
): Promise<AppIdea> {
  await getOwnedIdeaOrThrow(id, userId);
  const db = getDbPool();

  const sets: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    sets.push(`title = $${paramIndex}`);
    params.push(input.title.trim());
    paramIndex++;
  }
  if (input.contentMarkdown !== undefined) {
    sets.push(`content_markdown = $${paramIndex}`);
    params.push(input.contentMarkdown);
    paramIndex++;
  }
  if (input.status !== undefined) {
    sets.push(`status = $${paramIndex}`);
    params.push(input.status);
    paramIndex++;
  }

  if (sets.length > 0) {
    params.push(id);
    await db.query(
      `UPDATE app_ideas SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
      params,
    );
  }

  const row = await getIdeaRowOrThrow(id);
  return mapIdea(row);
}

async function deleteAppIdea(id: string, userId: number): Promise<boolean> {
  await getOwnedIdeaOrThrow(id, userId);
  await getDbPool().query('DELETE FROM app_ideas WHERE id = $1', [id]);
  return true;
}

export const appIdeaService = {
  listAppIdeas,
  getAppIdeaById,
  createAppIdea,
  updateAppIdea,
  deleteAppIdea,
};
