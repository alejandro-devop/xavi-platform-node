export interface Expense {
  id: string;
  userId: number;
  walletId: string;
  categoryId?: string | null;
  budgetId?: string | null;
  debit: number;
  credit: number;
  description: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseInput {
  walletId: string;
  categoryId?: string;
  budgetId?: string;
  debit?: number;
  credit?: number;
  description: string;
  date?: string;
}

export interface UpdateExpenseInput {
  walletId?: string;
  categoryId?: string;
  budgetId?: string;
  debit?: number;
  credit?: number;
  description?: string;
  date?: string;
}

export interface GetExpensesFilter {
  walletId?: string;
  categoryId?: string;
  budgetId?: string;
  startDate?: string;
  endDate?: string;
}
