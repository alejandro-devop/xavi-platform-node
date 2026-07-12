import { walletTransferService } from '../../../services/wallet-transfer.service';
import { walletService } from '../../../services/wallet.service';
import { withErrorHandling, requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  walletTransferIdSchema,
  createWalletTransferInputSchema,
} from '../../../validators/schemas/wallet-transfer.schemas';

export const walletTransferResolvers = {
  Query: {
    walletTransfer: withValidatedResolver(
      walletTransferIdSchema,
      async (_: any, { id }: { id: string }, context: any) => {
        requireAuth(context, 'walletTransfer');
        return await walletTransferService.getTransferById(id, context.user.id);
      },
      'walletTransfer'
    ),
  },

  Mutation: {
    walletTransferCreate: withValidatedResolver(
      createWalletTransferInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'walletTransferCreate');
        return await walletTransferService.createTransfer(context.user.id, input);
      },
      'walletTransferCreate'
    ),

    walletTransferRemove: withValidatedResolver(
      walletTransferIdSchema,
      async (_: any, { id }: { id: string }, context: any) => {
        requireAuth(context, 'walletTransferRemove');
        return await walletTransferService.deleteTransfer(id, context.user.id);
      },
      'walletTransferRemove'
    ),
  },

  WalletTransfer: {
    fromWallet: async (parent: any, _: any, context: any) => {
      if (!parent.fromWalletId) return null;
      try {
        return await walletService.getWalletById(parent.fromWalletId, context.user.id);
      } catch {
        return null;
      }
    },

    toWallet: async (parent: any, _: any, context: any) => {
      if (!parent.toWalletId) return null;
      try {
        return await walletService.getWalletById(parent.toWalletId, context.user.id);
      } catch {
        return null;
      }
    },
  },
};
