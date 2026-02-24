import { expenseService } from '../../../services/expense.service';
import { withErrorHandling, requireAuth } from '../../utils/error-handler';

export const expenseResolvers = {
  Query: {
    walletExpense: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context, 'walletExpense');
      return await expenseService.getExpenseById(id, context.user.id);
    }, 'walletExpense'),

    walletExpenses: withErrorHandling(async (_: any, args: any, context: any) => {
      requireAuth(context, 'walletExpenses');
      return await expenseService.getExpenses(context.user.id, args);
    }, 'walletExpenses'),
  },

  Mutation: {
    walletExpenseAdd: withErrorHandling(async (_: any, { input }: any, context: any) => {
      requireAuth(context, 'walletExpenseAdd');
      return await expenseService.createExpense(context.user.id, input);
    }, 'walletExpenseAdd'),

    walletExpenseUpdate: withErrorHandling(async (_: any, { id, input }: any, context: any) => {
      requireAuth(context, 'walletExpenseUpdate');
      return await expenseService.updateExpense(id, context.user.id, input);
    }, 'walletExpenseUpdate'),

    walletExpenseRemove: withErrorHandling(async (_: any, { id }: any, context: any) => {
      requireAuth(context, 'walletExpenseRemove');
      return await expenseService.deleteExpense(id, context.user.id);
    }, 'walletExpenseRemove'),
  },
};
