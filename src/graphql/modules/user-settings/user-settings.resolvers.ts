import { userSettingsService } from '../../../services/user-settings.service';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import { updateUserSettingsInputSchema } from '../../../validators/schemas/user-settings.schemas';
import type { UpdateUserSettingsInput } from '../../../types/services/user-settings.types';

function uid(context: GraphQLContext): number {
  return Number(context.user!.id);
}

export const userSettingsResolvers = {
  Query: {
    mySettings: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'mySettings');
      return userSettingsService.getMySettings(uid(context));
    },
  },

  Mutation: {
    updateMySettings: withValidatedResolver(
      updateUserSettingsInputSchema,
      async (
        _parent: unknown,
        { input }: { input: UpdateUserSettingsInput },
        context: GraphQLContext
      ) => {
        requireAuth(context, 'updateMySettings');
        return userSettingsService.updateMySettings(uid(context), input);
      },
      'updateMySettings'
    ),
  },
};
