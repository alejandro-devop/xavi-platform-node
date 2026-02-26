export interface ExpenseCategory {
  id: string;
  userId: number;
  name: string;
  type: 'income' | 'expense';
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  isSystem: boolean;
  isTransaction: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseCategoryInput {
  name: string;
  type: 'income' | 'expense';
  description?: string;
  color?: string;
  icon?: string;
  isTransaction?: boolean;
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  type?: 'income' | 'expense';
  description?: string;
  color?: string;
  icon?: string;
  isTransaction?: boolean;
}
