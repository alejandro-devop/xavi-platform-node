import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateLearningNoteInput,
  CreateLearningTagInput,
  LearningNote,
  LearningNoteCollection,
  LearningTag,
  ListLearningNotesOptions,
  UpdateLearningNoteInput,
} from '../types/services/learning-note.types';

type NoteRow = {
  id: string;
  user_id: number;
  title: string;
  content_markdown: string;
  created_at: Date;
  updated_at: Date;
};

type TagRow = {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
};

const NOTE_RETURNING = `id, user_id, title, content_markdown, created_at, updated_at`;
const TAG_RETURNING = `id, user_id, name, slug, created_at, updated_at`;

export function slugifyLearningTagName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

  if (!slug) {
    throw new BadRequestError('Tag name must contain at least one alphanumeric character');
  }
  return slug;
}

function mapTag(row: TagRow): LearningTag {
  return {
    id: String(row.id),
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNote(row: NoteRow, extras?: { tags?: LearningTag[] }): LearningNote {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentMarkdown: row.content_markdown,
    tags: extras?.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getNoteRowOrThrow(id: string): Promise<NoteRow> {
  const db = getDbPool();
  const result = await db.query<NoteRow>(
    `SELECT ${NOTE_RETURNING} FROM learning_notes WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) throw new NotFoundError('Learning note not found');
  return result.rows[0];
}

async function getOwnedNoteOrThrow(id: string, userId: number): Promise<NoteRow> {
  const row = await getNoteRowOrThrow(id);
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this learning note');
  }
  return row;
}

async function assertTagsOwnedByUser(userId: number, tagIds: string[]): Promise<number[]> {
  if (tagIds.length === 0) return [];
  const unique = [...new Set(tagIds.map((id) => parseInt(id, 10)))];
  const db = getDbPool();
  const result = await db.query<{ id: number }>(
    `SELECT id FROM learning_tags WHERE user_id = $1 AND id = ANY($2::int[])`,
    [userId, unique],
  );
  if (result.rows.length !== unique.length) {
    throw new BadRequestError('One or more tags were not found');
  }
  return unique;
}

async function setNoteTags(noteId: string, userId: number, tagIds: string[]): Promise<void> {
  const numericTagIds = await assertTagsOwnedByUser(userId, tagIds);
  const db = getDbPool();
  await db.query('DELETE FROM learning_note_tags WHERE note_id = $1', [noteId]);
  if (numericTagIds.length === 0) return;
  const values = numericTagIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await db.query(
    `INSERT INTO learning_note_tags (note_id, tag_id) VALUES ${values}`,
    [noteId, ...numericTagIds],
  );
}

async function listTagsForNote(noteId: string): Promise<LearningTag[]> {
  const db = getDbPool();
  const result = await db.query<TagRow>(
    `SELECT t.id, t.user_id, t.name, t.slug, t.created_at, t.updated_at
     FROM learning_tags t
     INNER JOIN learning_note_tags a ON a.tag_id = t.id
     WHERE a.note_id = $1
     ORDER BY t.name ASC`,
    [noteId],
  );
  return result.rows.map(mapTag);
}

async function loadTagsForNoteIds(noteIds: string[]): Promise<Map<string, LearningTag[]>> {
  const map = new Map<string, LearningTag[]>();
  if (noteIds.length === 0) return map;
  const db = getDbPool();
  const result = await db.query<TagRow & { note_id: string }>(
    `SELECT a.note_id, t.id, t.user_id, t.name, t.slug, t.created_at, t.updated_at
     FROM learning_note_tags a
     INNER JOIN learning_tags t ON t.id = a.tag_id
     WHERE a.note_id = ANY($1::uuid[])
     ORDER BY t.name ASC`,
    [noteIds],
  );
  for (const row of result.rows) {
    const list = map.get(row.note_id) ?? [];
    list.push(mapTag(row));
    map.set(row.note_id, list);
  }
  return map;
}

async function listLearningNotes(
  userId: number,
  options: ListLearningNotesOptions = {},
): Promise<LearningNoteCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;
  const search = options.search?.trim() || undefined;
  const tagSlugs = options.tags?.length ? [...new Set(options.tags)] : undefined;

  const conditions: string[] = ['n.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (search) {
    conditions.push(`n.search_vector @@ plainto_tsquery('spanish', $${paramIndex})`);
    params.push(search);
    paramIndex++;
  }

  if (tagSlugs?.length) {
    conditions.push(`(
      SELECT COUNT(DISTINCT t.slug)
      FROM learning_note_tags j
      INNER JOIN learning_tags t ON t.id = j.tag_id
      WHERE j.note_id = n.id AND t.slug = ANY($${paramIndex}::text[])
    ) = $${paramIndex + 1}`);
    params.push(tagSlugs, tagSlugs.length);
    paramIndex += 2;
  }

  const where = conditions.join(' AND ');
  const orderBy = search
    ? `ts_rank(n.search_vector, plainto_tsquery('spanish', $2)) DESC, n.updated_at DESC`
    : `n.updated_at DESC`;

  const [notesResult, countResult] = await Promise.all([
    db.query<NoteRow>(
      `SELECT n.id, n.user_id, n.title, n.content_markdown, n.created_at, n.updated_at
       FROM learning_notes n
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM learning_notes n WHERE ${where}`,
      params,
    ),
  ]);

  const noteIds = notesResult.rows.map((r) => r.id);
  const tagsMap = await loadTagsForNoteIds(noteIds);

  return {
    notes: notesResult.rows.map((row) => mapNote(row, { tags: tagsMap.get(row.id) ?? [] })),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getLearningNoteById(id: string, userId: number): Promise<LearningNote> {
  const row = await getOwnedNoteOrThrow(id, userId);
  const tags = await listTagsForNote(id);
  return mapNote(row, { tags });
}

async function createLearningNote(
  userId: number,
  input: CreateLearningNoteInput,
): Promise<LearningNote> {
  const db = getDbPool();
  const result = await db.query<NoteRow>(
    `INSERT INTO learning_notes (user_id, title, content_markdown)
     VALUES ($1, $2, $3)
     RETURNING ${NOTE_RETURNING}`,
    [userId, input.title.trim(), input.contentMarkdown ?? ''],
  );
  const note = mapNote(result.rows[0]);
  if (input.tagIds?.length) {
    await setNoteTags(note.id, userId, input.tagIds);
  }
  const tags = await listTagsForNote(note.id);
  return { ...note, tags };
}

async function updateLearningNote(
  id: string,
  userId: number,
  input: UpdateLearningNoteInput,
): Promise<LearningNote> {
  await getOwnedNoteOrThrow(id, userId);
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

  if (sets.length > 0) {
    params.push(id);
    await db.query(
      `UPDATE learning_notes SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
      params,
    );
  }

  if (input.tagIds !== undefined) {
    await setNoteTags(id, userId, input.tagIds);
  }

  const row = await getNoteRowOrThrow(id);
  const tags = await listTagsForNote(id);
  return mapNote(row, { tags });
}

async function deleteLearningNote(id: string, userId: number): Promise<boolean> {
  await getOwnedNoteOrThrow(id, userId);
  await getDbPool().query('DELETE FROM learning_notes WHERE id = $1', [id]);
  return true;
}

async function listLearningTags(userId: number, query?: string): Promise<LearningTag[]> {
  const db = getDbPool();
  const q = query?.trim();
  if (q) {
    const result = await db.query<TagRow>(
      `SELECT ${TAG_RETURNING}
       FROM learning_tags
       WHERE user_id = $1
         AND (name ILIKE $2 OR slug ILIKE $2)
       ORDER BY name ASC
       LIMIT 50`,
      [userId, `%${q}%`],
    );
    return result.rows.map(mapTag);
  }

  const result = await db.query<TagRow>(
    `SELECT ${TAG_RETURNING}
     FROM learning_tags
     WHERE user_id = $1
     ORDER BY name ASC
     LIMIT 200`,
    [userId],
  );
  return result.rows.map(mapTag);
}

async function createLearningTag(
  userId: number,
  input: CreateLearningTagInput,
): Promise<LearningTag> {
  const name = input.name.trim();
  const slug = slugifyLearningTagName(name);
  const db = getDbPool();

  const existing = await db.query<TagRow>(
    `SELECT ${TAG_RETURNING}
     FROM learning_tags
     WHERE user_id = $1 AND slug = $2
     LIMIT 1`,
    [userId, slug],
  );
  if (existing.rows.length > 0) {
    return mapTag(existing.rows[0]);
  }

  const result = await db.query<TagRow>(
    `INSERT INTO learning_tags (user_id, name, slug)
     VALUES ($1, $2, $3)
     RETURNING ${TAG_RETURNING}`,
    [userId, name, slug],
  );
  return mapTag(result.rows[0]);
}

export const learningNoteService = {
  listLearningNotes,
  getLearningNoteById,
  createLearningNote,
  updateLearningNote,
  deleteLearningNote,
  listLearningTags,
  createLearningTag,
  listTagsForNote,
};
