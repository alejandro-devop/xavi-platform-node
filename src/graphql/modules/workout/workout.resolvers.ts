import { workoutService } from '../../../services/workout.service';
import { NotFoundError } from '../../../shared/errors';
import {
  exerciseCreateInputSchema,
  exerciseDeleteInputSchema,
  exerciseHistoryArgsSchema,
  exerciseIdArgSchema,
  exerciseUpdateInputSchema,
  workoutReportsArgsSchema,
  workoutSessionArgsSchema,
  workoutSessionStartInputSchema,
  workoutSetDeleteInputSchema,
  workoutSetUpsertInputSchema,
} from '../../../validators/schemas/workout.schemas';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const workoutResolvers = {
  Activity: {
    isWorkout: (parent: { isWorkout?: boolean }) => parent.isWorkout ?? false,
    workoutExercises: async (
      parent: { id: string },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'Activity.workoutExercises');
      return await workoutService.listExercisesForActivity(uid(context), parent.id);
    },
  },

  ActivityFollowUp: {
    workoutSession: async (
      parent: { id: string },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'ActivityFollowUp.workoutSession');
      return await workoutService.getSessionByFollowUpId(uid(context), parent.id);
    },
    workoutXpAward: async (
      parent: { id: string },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'ActivityFollowUp.workoutXpAward');
      return await workoutService.getXpAwardForFollowUp(uid(context), parent.id);
    },
  },

  WorkoutSession: {
    sessionExercises: async (
      parent: { id: string; sessionExercises?: unknown[] },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      if (parent.sessionExercises) return parent.sessionExercises;
      requireAuth(context, 'WorkoutSession.sessionExercises');
      return await workoutService.loadSessionExercises(parent.id);
    },
  },

  WorkoutSessionExercise: {
    exercise: async (
      parent: { exerciseId: string },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'WorkoutSessionExercise.exercise');
      try {
        return await workoutService.getExerciseById(uid(context), parent.exerciseId);
      } catch (error) {
        if (error instanceof NotFoundError) return null;
        throw error;
      }
    },
    sets: async (
      parent: { id: string; sets?: unknown[] },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      if (parent.sets) return parent.sets;
      requireAuth(context, 'WorkoutSessionExercise.sets');
      return await workoutService.loadSetsForSessionExercise(parent.id);
    },
  },

  Query: {
    exercises: async (
      _parent: unknown,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'exercises');
      return await workoutService.listExercises(uid(context));
    },

    exercise: withValidatedResolver(
      exerciseIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'exercise');
        try {
          return await workoutService.getExerciseById(uid(context), id);
        } catch (error) {
          if (error instanceof NotFoundError) return null;
          throw error;
        }
      },
      'exercise'
    ),

    workoutSession: withValidatedResolver(
      workoutSessionArgsSchema,
      async (
        _parent,
        args: { id?: string; followUpId?: string },
        context
      ) => {
        requireAuth(context, 'workoutSession');
        if (args.id) {
          try {
            return await workoutService.getSessionById(uid(context), args.id);
          } catch (error) {
            if (error instanceof NotFoundError) return null;
            throw error;
          }
        }
        return await workoutService.getSessionByFollowUpId(uid(context), args.followUpId!);
      },
      'workoutSession'
    ),

    exerciseHistory: withValidatedResolver(
      exerciseHistoryArgsSchema,
      async (
        _parent,
        args: { exerciseId: string; limit?: number },
        context
      ) => {
        requireAuth(context, 'exerciseHistory');
        return await workoutService.getExerciseHistory(
          uid(context),
          args.exerciseId,
          args.limit
        );
      },
      'exerciseHistory'
    ),

    workoutReports: withValidatedResolver(
      workoutReportsArgsSchema,
      async (_parent, args: { windowDays: 7 | 30 | 90 }, context) => {
        requireAuth(context, 'workoutReports');
        return await workoutService.getWorkoutReports(uid(context), args.windowDays);
      },
      'workoutReports'
    ),

    workoutGameProgress: async (
      _parent: unknown,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'workoutGameProgress');
      return await workoutService.getGameProgress(uid(context));
    },
  },

  Mutation: {
    exerciseCreate: withValidatedResolver(
      exerciseCreateInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'exerciseCreate');
        return await workoutService.createExercise(uid(context), input);
      },
      'exerciseCreate'
    ),

    exerciseUpdate: withValidatedResolver(
      exerciseUpdateInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'exerciseUpdate');
        const { id, ...fields } = input;
        return await workoutService.updateExercise(uid(context), id, fields);
      },
      'exerciseUpdate'
    ),

    exerciseDelete: withValidatedResolver(
      exerciseDeleteInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'exerciseDelete');
        return await workoutService.deleteExercise(uid(context), input.id);
      },
      'exerciseDelete'
    ),

    workoutSessionStart: withValidatedResolver(
      workoutSessionStartInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'workoutSessionStart');
        return await workoutService.startWorkoutSession(uid(context), input);
      },
      'workoutSessionStart'
    ),

    workoutSetUpsert: withValidatedResolver(
      workoutSetUpsertInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'workoutSetUpsert');
        return await workoutService.upsertSet(uid(context), input);
      },
      'workoutSetUpsert'
    ),

    workoutSetDelete: withValidatedResolver(
      workoutSetDeleteInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'workoutSetDelete');
        return await workoutService.deleteSet(uid(context), input.id);
      },
      'workoutSetDelete'
    ),
  },
};
