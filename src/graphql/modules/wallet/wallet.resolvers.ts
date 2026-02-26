import { walletService } from '../../../services/wallet.service';
import { withErrorHandling, requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  walletInputSchema,
  walletUpdateSchema,
  walletIdSchema,
} from '../../../validators/schemas/wallet.schemas';

export const walletResolvers = {
  Query: {
    wallet: withValidatedResolver(
      walletIdSchema,
      async (_: any, { id }: { id: string }, context: any) => {
        requireAuth(context, 'wallet');
        return await walletService.getWalletById(id, context.user.id);
      },
      'wallet'
    ),

    wallets: withErrorHandling(async (_: any, __: any, context: any) => {
      requireAuth(context, 'wallets');
      return await walletService.getWallets(context.user.id);
    }, 'wallets'),
  },

  Mutation: {
    walletAdd: withValidatedResolver(
      walletInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'walletAdd');
        return await walletService.createWallet(context.user.id, input);
      },
      'walletAdd'
    ),

    walletUpdate: withValidatedResolver(
      walletUpdateSchema,
      async (_: any, { id, input }: any, context: any) => {
        requireAuth(context, 'walletUpdate');
        return await walletService.updateWallet(id, context.user.id, input);
      },
      'walletUpdate'
    ),

    walletRemove: withValidatedResolver(
      walletIdSchema,
      async (_: any, { id }: any, context: any) => {
        requireAuth(context, 'walletRemove');
        return await walletService.deleteWallet(id, context.user.id);
      },
      'walletRemove'
    ),

    walletCleanSlate: withErrorHandling(async (_: any, __: any, context: any) => {
      requireAuth(context, 'walletCleanSlate');
      return await walletService.cleanSlate(context.user.id);
    }, 'walletCleanSlate'),
  },
};
