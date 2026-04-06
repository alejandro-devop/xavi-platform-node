export interface Budget {
  id: string;
  userId: number;
  walletId?: string | null;
  frequencyId?: string | null;
  name: string;
  description?: string | null;
  icon?: string | null;
  amount: number;
  balance: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetInput {
  walletId?: string | null;
  frequencyId?: string | null;
  name: string;
  description?: string | null;
  icon?: string | null;
  amount: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateBudgetInput {
  walletId?: string | null;
  frequencyId?: string | null;
  name?: string;
  description?: string | null;
  icon?: string | null;
  amount?: number;
  balance?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface GetBudgetsFilter {
  walletId?: string;
  isActive?: boolean;
}

export interface ApplyBudgetToExpensesInput {
  expensesIds: string[];
  budgetId: string;
  scheduled?: boolean;
}
