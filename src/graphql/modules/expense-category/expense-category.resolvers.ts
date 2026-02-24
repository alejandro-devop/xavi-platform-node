import { GraphQLError } from 'graphql';
import { expenseCategoryService } from '../../../services/expense-category.service';

export const expenseCategoryResolvers = {
  Query: {
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

    walletExpenseCategories: async (
      _: any,
      { type }: { type?: 'income' | 'expense' },
      context: any
    ) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await expenseCategoryService.getCategories(context.user.id, type);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },
  },

  Mutation: {
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
  },
};
