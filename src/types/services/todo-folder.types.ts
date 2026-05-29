export interface TodoFolder {
  id: string;
  userId: number;
  name: string;
  color: string;
  orderIndex: number;
  todoCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoFolderInput {
  name: string;
  color: string;
  orderIndex?: number;
}

export interface UpdateTodoFolderInput {
  name?: string;
  color?: string;
  orderIndex?: number;
}
