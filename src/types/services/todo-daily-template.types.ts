export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TodoDailyTemplate {
  id: string;
  userId: number;
  title: string;
  description: string | null;
  priority: TodoPriority;
  folderId: string | null;
  days: number[];
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoDailyTemplateInput {
  title: string;
  description?: string | null;
  priority?: TodoPriority;
  folderId?: string | null;
  days: number[];
  orderIndex?: number;
}

export interface UpdateTodoDailyTemplateInput {
  id: string;
  title?: string;
  description?: string | null;
  priority?: TodoPriority;
  folderId?: string | null;
  days?: number[];
  orderIndex?: number;
}
