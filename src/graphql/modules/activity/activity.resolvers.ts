import { activityCategoryService } from '../../../services/activity-category.service';
import { activityFollowUpService } from '../../../services/activity-follow-up.service';
import { activityService } from '../../../services/activity.service';
import type { Activity } from '../../../types/services/activity.types';
import {
  activityAddInputSchema,
  activityCategoryAddInputSchema,
  activityCategoryEditInputSchema,
  activityCategoryIdArgSchema,
  activityDayFollowUpsArgsSchema,
  activityEditInputSchema,
  activityFollowUpAddInputSchema,
  activityFollowUpEditInputSchema,
  activityFollowUpIdArgSchema,
  activityFollowUpsArgsSchema,
  activityFollowUpsFieldArgsSchema,
  activityFollowUpsInDatesArgsSchema,
  activityIdArgSchema,
  activitiesListArgsSchema,
} from '../../../validators/schemas/activity.schemas';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const activityResolvers = {
  Activity: {
    category: async (
      parent: Activity,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      if (!parent.categoryId) return null;
      requireAuth(context, 'Activity.category');
      return await activityCategoryService.getCategoryById(parent.categoryId, uid(context));
    },

    followUps: withValidatedResolver(
      activityFollowUpsFieldArgsSchema,
      async (parent: Activity, args, context) => {
        requireAuth(context, 'Activity.followUps');
        return await activityFollowUpService.listFollowUps(uid(context), {
          activityId: parent.id,
          from: args.from,
          to: args.to,
          limit: args.limit,
        });
      },
      'Activity.followUps'
    ),

    spentTimeMinutes: async (parent: Activity) => {
      return await activityFollowUpService.sumSpentTimeMinutes(
        activityService.parseActivityId(parent.id)
      );
    },
  },

  ActivityFollowUp: {
    activity: async (
      parent: { activityId: string },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'ActivityFollowUp.activity');
      return await activityService.getActivityById(parent.activityId, uid(context));
    },
  },

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

    activityCategories: async (
      _parent: unknown,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'activityCategories');
      return await activityCategoryService.listCategories(uid(context));
    },

    activityCategory: withValidatedResolver(
      activityCategoryIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'activityCategory');
        return await activityCategoryService.getCategoryById(id, uid(context));
      },
      'activityCategory'
    ),

    activityFollowUp: withValidatedResolver(
      activityFollowUpIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'activityFollowUp');
        return await activityFollowUpService.getFollowUpById(id, uid(context));
      },
      'activityFollowUp'
    ),

    activityFollowUps: withValidatedResolver(
      activityFollowUpsArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'activityFollowUps');
        return await activityFollowUpService.listFollowUps(uid(context), args);
      },
      'activityFollowUps'
    ),

    activityFollowUpsInDates: withValidatedResolver(
      activityFollowUpsInDatesArgsSchema,
      async (_parent, { from, to }: { from: string; to: string }, context) => {
        requireAuth(context, 'activityFollowUpsInDates');
        return await activityFollowUpService.listFollowUpsInDates(uid(context), from, to);
      },
      'activityFollowUpsInDates'
    ),

    activityDayFollowUps: withValidatedResolver(
      activityDayFollowUpsArgsSchema,
      async (_parent, { date }: { date: string }, context) => {
        requireAuth(context, 'activityDayFollowUps');
        return await activityFollowUpService.listDayFollowUps(uid(context), date);
      },
      'activityDayFollowUps'
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

    activityCategoryAdd: withValidatedResolver(
      activityCategoryAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityCategoryAdd');
        return await activityCategoryService.createCategory(uid(context), input);
      },
      'activityCategoryAdd'
    ),

    activityCategoryEdit: withValidatedResolver(
      activityCategoryEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityCategoryEdit');
        const { id, ...fields } = input;
        return await activityCategoryService.updateCategory(id, uid(context), fields);
      },
      'activityCategoryEdit'
    ),

    activityCategoryRemove: withValidatedResolver(
      activityCategoryIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'activityCategoryRemove');
        return await activityCategoryService.deleteCategory(id, uid(context));
      },
      'activityCategoryRemove'
    ),

    activityFollowUpAdd: withValidatedResolver(
      activityFollowUpAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityFollowUpAdd');
        return await activityFollowUpService.createFollowUp(uid(context), input);
      },
      'activityFollowUpAdd'
    ),

    activityFollowUpEdit: withValidatedResolver(
      activityFollowUpEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityFollowUpEdit');
        const { id, ...fields } = input;
        return await activityFollowUpService.updateFollowUp(id, uid(context), fields);
      },
      'activityFollowUpEdit'
    ),

    activityFollowUpRemove: withValidatedResolver(
      activityFollowUpIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'activityFollowUpRemove');
        return await activityFollowUpService.deleteFollowUp(id, uid(context));
      },
      'activityFollowUpRemove'
    ),
  },
};
