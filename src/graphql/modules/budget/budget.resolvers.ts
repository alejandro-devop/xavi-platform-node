import { GraphQLError } from 'graphql';
import { budgetService } from '../../../services/budget.service';
import { expenseService } from '../../../services/expense.service';
import { walletService } from '../../../services/wallet.service';
import { getDb } from '../../../shared/database/drizzle';
import { walletFrequencies } from '../../../shared/database/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, withErrorHandling } from '../../utils/error-handler';
import { withAsyncValidatedResolver, withValidatedResolver } from '../../utils/validation';
import {
  applyBudgetToExpensesSchema,
  budgetFilterSchema,
  budgetIdSchema,
  budgetInputSchema,
  budgetUpdateSchema,
  createBudgetInputSchema,
  createBudgetUpdateSchema,
} from '../../../validators/schemas/budget.schemas';

export const budgetResolvers = {
  Query: {
    walletBudget: withValidatedResolver(
      budgetIdSchema,
      async (_: any, { id }: { id: string }, context: any) => {
        requireAuth(context, 'walletBudget');
        return await budgetService.getBudgetById(id, context.user.id);
      },
      'walletBudget'
    ),

    walletBudgets: withValidatedResolver(
      budgetFilterSchema,
      async (_: any, args: any, context: any) => {
        requireAuth(context, 'walletBudgets');
        return await budgetService.getBudgets(context.user.id, args);
      },
      'walletBudgets'
    ),

    walletBudgetFollowUp: () => null,
    walletBudgetFollowUps: () => [],
  },

  Mutation: {
    walletBudgetAdd: withAsyncValidatedResolver(
      createBudgetInputSchema(0),
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'walletBudgetAdd');
        const schema = createBudgetInputSchema(context.user.id);
        const validatedInput = await schema.parseAsync(input);
        return await budgetService.createBudget(context.user.id, validatedInput);
      },
      'walletBudgetAdd'
    ),

    walletBudgetUpdate: withErrorHandling(async (_: any, { id, input }: any, context: any) => {
      requireAuth(context, 'walletBudgetUpdate');
      budgetIdSchema.parse({ id });
      const schema = createBudgetUpdateSchema(context.user.id, id);
      const validatedInput = await schema.parseAsync(input);
      return await budgetService.updateBudget(id, context.user.id, validatedInput);
    }, 'walletBudgetUpdate'),

    walletBudgetRemove: withValidatedResolver(
      budgetIdSchema,
      async (_: any, { id }: any, context: any) => {
        requireAuth(context, 'walletBudgetRemove');
        return await budgetService.deleteBudget(id, context.user.id);
      },
      'walletBudgetRemove'
    ),

    applyBudgetToExpenses: withValidatedResolver(
      applyBudgetToExpensesSchema,
      async (_: any, { expensesIds, budgetId, scheduled }: any, context: any) => {
        requireAuth(context, 'applyBudgetToExpenses');
        return await budgetService.applyBudgetToExpenses(context.user.id, {
          expensesIds,
          budgetId,
          scheduled,
        });
      },
      'applyBudgetToExpenses'
    ),

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
  },

  WalletBudget: {
    wallet: async (parent: any, _: any, context: any) => {
      if (!parent.walletId) return null;
      try {
        return await walletService.getWalletById(parent.walletId, context.user.id);
      } catch (error) {
        return null;
      }
    },

    frequency: async (parent: any, _: any, context: any) => {
      if (!parent.frequencyId) return null;

      const db = getDb();
      const [frequency] = await db
        .select()
        .from(walletFrequencies)
        .where(eq(walletFrequencies.id, parent.frequencyId));

      if (!frequency) return null;
      if (frequency.userId !== context.user.id) return null;

      return frequency;
    },

    expenses: async (parent: any, _: any, context: any) => {
      try {
        return await expenseService.getExpenses(context.user.id, { budgetId: parent.id });
      } catch (error) {
        return [];
      }
    },

    followUps: async () => [],
  },
};
