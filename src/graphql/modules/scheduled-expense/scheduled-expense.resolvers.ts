import { GraphQLError } from 'graphql';

export const scheduledExpenseResolvers = {
  Query: {
    walletScheduledExpense: () => null,
    walletScheduledExpenses: () => [],
  },

  Mutation: {
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
  },
};
