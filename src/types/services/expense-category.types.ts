export interface ExpenseCategory {
  id: string;
  userId: number;
  name: string;
  type: 'income' | 'expense';
  color?: string | null;
  icon?: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseCategoryInput {
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  type?: 'income' | 'expense';
  color?: string;
  icon?: string;
}
