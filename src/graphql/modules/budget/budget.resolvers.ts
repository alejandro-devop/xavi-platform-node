import { GraphQLError } from 'graphql';

export const budgetResolvers = {
  Query: {
    walletBudget: () => null,
    walletBudgets: () => [],
    walletBudgetFollowUp: () => null,
    walletBudgetFollowUps: () => [],
  },

  Mutation: {
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
};
