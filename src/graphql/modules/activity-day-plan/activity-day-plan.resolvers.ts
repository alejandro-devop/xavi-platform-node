import { activityDayPlanService } from '../../../services/activity-day-plan.service';
import { activityService } from '../../../services/activity.service';
import {
  activityDayPlanArgsSchema,
  activityDayPlanItemAddInputSchema,
  activityDayPlanItemEditInputSchema,
  activityDayPlanItemRemoveInputSchema,
  activityDayPlanSetInputSchema,
} from '../../../validators/schemas/activity-day-plan.schemas';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const activityDayPlanResolvers = {
  ActivityDayPlanItem: {
    activity: async (
      parent: { activityId: string },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'ActivityDayPlanItem.activity');
      return await activityService.getActivityById(parent.activityId, uid(context));
    },
  },

  Query: {
    activityDayPlan: withValidatedResolver(
      activityDayPlanArgsSchema,
      async (_parent, { date }: { date: string }, context) => {
        requireAuth(context, 'activityDayPlan');
        return await activityDayPlanService.getDayPlan(uid(context), date);
      },
      'activityDayPlan'
    ),
  },

  Mutation: {
    activityDayPlanSet: withValidatedResolver(
      activityDayPlanSetInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityDayPlanSet');
        return await activityDayPlanService.setDayPlan(uid(context), input.date, input.items);
      },
      'activityDayPlanSet'
    ),

    activityDayPlanItemAdd: withValidatedResolver(
      activityDayPlanItemAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityDayPlanItemAdd');
        return await activityDayPlanService.addDayPlanItem(uid(context), input);
      },
      'activityDayPlanItemAdd'
    ),

    activityDayPlanItemEdit: withValidatedResolver(
      activityDayPlanItemEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityDayPlanItemEdit');
        const { itemId, ...fields } = input;
        return await activityDayPlanService.updateDayPlanItem(uid(context), itemId, fields);
      },
      'activityDayPlanItemEdit'
    ),

    activityDayPlanItemRemove: withValidatedResolver(
      activityDayPlanItemRemoveInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityDayPlanItemRemove');
        return await activityDayPlanService.removeDayPlanItem(uid(context), input.itemId);
      },
      'activityDayPlanItemRemove'
    ),
  },
};
