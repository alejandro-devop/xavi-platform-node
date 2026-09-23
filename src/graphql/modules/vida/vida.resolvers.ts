import { activityService } from '../../../services/activity.service';
import { vidaGoalService } from '../../../services/vida-goal.service';
import { vidaService } from '../../../services/vida.service';
import { NotFoundError } from '../../../shared/errors';
import {
  vidaDateArgsSchema,
  vidaGoalCategorySetInputSchema,
  vidaGoalDaysSetInputSchema,
  vidaItemCreateInputSchema,
  vidaItemDeleteInputSchema,
  vidaItemUpdateInputSchema,
  vidaItemsArgsSchema,
  vidaMarkTakenTodayInputSchema,
  vidaUnmarkTakenTodayInputSchema,
} from '../../../validators/schemas/vida.schemas';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const vidaResolvers = {
  VidaItem: {
    activity: async (
      parent: { activityId: string },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'VidaItem.activity');
      try {
        return await activityService.getActivityById(parent.activityId, uid(context));
      } catch (error) {
        // CASCADE suele limpiar ítems huérfanos; si falta la actividad, no tumbar la lista.
        if (error instanceof NotFoundError) return null;
        throw error;
      }
    },
  },

  ActivityCategory: {
    goal: async (
      parent: { goalId: string | null },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      if (!parent.goalId) return null;
      requireAuth(context, 'ActivityCategory.goal');
      return await vidaGoalService.getGoalById(parent.goalId, uid(context));
    },
  },

  VidaSuggestion: {
    item: (parent: { item: unknown }) => parent.item,
    takenToday: (parent: { takenToday: boolean }) => parent.takenToday,
  },

  Query: {
    vidaItems: withValidatedResolver(
      vidaItemsArgsSchema,
      async (_parent, args: { includeInactive?: boolean }, context) => {
        requireAuth(context, 'vidaItems');
        return await vidaService.listItems(uid(context), args.includeInactive ?? false);
      },
      'vidaItems'
    ),

    vidaSuggestionsForDate: withValidatedResolver(
      vidaDateArgsSchema,
      async (_parent, { date }: { date: string }, context) => {
        requireAuth(context, 'vidaSuggestionsForDate');
        return await vidaService.suggestionsForDate(uid(context), date);
      },
      'vidaSuggestionsForDate'
    ),

    vidaTakenToday: withValidatedResolver(
      vidaDateArgsSchema,
      async (_parent, { date }: { date: string }, context) => {
        requireAuth(context, 'vidaTakenToday');
        return await vidaService.listTakenForDate(uid(context), date);
      },
      'vidaTakenToday'
    ),
  },

  Mutation: {
    vidaItemCreate: withValidatedResolver(
      vidaItemCreateInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'vidaItemCreate');
        return await vidaService.createItem(uid(context), {
          activityId: input.activityId,
          days: input.days,
          startTime: input.startTime ?? null,
          durationMinutes: input.durationMinutes ?? null,
          notes: input.notes ?? null,
          orderIndex: input.orderIndex,
          clientId: input.clientId,
        });
      },
      'vidaItemCreate'
    ),

    vidaItemUpdate: withValidatedResolver(
      vidaItemUpdateInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'vidaItemUpdate');
        const { id, ...fields } = input;
        return await vidaService.updateItem(uid(context), id, fields);
      },
      'vidaItemUpdate'
    ),

    vidaItemDelete: withValidatedResolver(
      vidaItemDeleteInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'vidaItemDelete');
        return await vidaService.deleteItem(uid(context), input.id);
      },
      'vidaItemDelete'
    ),

    vidaMarkTakenToday: withValidatedResolver(
      vidaMarkTakenTodayInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'vidaMarkTakenToday');
        return await vidaService.markTakenToday(uid(context), input.vidaItemId, input.date);
      },
      'vidaMarkTakenToday'
    ),

    vidaUnmarkTakenToday: withValidatedResolver(
      vidaUnmarkTakenTodayInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'vidaUnmarkTakenToday');
        return await vidaService.unmarkTakenToday(uid(context), input.vidaItemId, input.date);
      },
      'vidaUnmarkTakenToday'
    ),

    activityCategoryGoalSet: withValidatedResolver(
      vidaGoalCategorySetInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityCategoryGoalSet');
        return await vidaGoalService.setCategoryGoal(uid(context), {
          categoryId: input.categoryId,
          attached: input.attached,
          goalId: input.goalId ?? null,
        });
      },
      'activityCategoryGoalSet'
    ),

    vidaGoalDaysSet: withValidatedResolver(
      vidaGoalDaysSetInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'vidaGoalDaysSet');
        return await vidaGoalService.setGoalDays(uid(context), {
          goalId: input.goalId,
          activeDays: input.activeDays,
        });
      },
      'vidaGoalDaysSet'
    ),
  },
};
