import { GraphQLError } from 'graphql';

export const periodResolvers = {
  Query: {
    walletPeriod: () => null,
    walletPeriods: () => [],
  },

  Mutation: {
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
