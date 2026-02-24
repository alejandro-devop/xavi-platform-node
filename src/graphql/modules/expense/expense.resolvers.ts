import { GraphQLError } from 'graphql';
import { expenseService } from '../../../services/expense.service';

export const expenseResolvers = {
  Query: {
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

    walletExpenses: async (_: any, args: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseService.getExpenses(context.user.id, args);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },
  },

  Mutation: {
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
  },
};
