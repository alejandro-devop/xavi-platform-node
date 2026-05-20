import { sleepService } from '../../../services/sleep.service';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  sleepLogAddInputSchema,
  sleepLogEditInputSchema,
  sleepLogIdArgSchema,
  sleepLogsListArgsSchema,
  sleepStatsArgsSchema,
} from '../../../validators/schemas/sleep.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const sleepResolvers = {
  Query: {
    sleepLog: withValidatedResolver(
      sleepLogIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'sleepLog');
        return await sleepService.getSleepLogById(id, uid(context));
      },
      'sleepLog'
    ),

    sleepLogs: withValidatedResolver(
      sleepLogsListArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'sleepLogs');
        return await sleepService.listSleepLogs(uid(context), args);
      },
      'sleepLogs'
    ),

    sleepStats: withValidatedResolver(
      sleepStatsArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'sleepStats');
        return await sleepService.getSleepStats(uid(context), args);
      },
      'sleepStats'
    ),
  },

  Mutation: {
    sleepLogAdd: withValidatedResolver(
      sleepLogAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'sleepLogAdd');
        return await sleepService.createSleepLog(uid(context), input);
      },
      'sleepLogAdd'
    ),

    sleepLogEdit: withValidatedResolver(
      sleepLogEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'sleepLogEdit');
        const { id, ...fields } = input;
        return await sleepService.updateSleepLog(id, uid(context), fields);
      },
      'sleepLogEdit'
    ),

    sleepLogRemove: withValidatedResolver(
      sleepLogIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'sleepLogRemove');
        return await sleepService.deleteSleepLog(id, uid(context));
      },
      'sleepLogRemove'
    ),
  },
};
