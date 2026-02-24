import { GraphQLError } from 'graphql';
import { walletService } from '../services/wallet.service';
import { expenseCategoryService } from '../services/expense-category.service';
import { expenseService } from '../services/expense.service';

export const resolvers = {
  Query: {
    health: () => ({
      status: 'healthy',
      timestamp: new Date(),
    }),

    // Wallet queries
    wallet: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.getWalletById(id, context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    wallets: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.getWallets(context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    // Expense category queries
    walletExpenseCategory: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseCategoryService.getCategoryById(id, context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletExpenseCategories: async (_: any, { type }: { type?: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseCategoryService.getCategories(context.user.id, type as any);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    // Expense queries
    walletExpense: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseService.getExpenseById(id, context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletExpenses: async (_: any, { filter }: { filter?: any }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseService.getExpenses(context.user.id, filter);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    // All other queries return empty/null for now
    walletScheduledExpense: () => null,
    walletScheduledExpenses: () => [],
    walletBudget: () => null,
    walletBudgets: () => [],
    budgetFollowUp: () => null,
    budgetFollowUps: () => [],
    walletFrequency: () => null,
    walletFrequencies: () => [],
    walletPeriod: () => null,
    walletPeriods: () => [],
  },

  Mutation: {
    // Wallet mutations
    walletAdd: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.createWallet(context.user.id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletUpdate: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.updateWallet(id, context.user.id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletRemove: async (_: any, { id }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.deleteWallet(id, context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletCleanSlate: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.cleanSlate(context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    // Category mutations
    walletExpenseCategoryAdd: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseCategoryService.createCategory(context.user.id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletExpenseCategoryUpdate: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseCategoryService.updateCategory(id, context.user.id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletExpenseCategoryRemove: async (_: any, { id }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseCategoryService.deleteCategory(id, context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    // Expense mutations
    walletExpenseAdd: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseService.createExpense(context.user.id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletExpenseUpdate: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseService.updateExpense(id, context.user.id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletExpenseRemove: async (_: any, { id }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseService.deleteExpense(id, context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    // Scheduled expense mutations
    walletScheduledExpenseAdd: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletScheduledExpenseUpdate: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletScheduledExpenseRemove: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletPayScheduled: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletCancelScheduled: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },

    // Budget mutations
    walletBudgetAdd: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletBudgetUpdate: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletBudgetRemove: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    applyBudgetToExpenses: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },

    // Budget follow-up mutations
    walletBudgetFollowUpAdd: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletBudgetFollowUpUpdate: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletBudgetFollowUpRemove: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },

    // Frequency mutations
    walletFrequencyAdd: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletFrequencyUpdate: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletFrequencyRemove: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },

    // Period mutations
    walletPeriodAdd: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletPeriodUpdate: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletPeriodRemove: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
  },
};
