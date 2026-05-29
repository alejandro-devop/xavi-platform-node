export interface TodoTag {
  id: string;
  userId: number;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoTagInput {
  name: string;
  color: string;
}

export interface UpdateTodoTagInput {
  name?: string;
  color?: string;
}
