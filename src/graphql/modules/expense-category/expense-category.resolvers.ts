import { expenseCategoryService } from '../../../services/expense-category.service';
import { withErrorHandling, requireAuth } from '../../utils/error-handler';
import { withValidatedResolver, withAsyncValidatedResolver } from '../../utils/validation';
import {
  expenseCategoryInputSchema,
  expenseCategoryUpdateSchema,
  categoryIdSchema,
  categoryTypeFilterSchema,
  createExpenseCategoryInputSchema,
  createExpenseCategoryUpdateSchema,
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
    walletExpenseCategoryAdd: withAsyncValidatedResolver(
      createExpenseCategoryInputSchema(0), // Placeholder - will be replaced with actual userId
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'walletExpenseCategoryAdd');
        // Validate with user-specific schema
        const schema = createExpenseCategoryInputSchema(context.user.id);
        const validatedInput = await schema.parseAsync(input);
        return await expenseCategoryService.createCategory(context.user.id, validatedInput);
      },
      'walletExpenseCategoryAdd'
    ),

    walletExpenseCategoryUpdate: withErrorHandling(
      async (_: any, { id, input }: any, context: any) => {
        requireAuth(context, 'walletExpenseCategoryUpdate');
        // Validate ID format
        categoryIdSchema.parse({ id });
        // Validate with user-specific schema that excludes current category
        const schema = createExpenseCategoryUpdateSchema(context.user.id, id);
        const validatedInput = await schema.parseAsync(input);
        return await expenseCategoryService.updateCategory(id, context.user.id, validatedInput);
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
