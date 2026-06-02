import type { TodoTag } from './todo-tag.types';

export interface Note {
  id: string;
  userId: number;
  content: string;
  tags?: TodoTag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteCollection {
  notes: Note[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateNoteInput {
  content: string;
  tagIds?: string[];
}

export interface UpdateNoteInput {
  content?: string;
  tagIds?: string[];
}

export interface ListNotesOptions {
  tagId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
  limit?: number;
}
