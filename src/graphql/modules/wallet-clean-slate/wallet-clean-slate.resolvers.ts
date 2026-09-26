import { walletCleanSlateService } from '../../../services/wallet-clean-slate.service';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import { walletCleanSlateInputSchema } from '../../../validators/schemas/wallet-clean-slate.schemas';
import type { WalletCleanSlateInput } from '../../../types/services/wallet-clean-slate.types';

export const walletCleanSlateResolvers = {
  Mutation: {
    walletCleanSlateProtocol: withValidatedResolver(
      walletCleanSlateInputSchema,
      async (
        _parent: unknown,
        { input }: { input: WalletCleanSlateInput },
        context: GraphQLContext
      ) => {
        requireAuth(context, 'walletCleanSlateProtocol');
        return walletCleanSlateService.cleanSlate(Number(context.user!.id), input);
      },
      'walletCleanSlateProtocol'
    ),
  },
};
