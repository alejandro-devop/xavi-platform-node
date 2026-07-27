export interface LearningTag {
  id: string;
  userId: number;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningNote {
  id: string;
  userId: number;
  title: string;
  contentMarkdown: string;
  tags?: LearningTag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningNoteCollection {
  notes: LearningNote[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateLearningNoteInput {
  title: string;
  contentMarkdown?: string;
  tagIds?: string[];
}

export interface UpdateLearningNoteInput {
  title?: string;
  contentMarkdown?: string;
  tagIds?: string[];
}

export interface ListLearningNotesOptions {
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface CreateLearningTagInput {
  name: string;
}
