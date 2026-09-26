import { walletCleanSlateService } from '../../../services/wallet-clean-slate.service';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import { walletCleanSlateInputSchema } from '../../../validators/schemas/wallet-clean-slate.schemas';
import type { WalletCleanSlateInput } from '../../../types/services/wallet-clean-slate.types';

export const walletCleanSlateResolvers = {
  Mutation: {
    walletCleanSlate: withValidatedResolver(
      walletCleanSlateInputSchema,
      async (
        _parent: unknown,
        { input }: { input: WalletCleanSlateInput },
        context: GraphQLContext
      ) => {
        requireAuth(context, 'walletCleanSlate');
        return walletCleanSlateService.cleanSlate(Number(context.user!.id), input);
      },
      'walletCleanSlate'
    ),
  },
};
