import { expenseCategoryService } from '../../../services/expense-category.service';
import { withErrorHandling, requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  expenseCategoryInputSchema,
  expenseCategoryUpdateSchema,
  categoryIdSchema,
  categoryTypeFilterSchema,
} from '../../../validators/schemas/expense-category.schemas';

export const expenseCategoryResolvers = {
  Query: {
    walletExpenseCategory: withValidatedResolver(
      categoryIdSchema,
      async (_: any, { id }: { id: string }, context: any) => {
        requireAuth(context, 'walletExpenseCategory');
        return await expenseCategoryService.getCategoryById(id, context.user.id);
      },
      'walletExpenseCategory'
    ),

    walletExpenseCategories: withValidatedResolver(
      categoryTypeFilterSchema,
      async (_: any, { type }: { type?: 'income' | 'expense' }, context: any) => {
        requireAuth(context, 'walletExpenseCategories');
        return await expenseCategoryService.getCategories(context.user.id, type);
      },
      'walletExpenseCategories'
    ),
  },

  Mutation: {
    walletExpenseCategoryAdd: withValidatedResolver(
      expenseCategoryInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'walletExpenseCategoryAdd');
        return await expenseCategoryService.createCategory(context.user.id, input);
      },
      'walletExpenseCategoryAdd'
    ),

    walletExpenseCategoryUpdate: withValidatedResolver(
      expenseCategoryUpdateSchema,
      async (_: any, { id, input }: any, context: any) => {
        requireAuth(context, 'walletExpenseCategoryUpdate');
        return await expenseCategoryService.updateCategory(id, context.user.id, input);
      },
      'walletExpenseCategoryUpdate'
    ),

    walletExpenseCategoryRemove: withValidatedResolver(
      categoryIdSchema,
      async (_: any, { id }: any, context: any) => {
        requireAuth(context, 'walletExpenseCategoryRemove');
        return await expenseCategoryService.deleteCategory(id, context.user.id);
      },
      'walletExpenseCategoryRemove'
    ),
  },
};
