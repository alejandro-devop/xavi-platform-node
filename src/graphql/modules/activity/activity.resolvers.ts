import { activityCategoryService } from '../../../services/activity-category.service';
import { activityFollowUpService } from '../../../services/activity-follow-up.service';
import { activityService } from '../../../services/activity.service';
import { activityTodoFoldersService } from '../../../services/activity-todo-folders.service';
import { todoService } from '../../../services/todo.service';
import { workoutService } from '../../../services/workout.service';
import type { Activity } from '../../../types/services/activity.types';
import {
  activityAddInputSchema,
  activityCategoryAddInputSchema,
  activityCategoryEditInputSchema,
  activityCategoryIdArgSchema,
  activityDayFollowUpsArgsSchema,
  activityEditInputSchema,
  activityFollowUpAddInputSchema,
  activityFollowUpStartInputSchema,
  activityFollowUpEditInputSchema,
  activityFollowUpIdArgSchema,
  activityFollowUpSubtaskEditInputSchema,
  activityFollowUpSubtaskAddInputSchema,
  activityFollowUpsArgsSchema,
  activityFollowUpsFieldArgsSchema,
  activityFollowUpsInDatesArgsSchema,
  activityIdArgSchema,
  activityPendingTodosArgsSchema,
  activitySubtaskAddInputSchema,
  activitySubtaskEditInputSchema,
  activitySubtaskRemoveInputSchema,
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

    todoFolders: async (
      parent: Activity,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'Activity.todoFolders');
      return await activityTodoFoldersService.getFoldersForActivity(
        activityService.parseActivityId(parent.id),
        uid(context)
      );
    },

    subtasks: async (
      parent: Activity,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'Activity.subtasks');
      if (parent.subtasks) return parent.subtasks;
      return await activityService.listSubtasksForActivity(
        activityService.parseActivityId(parent.id)
      );
    },

    subtasksCount: async (parent: Activity) => {
      if (parent.subtasksCount) return parent.subtasksCount;
      if (parent.subtasks) {
        return {
          total: parent.subtasks.length,
          completed: parent.subtasks.filter((s) => s.isCompleted).length,
        };
      }
      const counts = await activityService.loadSubtasksCounts([
        activityService.parseActivityId(parent.id),
      ]);
      return counts.get(activityService.parseActivityId(parent.id)) ?? { total: 0, completed: 0 };
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

    linkedTodo: async (
      parent: { linkedTodoId: string | null },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      if (!parent.linkedTodoId) return null;
      requireAuth(context, 'ActivityFollowUp.linkedTodo');
      return await todoService.getTodoById(parent.linkedTodoId, uid(context));
    },

    sessionSubtasks: async (
      parent: { id: string; sessionSubtasks?: unknown },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'ActivityFollowUp.sessionSubtasks');
      if (parent.sessionSubtasks) return parent.sessionSubtasks;
      return await activityFollowUpService.listSessionSubtasks(
        activityFollowUpService.parseFollowUpId(parent.id)
      );
    },

    sessionSubtasksCount: async (
      parent: { id: string; sessionSubtasks?: { isCompleted: boolean }[]; sessionSubtasksCount?: unknown },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'ActivityFollowUp.sessionSubtasksCount');
      if (parent.sessionSubtasksCount) return parent.sessionSubtasksCount;
      if (parent.sessionSubtasks) {
        return activityFollowUpService.countSessionSubtasks(
          parent.sessionSubtasks as Parameters<
            typeof activityFollowUpService.countSessionSubtasks
          >[0]
        );
      }
      const subtasks = await activityFollowUpService.listSessionSubtasks(
        activityFollowUpService.parseFollowUpId(parent.id)
      );
      return activityFollowUpService.countSessionSubtasks(subtasks);
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

    activityOpenFollowUp: async (
      _parent: unknown,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'activityOpenFollowUp');
      return await activityFollowUpService.getOpenFollowUp(uid(context));
    },

    activityPendingTodos: withValidatedResolver(
      activityPendingTodosArgsSchema,
      async (_parent, { activityId, limit }, context) => {
        requireAuth(context, 'activityPendingTodos');
        return await activityTodoFoldersService.listPendingTodosForActivity(
          activityId,
          uid(context),
          limit
        );
      },
      'activityPendingTodos'
    ),
  },

  Mutation: {
    activityAdd: withValidatedResolver(
      activityAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityAdd');
        const userId = uid(context);
        const { workoutExerciseIds, ...activityInput } = input;
        const activity = await activityService.createActivity(userId, activityInput);
        if (workoutExerciseIds !== undefined) {
          await workoutService.setActivityWorkoutExercises(
            userId,
            activity.id,
            workoutExerciseIds
          );
        }
        return activity;
      },
      'activityAdd'
    ),

    activityEdit: withValidatedResolver(
      activityEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityEdit');
        const userId = uid(context);
        const { id, workoutExerciseIds, ...fields } = input;
        const activity = await activityService.updateActivity(id, userId, fields);
        if (workoutExerciseIds !== undefined) {
          await workoutService.setActivityWorkoutExercises(userId, id, workoutExerciseIds);
        } else if (fields.isWorkout === false) {
          await workoutService.setActivityWorkoutExercises(userId, id, []);
        }
        return activity;
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

    activityFollowUpStart: withValidatedResolver(
      activityFollowUpStartInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityFollowUpStart');
        return await activityFollowUpService.startFollowUp(uid(context), input);
      },
      'activityFollowUpStart'
    ),

    activityFollowUpEdit: withValidatedResolver(
      activityFollowUpEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityFollowUpEdit');
        const userId = uid(context);
        const { id, ...fields } = input;
        const before = await activityFollowUpService.getFollowUpById(id, userId);
        const updated = await activityFollowUpService.updateFollowUp(id, userId, fields);
        if (before.isOpen && !updated.isOpen) {
          await workoutService.tryAwardXpForClosedFollowUp(userId, updated.id, updated.date);
        }
        return updated;
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

    activityFollowUpSubtaskEdit: withValidatedResolver(
      activityFollowUpSubtaskEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityFollowUpSubtaskEdit');
        const { followUpId, sessionSubtaskId, isCompleted } = input;
        return await activityFollowUpService.updateSessionSubtask(
          followUpId,
          sessionSubtaskId,
          uid(context),
          { isCompleted }
        );
      },
      'activityFollowUpSubtaskEdit'
    ),

    activityFollowUpSubtaskAdd: withValidatedResolver(
      activityFollowUpSubtaskAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activityFollowUpSubtaskAdd');
        return await activityFollowUpService.addSessionSubtask(uid(context), input);
      },
      'activityFollowUpSubtaskAdd'
    ),

    activitySubtaskAdd: withValidatedResolver(
      activitySubtaskAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activitySubtaskAdd');
        return await activityService.createSubtask(uid(context), input);
      },
      'activitySubtaskAdd'
    ),

    activitySubtaskEdit: withValidatedResolver(
      activitySubtaskEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activitySubtaskEdit');
        const { activityId, subtaskId, ...fields } = input;
        return await activityService.updateSubtask(activityId, subtaskId, uid(context), fields);
      },
      'activitySubtaskEdit'
    ),

    activitySubtaskRemove: withValidatedResolver(
      activitySubtaskRemoveInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'activitySubtaskRemove');
        const { activityId, subtaskId } = input;
        return await activityService.deleteSubtask(activityId, subtaskId, uid(context));
      },
      'activitySubtaskRemove'
    ),
  },
};
