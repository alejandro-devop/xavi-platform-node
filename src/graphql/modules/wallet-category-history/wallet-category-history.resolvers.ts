import { walletCategoryHistoryService } from '../../../services/wallet-category-history.service';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';

export const walletCategoryHistoryResolvers = {
  Query: {
    walletCategoryHistory: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'walletCategoryHistory');
      return walletCategoryHistoryService.history(Number(context.user!.id));
    },
  },
};
