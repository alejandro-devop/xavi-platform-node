import { generateCaptureToken } from '../../../shared/utils/capture-token';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';

export const walletCaptureResolvers = {
  Mutation: {
    walletCaptureToken: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'walletCaptureToken');
      return generateCaptureToken(Number(context.user!.id));
    },
  },
};
