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

export interface BudgetClosure {
  id: string;
  budgetId: string;
  userId: number;
  periodStart: string;
  periodEnd: string;
  plannedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  overspentAmount: number;
  expensesCount: number;
  notes?: string | null;
  closedAt: Date;
  createdAt: Date;
}

export interface CloseBudgetPeriodInput {
  budgetId: string;
  notes?: string;
}

export interface BulkCloseBudgetPeriodsInput {
  inputs: CloseBudgetPeriodInput[];
}
