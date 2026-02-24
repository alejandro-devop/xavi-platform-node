import { mergeResolvers } from '@graphql-tools/merge';
import { healthResolvers } from './modules/common/health.resolvers';
import { walletResolvers } from './modules/wallet/wallet.resolvers';
import { expenseCategoryResolvers } from './modules/expense-category/expense-category.resolvers';
import { expenseResolvers } from './modules/expense/expense.resolvers';
import { scheduledExpenseResolvers } from './modules/scheduled-expense/scheduled-expense.resolvers';
import { budgetResolvers } from './modules/budget/budget.resolvers';
import { frequencyResolvers } from './modules/frequency/frequency.resolvers';
import { periodResolvers } from './modules/period/period.resolvers';

// Merge all resolvers
export const resolvers = mergeResolvers([
  healthResolvers,
  walletResolvers,
  expenseCategoryResolvers,
  expenseResolvers,
  scheduledExpenseResolvers,
  budgetResolvers,
  frequencyResolvers,
  periodResolvers,
]);
