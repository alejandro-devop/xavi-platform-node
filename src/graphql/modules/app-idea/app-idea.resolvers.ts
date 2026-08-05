import { appIdeaService } from '../../../services/app-idea.service';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  appIdeaAddInputSchema,
  appIdeaEditInputSchema,
  appIdeaIdArgSchema,
  appIdeasListArgsSchema,
} from '../../../validators/schemas/app-idea.schemas';

function uid(context: GraphQLContext): number {
  return Number(context.user!.id);
}

export const appIdeaResolvers = {
  Query: {
    appIdea: withValidatedResolver(
      appIdeaIdArgSchema,
      async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
        requireAuth(context, 'appIdea');
        return appIdeaService.getAppIdeaById(id, uid(context));
      },
      'appIdea',
    ),

    appIdeas: withValidatedResolver(
      appIdeasListArgsSchema,
      async (_: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
        requireAuth(context, 'appIdeas');
        return appIdeaService.listAppIdeas(uid(context), args as any);
      },
      'appIdeas',
    ),
  },

  Mutation: {
    appIdeaAdd: withValidatedResolver(
      appIdeaAddInputSchema,
      async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
        requireAuth(context, 'appIdeaAdd');
        return appIdeaService.createAppIdea(uid(context), input);
      },
      'appIdeaAdd',
    ),

    appIdeaEdit: withValidatedResolver(
      appIdeaEditInputSchema,
      async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
        requireAuth(context, 'appIdeaEdit');
        const { id, ...rest } = input;
        return appIdeaService.updateAppIdea(id, uid(context), rest);
      },
      'appIdeaEdit',
    ),

    appIdeaRemove: withValidatedResolver(
      appIdeaIdArgSchema,
      async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
        requireAuth(context, 'appIdeaRemove');
        return appIdeaService.deleteAppIdea(id, uid(context));
      },
      'appIdeaRemove',
    ),
  },
};
