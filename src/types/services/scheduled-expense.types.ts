export type RepeatType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface ScheduledExpense {
  id: string;
  userId: number;
  walletId: string;
  categoryId?: string | null;
  budgetId?: string | null;
  parentId?: string | null;
  expenseId?: string | null;
  amount: number;
  description: string;
  dueDate: string;
  isPaid: boolean;
  paidDate?: Date | null;
  repeatType?: RepeatType | null;
  endDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduledExpenseInput {
  walletId: string;
  categoryId?: string | null;
  budgetId?: string | null;
  amount: number;
  description: string;
  dueDate: string;
  repeatType?: RepeatType;
  endDate?: string;
}

export interface UpdateScheduledExpenseInput {
  walletId?: string;
  categoryId?: string | null;
  budgetId?: string | null;
  amount?: number;
  description?: string;
  // Note: dueDate, repeatType, and endDate cannot be updated
  // To change recurrence settings, create a new scheduled expense
}

export interface GetScheduledExpensesFilter {
  walletId?: string;
  categoryId?: string;
  budgetId?: string;
  parentId?: string;
  isPaid?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PayScheduledExpenseInput {
  id: string;
  amountPaid?: number;
  paidDate?: string;
}

export interface BulkUpdateScheduledExpensesInput {
  parentId: string;
  amount?: number;
  description?: string;
  categoryId?: string | null;
  budgetId?: string | null;
}

export interface BulkDeleteScheduledExpensesInput {
  parentId: string;
}
