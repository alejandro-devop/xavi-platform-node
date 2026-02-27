import { expenseService } from '../../../services/expense.service';
import { walletService } from '../../../services/wallet.service';
import { expenseCategoryService } from '../../../services/expense-category.service';
import { withErrorHandling, requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  expenseInputSchema,
  expenseUpdateSchema,
  expenseIdSchema,
  expenseFilterSchema,
} from '../../../validators/schemas/expense.schemas';

export const expenseResolvers = {
  Query: {
    walletExpense: withValidatedResolver(
      expenseIdSchema,
      async (_: any, { id }: { id: string }, context: any) => {
        requireAuth(context, 'walletExpense');
        return await expenseService.getExpenseById(id, context.user.id);
      },
      'walletExpense'
    ),

    walletExpenses: withValidatedResolver(
      expenseFilterSchema,
      async (_: any, args: any, context: any) => {
        requireAuth(context, 'walletExpenses');
        return await expenseService.getExpenses(context.user.id, args);
      },
      'walletExpenses'
    ),
  },

  Mutation: {
    walletExpenseAdd: withValidatedResolver(
      expenseInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'walletExpenseAdd');
        return await expenseService.createExpense(context.user.id, input);
      },
      'walletExpenseAdd'
    ),

    walletExpenseUpdate: withValidatedResolver(
      expenseUpdateSchema,
      async (_: any, { id, input }: any, context: any) => {
        requireAuth(context, 'walletExpenseUpdate');
        return await expenseService.updateExpense(id, context.user.id, input);
      },
      'walletExpenseUpdate'
    ),

    walletExpenseRemove: withValidatedResolver(
      expenseIdSchema,
      async (_: any, { id }: any, context: any) => {
        requireAuth(context, 'walletExpenseRemove');
        return await expenseService.deleteExpense(id, context.user.id);
      },
      'walletExpenseRemove'
    ),
  },

  WalletExpense: {
    wallet: async (parent: any, _: any, context: any) => {
      if (!parent.walletId) return null;
      try {
        return await walletService.getWalletById(parent.walletId, context.user.id);
      } catch (error) {
        return null;
      }
    },

    category: async (parent: any, _: any, context: any) => {
      if (!parent.categoryId) return null;
      try {
        return await expenseCategoryService.getCategoryById(parent.categoryId, context.user.id);
      } catch (error) {
        return null;
      }
    },

    budget: async (parent: any) => {
      // Budget service not yet implemented
      return null;
    },
  },
};
