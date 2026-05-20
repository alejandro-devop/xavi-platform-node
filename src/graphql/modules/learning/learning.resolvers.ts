import { learningService } from '../../../services/learning.service';
import type { LearningResource } from '../../../types/services/learning.types';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  learningProgressAddInputSchema,
  learningProgressEditInputSchema,
  learningProgressRemoveInputSchema,
  learningResourceAddInputSchema,
  learningResourceEditInputSchema,
  learningResourceIdArgSchema,
  learningResourcesListArgsSchema,
} from '../../../validators/schemas/learning.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const learningResolvers = {
  LearningResource: {
    progressStats: (parent: LearningResource) =>
      parent.progressStats ?? { totalSessions: 0, totalTimeSpent: 0, currentProgress: 0 },

    progressSessions: async (
      parent: LearningResource,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'LearningResource.progressSessions');
      if (parent.progressSessions) return parent.progressSessions;
      return await learningService.listProgressSessions(parseInt(parent.id, 10));
    },
  },

  Query: {
    learningResource: withValidatedResolver(
      learningResourceIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'learningResource');
        return await learningService.getLearningResourceById(id, uid(context));
      },
      'learningResource'
    ),

    learningResources: withValidatedResolver(
      learningResourcesListArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'learningResources');
        return await learningService.listLearningResources(uid(context), args);
      },
      'learningResources'
    ),
  },

  Mutation: {
    learningResourceAdd: withValidatedResolver(
      learningResourceAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'learningResourceAdd');
        return await learningService.createLearningResource(uid(context), input);
      },
      'learningResourceAdd'
    ),

    learningResourceEdit: withValidatedResolver(
      learningResourceEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'learningResourceEdit');
        const { id, ...fields } = input;
        return await learningService.updateLearningResource(id, uid(context), fields);
      },
      'learningResourceEdit'
    ),

    learningResourceRemove: withValidatedResolver(
      learningResourceIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'learningResourceRemove');
        return await learningService.deleteLearningResource(id, uid(context));
      },
      'learningResourceRemove'
    ),

    learningProgressAdd: withValidatedResolver(
      learningProgressAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'learningProgressAdd');
        return await learningService.createProgressSession(uid(context), input);
      },
      'learningProgressAdd'
    ),

    learningProgressEdit: withValidatedResolver(
      learningProgressEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'learningProgressEdit');
        const { resourceId, sessionId, ...fields } = input;
        return await learningService.updateProgressSession(resourceId, sessionId, uid(context), fields);
      },
      'learningProgressEdit'
    ),

    learningProgressRemove: withValidatedResolver(
      learningProgressRemoveInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'learningProgressRemove');
        const { resourceId, sessionId } = input;
        return await learningService.deleteProgressSession(resourceId, sessionId, uid(context));
      },
      'learningProgressRemove'
    ),
  },
};
