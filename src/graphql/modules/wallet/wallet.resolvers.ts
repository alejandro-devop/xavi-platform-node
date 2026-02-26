import { walletService } from '../../../services/wallet.service';
import { withErrorHandling, requireAuth } from '../../utils/error-handler';
import { withValidatedResolver, withAsyncValidatedResolver } from '../../utils/validation';
import {
  walletInputSchema,
  walletUpdateSchema,
  walletIdSchema,
  createWalletInputSchema,
  createWalletUpdateSchema,
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
    walletAdd: withAsyncValidatedResolver(
      createWalletInputSchema(0), // Placeholder - will be replaced with actual userId
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'walletAdd');
        // Validate with user-specific schema
        const schema = createWalletInputSchema(context.user.id);
        const validatedInput = await schema.parseAsync(input);
        return await walletService.createWallet(context.user.id, validatedInput);
      },
      'walletAdd'
    ),

    walletUpdate: withAsyncValidatedResolver(
      walletIdSchema,
      async (_: any, { id, input }: any, context: any) => {
        requireAuth(context, 'walletUpdate');
        // Validate with user-specific schema that excludes current wallet
        const schema = createWalletUpdateSchema(context.user.id, id);
        const validatedInput = await schema.parseAsync(input);
        return await walletService.updateWallet(id, context.user.id, validatedInput);
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
