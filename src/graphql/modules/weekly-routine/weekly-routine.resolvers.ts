import { weeklyRoutineService } from '../../../services/weekly-routine.service';
import { activityService } from '../../../services/activity.service';
import type { WeeklyRoutineActivity } from '../../../types/services/weekly-routine.types';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  weeklyRoutineIdArgSchema,
  weeklyRoutinesListArgsSchema,
  weeklyRoutineAddInputSchema,
  weeklyRoutineEditInputSchema,
  weeklyRoutineActivityAddInputSchema,
  weeklyRoutineActivityBatchAddInputSchema,
  weeklyRoutineActivityEditInputSchema,
  weeklyRoutineActivityIdArgSchema,
} from '../../../validators/schemas/weekly-routine.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const weeklyRoutineResolvers = {
  WeeklyRoutineActivity: {
    activity: async (
      parent: WeeklyRoutineActivity,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'WeeklyRoutineActivity.activity');
      return activityService.getActivityById(parent.activityId, uid(context));
    },
  },

  Query: {
    weeklyRoutine: withValidatedResolver(
      weeklyRoutineIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'weeklyRoutine');
        return weeklyRoutineService.getRoutineById(id, uid(context));
      },
      'weeklyRoutine'
    ),

    weeklyRoutines: withValidatedResolver(
      weeklyRoutinesListArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'weeklyRoutines');
        return weeklyRoutineService.listRoutines(uid(context), args);
      },
      'weeklyRoutines'
    ),

    weeklyRoutineActive: async (_parent: unknown, _args: unknown, context: { user?: { id: string | number } | null }) => {
      requireAuth(context, 'weeklyRoutineActive');
      return weeklyRoutineService.getActiveRoutine(uid(context));
    },
  },

  Mutation: {
    weeklyRoutineAdd: withValidatedResolver(
      weeklyRoutineAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'weeklyRoutineAdd');
        return weeklyRoutineService.createRoutine(uid(context), input);
      },
      'weeklyRoutineAdd'
    ),

    weeklyRoutineEdit: withValidatedResolver(
      weeklyRoutineEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'weeklyRoutineEdit');
        const { id, ...fields } = input;
        return weeklyRoutineService.updateRoutine(id, uid(context), fields);
      },
      'weeklyRoutineEdit'
    ),

    weeklyRoutineRemove: withValidatedResolver(
      weeklyRoutineIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'weeklyRoutineRemove');
        return weeklyRoutineService.deleteRoutine(id, uid(context));
      },
      'weeklyRoutineRemove'
    ),

    weeklyRoutineSetActive: withValidatedResolver(
      weeklyRoutineIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'weeklyRoutineSetActive');
        return weeklyRoutineService.setRoutineActive(id, uid(context));
      },
      'weeklyRoutineSetActive'
    ),

    weeklyRoutineToggleActive: withValidatedResolver(
      weeklyRoutineIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'weeklyRoutineToggleActive');
        return weeklyRoutineService.toggleRoutineActive(id, uid(context));
      },
      'weeklyRoutineToggleActive'
    ),

    weeklyRoutineActivityAdd: withValidatedResolver(
      weeklyRoutineActivityAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'weeklyRoutineActivityAdd');
        return weeklyRoutineService.addActivity(uid(context), input);
      },
      'weeklyRoutineActivityAdd'
    ),

    weeklyRoutineActivityBatchAdd: withValidatedResolver(
      weeklyRoutineActivityBatchAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'weeklyRoutineActivityBatchAdd');
        return weeklyRoutineService.addActivitiesBatch(uid(context), input);
      },
      'weeklyRoutineActivityBatchAdd'
    ),

    weeklyRoutineActivityEdit: withValidatedResolver(
      weeklyRoutineActivityEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'weeklyRoutineActivityEdit');
        const { id, ...fields } = input;
        return weeklyRoutineService.updateActivity(id, uid(context), fields);
      },
      'weeklyRoutineActivityEdit'
    ),

    weeklyRoutineActivityRemove: withValidatedResolver(
      weeklyRoutineActivityIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'weeklyRoutineActivityRemove');
        return weeklyRoutineService.removeActivity(id, uid(context));
      },
      'weeklyRoutineActivityRemove'
    ),
  },
};
