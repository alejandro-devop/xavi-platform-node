import { GraphQLError } from 'graphql';
import { walletService } from '../../../services/wallet.service';

export const walletResolvers = {
  Query: {
    wallet: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.getWalletById(id, context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    wallets: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.getWallets(context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },
  },

  Mutation: {
    walletAdd: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.createWallet(context.user.id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletUpdate: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.updateWallet(id, context.user.id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletRemove: async (_: any, { id }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.deleteWallet(id, context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },

    walletCleanSlate: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await walletService.cleanSlate(context.user.id);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: { code: error.name },
        });
      }
    },
  },
};
