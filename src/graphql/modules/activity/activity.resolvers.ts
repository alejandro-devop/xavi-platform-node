import { activityService } from '../../../services/activity.service';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  activityAddInputSchema,
  activityEditInputSchema,
  activityIdArgSchema,
  activitiesListArgsSchema,
} from '../../../validators/schemas/activity.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const activityResolvers = {
  Query: {
    activity: withValidatedResolver(
      activityIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'activity');
        return await activityService.getActivityById(id, uid(context));
      },
      'activity'
    ),

    activities: withValidatedResolver(
      activitiesListArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'activities');
        return await activityService.listActivities(uid(context), args);
      },
      'activities'
    ),
  },

  Mutation: {
    activityAdd: withValidatedResolver(
      activityAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityAdd');
        return await activityService.createActivity(uid(context), input);
      },
      'activityAdd'
    ),

    activityEdit: withValidatedResolver(
      activityEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityEdit');
        const { id, ...fields } = input;
        return await activityService.updateActivity(id, uid(context), fields);
      },
      'activityEdit'
    ),

    activityRemove: withValidatedResolver(
      activityIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'activityRemove');
        return await activityService.deleteActivity(id, uid(context));
      },
      'activityRemove'
    ),

    activityComplete: withValidatedResolver(
      activityIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'activityComplete');
        return await activityService.completeActivity(id, uid(context));
      },
      'activityComplete'
    ),
  },
};
