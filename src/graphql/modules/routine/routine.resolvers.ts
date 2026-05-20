import { routineService } from '../../../services/routine.service';
import type { Routine } from '../../../types/services/routine.types';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  routineAddInputSchema,
  routineEditInputSchema,
  routineIdArgSchema,
  routineStepAddInputSchema,
  routineStepEditInputSchema,
  routineStepRemoveInputSchema,
  routinesListArgsSchema,
} from '../../../validators/schemas/routine.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const routineResolvers = {
  Routine: {
    steps: async (parent: Routine, _args: unknown, context: { user?: { id: string | number } | null }) => {
      requireAuth(context, 'Routine.steps');
      if (parent.steps) return parent.steps;
      return await routineService.listStepsForRoutine(parseInt(parent.id, 10));
    },
  },

  Query: {
    routine: withValidatedResolver(
      routineIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'routine');
        return await routineService.getRoutineById(id, uid(context));
      },
      'routine'
    ),

    routines: withValidatedResolver(
      routinesListArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'routines');
        return await routineService.listRoutines(uid(context), args);
      },
      'routines'
    ),
  },

  Mutation: {
    routineAdd: withValidatedResolver(
      routineAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'routineAdd');
        return await routineService.createRoutine(uid(context), input);
      },
      'routineAdd'
    ),

    routineEdit: withValidatedResolver(
      routineEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'routineEdit');
        const { id, ...fields } = input;
        return await routineService.updateRoutine(id, uid(context), fields);
      },
      'routineEdit'
    ),

    routineRemove: withValidatedResolver(
      routineIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'routineRemove');
        return await routineService.deleteRoutine(id, uid(context));
      },
      'routineRemove'
    ),

    routineSetActive: withValidatedResolver(
      routineIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'routineSetActive');
        return await routineService.setRoutineActive(id, uid(context));
      },
      'routineSetActive'
    ),

    routineToggleActive: withValidatedResolver(
      routineIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'routineToggleActive');
        return await routineService.toggleRoutineActive(id, uid(context));
      },
      'routineToggleActive'
    ),

    routineStepAdd: withValidatedResolver(
      routineStepAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'routineStepAdd');
        return await routineService.createRoutineStep(uid(context), input);
      },
      'routineStepAdd'
    ),

    routineStepEdit: withValidatedResolver(
      routineStepEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'routineStepEdit');
        const { routineId, stepId, ...fields } = input;
        return await routineService.updateRoutineStep(routineId, stepId, uid(context), fields);
      },
      'routineStepEdit'
    ),

    routineStepRemove: withValidatedResolver(
      routineStepRemoveInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'routineStepRemove');
        const { routineId, stepId } = input;
        return await routineService.deleteRoutineStep(routineId, stepId, uid(context));
      },
      'routineStepRemove'
    ),
  },
};
