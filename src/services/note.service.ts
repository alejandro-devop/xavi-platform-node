import { getDbPool } from '../shared/database/pool';
import { todoTagService } from './todo-tag.service';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  CreateNoteInput,
  ListNotesOptions,
  Note,
  NoteCollection,
  UpdateNoteInput,
} from '../types/services/note.types';
import type { TodoTag } from '../types/services/todo-tag.types';

type NoteRow = {
  id: string;
  user_id: number;
  content: string;
  created_at: Date;
  updated_at: Date;
};

const NOTE_RETURNING = `id, user_id, content, created_at, updated_at`;

function mapNote(row: NoteRow, extras?: { tags?: TodoTag[] }): Note {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    tags: extras?.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getNoteRowOrThrow(id: string): Promise<NoteRow> {
  const db = getDbPool();
  const result = await db.query<NoteRow>(`SELECT ${NOTE_RETURNING} FROM notes WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw new NotFoundError('Note not found');
  return result.rows[0];
}

async function getOwnedNoteOrThrow(id: string, userId: number): Promise<NoteRow> {
  const row = await getNoteRowOrThrow(id);
  if (row.user_id !== userId) throw new ForbiddenError('You do not have permission to access this note');
  return row;
}

async function setNoteTags(noteId: string, userId: number, tagIds: string[]): Promise<void> {
  const numericTagIds = await todoTagService.assertTagsOwnedByUser(userId, tagIds);
  const db = getDbPool();
  await db.query('DELETE FROM note_tag_assignments WHERE note_id = $1', [noteId]);
  if (numericTagIds.length === 0) return;
  const values = numericTagIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await db.query(
    `INSERT INTO note_tag_assignments (note_id, tag_id) VALUES ${values}`,
    [noteId, ...numericTagIds],
  );
}

async function listTagsForNote(noteId: string): Promise<TodoTag[]> {
  const db = getDbPool();
  const result = await db.query<NoteRow & { user_id: number; name: string; color: string }>(
    `SELECT t.id, t.user_id, t.name, t.color, t.created_at, t.updated_at
     FROM todo_tags t
     INNER JOIN note_tag_assignments a ON a.tag_id = t.id
     WHERE a.note_id = $1
     ORDER BY t.name ASC`,
    [noteId],
  );
  return result.rows.map((r: any) => ({
    id: String(r.id),
    userId: r.user_id,
    name: r.name,
    color: r.color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

async function loadTagsForNoteIds(noteIds: string[]): Promise<Map<string, TodoTag[]>> {
  const map = new Map<string, TodoTag[]>();
  if (noteIds.length === 0) return map;
  const db = getDbPool();
  const result = await db.query<any>(
    `SELECT a.note_id, t.id, t.user_id, t.name, t.color, t.created_at, t.updated_at
     FROM note_tag_assignments a
     INNER JOIN todo_tags t ON t.id = a.tag_id
     WHERE a.note_id = ANY($1)
     ORDER BY t.name ASC`,
    [noteIds],
  );
  for (const row of result.rows) {
    const list = map.get(row.note_id) ?? [];
    list.push({ id: String(row.id), userId: row.user_id, name: row.name, color: row.color, createdAt: row.created_at, updatedAt: row.updated_at });
    map.set(row.note_id, list);
  }
  return map;
}

async function listNotes(userId: number, options: ListNotesOptions = {}): Promise<NoteCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['n.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (options.tagId) {
    conditions.push(`EXISTS (SELECT 1 FROM note_tag_assignments a WHERE a.note_id = n.id AND a.tag_id = $${paramIndex})`);
    params.push(parseInt(options.tagId, 10));
    paramIndex++;
  }
  if (options.dateFrom) {
    conditions.push(`n.created_at >= $${paramIndex}`);
    params.push(options.dateFrom);
    paramIndex++;
  }
  if (options.dateTo) {
    conditions.push(`n.created_at <= $${paramIndex}`);
    params.push(options.dateTo);
    paramIndex++;
  }

  const where = conditions.join(' AND ');

  const [notesResult, countResult] = await Promise.all([
    db.query<NoteRow>(
      `SELECT ${NOTE_RETURNING} FROM notes n WHERE ${where} ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM notes n WHERE ${where}`,
      params,
    ),
  ]);

  const notes = notesResult.rows.map((r) => mapNote(r));
  const noteIds = notesResult.rows.map((r) => r.id);
  const tagsMap = await loadTagsForNoteIds(noteIds);

  return {
    notes: notes.map((n) => ({ ...n, tags: tagsMap.get(n.id) ?? [] })),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getNoteById(id: string, userId: number): Promise<Note> {
  const row = await getOwnedNoteOrThrow(id, userId);
  const tags = await listTagsForNote(id);
  return mapNote(row, { tags });
}

async function createNote(userId: number, input: CreateNoteInput): Promise<Note> {
  const db = getDbPool();
  const result = await db.query<NoteRow>(
    `INSERT INTO notes (user_id, content) VALUES ($1, $2) RETURNING ${NOTE_RETURNING}`,
    [userId, input.content],
  );
  const note = mapNote(result.rows[0]);
  if (input.tagIds?.length) {
    await setNoteTags(note.id, userId, input.tagIds);
  }
  const tags = await listTagsForNote(note.id);
  return { ...note, tags };
}

async function updateNote(id: string, userId: number, input: UpdateNoteInput): Promise<Note> {
  await getOwnedNoteOrThrow(id, userId);

  if (input.content !== undefined) {
    const db = getDbPool();
    await db.query('UPDATE notes SET content = $1 WHERE id = $2', [input.content, id]);
  }
  if (input.tagIds !== undefined) {
    await setNoteTags(id, userId, input.tagIds);
  }

  const row = await getNoteRowOrThrow(id);
  const tags = await listTagsForNote(id);
  return mapNote(row, { tags });
}

async function deleteNote(id: string, userId: number): Promise<boolean> {
  await getOwnedNoteOrThrow(id, userId);
  await getDbPool().query('DELETE FROM notes WHERE id = $1', [id]);
  return true;
}

export const noteService = {
  listNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  listTagsForNote,
};
