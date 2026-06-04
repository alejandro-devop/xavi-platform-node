import { activityService } from '../../../services/activity.service';
import { habitCategoryService } from '../../../services/habit-category.service';
import { habitMeasureService } from '../../../services/habit-measure.service';
import { habitService } from '../../../services/habit.service';
import type { Habit, HabitFollowUp, HabitLog } from '../../../types/services/habit.types';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  habitAddInputSchema,
  habitCategoryAddInputSchema,
  habitCategoryEditInputSchema,
  habitCategoryIdArgSchema,
  habitCompleteArgSchema,
  habitEditInputSchema,
  habitFollowUpAddInputSchema,
  habitFollowUpEditInputSchema,
  habitFollowUpRemoveIdSchema,
  habitFollowUpsArgsSchema,
  habitFollowUpsInDatesArgsSchema,
  habitFollowUpsFieldArgsSchema,
  habitIdArgSchema,
  habitLogAddInputSchema,
  habitLogsArgsSchema,
  habitLogsFieldArgsSchema,
  habitMeasureAddInputSchema,
  habitMeasureEditInputSchema,
  habitMeasureIdArgSchema,
  habitMyDayArgsSchema,
  habitStatsArgsSchema,
  habitWeekViewArgsSchema,
  habitsListArgsSchema,
} from '../../../validators/schemas/habit.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

function toFollowUp(log: HabitLog): HabitFollowUp & { date: string } {
  return {
    ...log,
    date: log.completedDate,
  };
}

export const habitResolvers = {
  Habit: {
    category: async (parent: Habit, _args: unknown, context: { user?: { id: string | number } | null }) => {
      if (!parent.categoryId) return null;
      requireAuth(context, 'Habit.category');
      try {
        return await habitCategoryService.getCategoryById(parent.categoryId, uid(context));
      } catch {
        return null;
      }
    },

    measure: async (parent: Habit, _args: unknown, context: { user?: { id: string | number } | null }) => {
      if (!parent.measureId) return null;
      requireAuth(context, 'Habit.measure');
      try {
        return await habitMeasureService.getMeasureById(parent.measureId, uid(context));
      } catch {
        return null;
      }
    },

    activity: async (parent: Habit, _args: unknown, context: { user?: { id: string | number } | null }) => {
      if (parent.activityId == null) return null;
      requireAuth(context, 'Habit.activity');
      try {
        return await activityService.getActivityById(String(parent.activityId), uid(context));
      } catch {
        return null;
      }
    },

    logs: withValidatedResolver(
      habitLogsFieldArgsSchema,
      async (parent: Habit, args: { limit: number; isArchived?: boolean }, context) => {
        requireAuth(context, 'Habit.logs');
        return await habitService.listHabitLogs(parent.id, uid(context), {
          limit: args.limit,
          isArchived: args.isArchived,
        });
      },
      'Habit.logs'
    ),

    followUps: withValidatedResolver(
      habitFollowUpsFieldArgsSchema,
      async (parent: Habit, args: { limit: number; isArchived?: boolean }, context) => {
        requireAuth(context, 'Habit.followUps');
        const logs = await habitService.listHabitLogs(parent.id, uid(context), {
          limit: args.limit,
          isArchived: args.isArchived,
        });
        return logs.map(toFollowUp);
      },
      'Habit.followUps'
    ),

    stats: async (parent: Habit, _args: unknown, context: { user?: { id: string | number } | null }) => {
      requireAuth(context, 'Habit.stats');
      return await habitService.getHabitStats(parent.id, uid(context));
    },
  },

  HabitFollowUp: {
    date: (parent: HabitFollowUp) => parent.completedDate,
    habit: async (parent: HabitFollowUp, _args: unknown, context: { user?: { id: string | number } | null }) => {
      requireAuth(context, 'HabitFollowUp.habit');
      return await habitService.getHabitById(parent.habitId, uid(context));
    },
  },

  HabitLog: {
    habit: async (parent: HabitLog, _args: unknown, context: { user?: { id: string | number } | null }) => {
      requireAuth(context, 'HabitLog.habit');
      return await habitService.getHabitById(parent.habitId, uid(context));
    },
  },

  Query: {
    habit: withValidatedResolver(
      habitIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'habit');
        return await habitService.getHabitById(id, uid(context));
      },
      'habit'
    ),

    habits: withValidatedResolver(
      habitsListArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'habits');
        return await habitService.listHabits(uid(context), args);
      },
      'habits'
    ),

    habitLogs: withValidatedResolver(
      habitLogsArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'habitLogs');
        const { habitId, startDate, endDate, limit, isArchived } = args;
        return await habitService.listHabitLogs(habitId, uid(context), {
          startDate,
          endDate,
          limit,
          isArchived,
        });
      },
      'habitLogs'
    ),

    habitStats: withValidatedResolver(
      habitStatsArgsSchema,
      async (_parent, { habitId }: { habitId: string }, context) => {
        requireAuth(context, 'habitStats');
        return await habitService.getHabitStats(habitId, uid(context));
      },
      'habitStats'
    ),

    habitCategories: async (
      _parent: unknown,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'habitCategories');
      return await habitCategoryService.listCategories(uid(context));
    },

    habitCategory: withValidatedResolver(
      habitCategoryIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'habitCategory');
        return await habitCategoryService.getCategoryById(id, uid(context));
      },
      'habitCategory'
    ),

    habitMeasures: async (
      _parent: unknown,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'habitMeasures');
      return await habitMeasureService.listMeasures(uid(context));
    },

    habitMeasure: withValidatedResolver(
      habitMeasureIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'habitMeasure');
        return await habitMeasureService.getMeasureById(id, uid(context));
      },
      'habitMeasure'
    ),

    habitFollowUps: withValidatedResolver(
      habitFollowUpsArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'habitFollowUps');
        const logs = await habitService.listHabitFollowUps(uid(context), args);
        return logs.map(toFollowUp);
      },
      'habitFollowUps'
    ),

    habitMyDay: withValidatedResolver(
      habitMyDayArgsSchema,
      async (_parent, { date }: { date: string }, context) => {
        requireAuth(context, 'habitMyDay');
        const entries = await habitService.getHabitMyDay(uid(context), date);
        return entries.map((e) => ({
          habit: e.habit,
          followUp: e.followUp ? toFollowUp(e.followUp) : null,
        }));
      },
      'habitMyDay'
    ),

    habitFollowUpsInDates: withValidatedResolver(
      habitFollowUpsInDatesArgsSchema,
      async (_parent, { from, to }: { from: string; to: string }, context) => {
        requireAuth(context, 'habitFollowUpsInDates');
        const groups = await habitService.listHabitFollowUpsInDates(uid(context), from, to);
        return groups.map((g) => ({
          date: g.date,
          followUps: g.followUps.map(toFollowUp),
        }));
      },
      'habitFollowUpsInDates'
    ),

    habitWeekView: withValidatedResolver(
      habitWeekViewArgsSchema,
      async (_parent, { habitId, weekStart }, context) => {
        requireAuth(context, 'habitWeekView');
        return habitService.getHabitWeekView(habitId, weekStart, uid(context));
      },
      'habitWeekView'
    ),
  },

  Mutation: {
    habitAdd: withValidatedResolver(
      habitAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitAdd');
        return await habitService.createHabit(uid(context), input);
      },
      'habitAdd'
    ),

    habitEdit: withValidatedResolver(
      habitEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitEdit');
        const { id, ...fields } = input;
        return await habitService.updateHabit(id, uid(context), fields);
      },
      'habitEdit'
    ),

    habitRemove: withValidatedResolver(
      habitIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'habitRemove');
        return await habitService.deleteHabit(id, uid(context));
      },
      'habitRemove'
    ),

    habitLogAdd: withValidatedResolver(
      habitLogAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitLogAdd');
        const { habitId, completedDate, count, time, notes, story, isAccomplished, isFailed } = input;
        return await habitService.addHabitLog(habitId, uid(context), {
          completedDate,
          count,
          time,
          notes,
          story,
          isAccomplished,
          isFailed,
        });
      },
      'habitLogAdd'
    ),

    habitFollowUpAdd: withValidatedResolver(
      habitFollowUpAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitFollowUpAdd');
        const { habitId, date, count, time, notes, story, isAccomplished, isFailed, isLifeline, difficulty } = input;
        const log = await habitService.addHabitLog(habitId, uid(context), {
          completedDate: date,
          count,
          time,
          notes,
          story,
          isAccomplished,
          isFailed,
          isLifeline,
          difficulty,
        });
        return toFollowUp(log);
      },
      'habitFollowUpAdd'
    ),

    habitFollowUpEdit: withValidatedResolver(
      habitFollowUpEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitFollowUpEdit');
        const { id, difficulty, ...fields } = input;
        const log = await habitService.updateHabitFollowUp(id, uid(context), { ...fields, difficulty });
        return toFollowUp(log);
      },
      'habitFollowUpEdit'
    ),

    habitFollowUpRemove: withValidatedResolver(
      habitFollowUpRemoveIdSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'habitFollowUpRemove');
        return await habitService.removeHabitFollowUp(id, uid(context));
      },
      'habitFollowUpRemove'
    ),

    habitCategoryAdd: withValidatedResolver(
      habitCategoryAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitCategoryAdd');
        return await habitCategoryService.createCategory(uid(context), input);
      },
      'habitCategoryAdd'
    ),

    habitCategoryEdit: withValidatedResolver(
      habitCategoryEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitCategoryEdit');
        const { id, ...fields } = input;
        return await habitCategoryService.updateCategory(id, uid(context), fields);
      },
      'habitCategoryEdit'
    ),

    habitCategoryRemove: withValidatedResolver(
      habitCategoryIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'habitCategoryRemove');
        return await habitCategoryService.deleteCategory(id, uid(context));
      },
      'habitCategoryRemove'
    ),

    habitMeasureAdd: withValidatedResolver(
      habitMeasureAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitMeasureAdd');
        return await habitMeasureService.createMeasure(uid(context), input);
      },
      'habitMeasureAdd'
    ),

    habitMeasureEdit: withValidatedResolver(
      habitMeasureEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'habitMeasureEdit');
        const { id, ...fields } = input;
        return await habitMeasureService.updateMeasure(id, uid(context), fields);
      },
      'habitMeasureEdit'
    ),

    habitMeasureRemove: withValidatedResolver(
      habitMeasureIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'habitMeasureRemove');
        return await habitMeasureService.deleteMeasure(id, uid(context));
      },
      'habitMeasureRemove'
    ),

    habitComplete: withValidatedResolver(
      habitCompleteArgSchema,
      async (_parent, { id }, context) => {
        requireAuth(context, 'habitComplete');
        return habitService.completeHabit(id, uid(context));
      },
      'habitComplete'
    ),
  },
};
