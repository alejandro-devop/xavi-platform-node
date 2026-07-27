import type { TodoFolder } from './todo-folder.types';
import type { TodoTag } from './todo-tag.types';

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TodoSubtask {
  id: string;
  todoId: string;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoSubtasksCount {
  total: number;
  completed: number;
}

export interface Todo {
  id: string;
  userId: number;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  selectedToday: boolean;
  createdAt: Date;
  updatedAt: Date;
  subtasks?: TodoSubtask[];
  subtasksCount?: TodoSubtasksCount;
  tags?: TodoTag[];
  folderId?: string | null;
  folder?: TodoFolder | null;
  orderIndex: number;
}

export interface TodoCollection {
  todos: Todo[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateTodoInput {
  title: string;
  description?: string | null;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: Date | string | null;
  selectedToday?: boolean;
  tagIds?: string[];
  folderId?: string | null;
  orderIndex?: number;
  /** UUID v7 del cliente para idempotencia offline. */
  clientId?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: Date | string | null;
  selectedToday?: boolean;
  tagIds?: string[];
  folderId?: string | null;
  orderIndex?: number;
}

export interface ReorderTodosInFolderInput {
  folderId: string | null;
  todoIds: string[];
}

export interface ListTodosOptions {
  status?: TodoStatus;
  priority?: TodoPriority;
  dueBefore?: Date | string;
  dueAfter?: Date | string;
  tagId?: string;
  folderId?: string;
  withoutFolder?: boolean;
  selectedToday?: boolean;
  pendingOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateTodoSubtaskInput {
  todoId: string;
  title: string;
  orderIndex?: number;
}

export interface UpdateTodoSubtaskInput {
  title?: string;
  isCompleted?: boolean;
  orderIndex?: number;
}
