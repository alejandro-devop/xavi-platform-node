import { GraphQLError } from 'graphql';

export const frequencyResolvers = {
  Query: {
    walletFrequency: () => null,
    walletFrequencies: () => [],
  },

  Mutation: {
    walletFrequencyAdd: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletFrequencyUpdate: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
    walletFrequencyRemove: () => {
      throw new GraphQLError('Not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
  },
};
