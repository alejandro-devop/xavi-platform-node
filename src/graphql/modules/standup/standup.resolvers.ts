import { standupService } from '../../../services/standup.service';
import { todoService } from '../../../services/todo.service';
import { NotFoundError } from '../../../shared/errors';
import {
  standupCarryOverInputSchema,
  standupDateArgsSchema,
  standupItemCreateInputSchema,
  standupItemCreateTodoInputSchema,
  standupItemDeleteInputSchema,
  standupItemUpdateInputSchema,
  standupMemberCreateInputSchema,
  standupMemberDeleteInputSchema,
  standupMemberUpdateInputSchema,
  standupMembersArgsSchema,
  standupWeekArgsSchema,
} from '../../../validators/schemas/standup.schemas';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const standupResolvers = {
  StandupItem: {
    member: async (
      parent: { memberId: string },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'StandupItem.member');
      const members = await standupService.listMembers(uid(context), true);
      return members.find((m) => m.id === parent.memberId) ?? null;
    },
    linkedTodo: async (
      parent: { linkedTodoId: string | null },
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'StandupItem.linkedTodo');
      if (!parent.linkedTodoId) return null;
      try {
        return await todoService.getTodoById(parent.linkedTodoId, uid(context));
      } catch (error) {
        if (error instanceof NotFoundError) return null;
        throw error;
      }
    },
  },

  Query: {
    standupMembers: withValidatedResolver(
      standupMembersArgsSchema,
      async (_parent, args: { includeInactive?: boolean }, context) => {
        requireAuth(context, 'standupMembers');
        return standupService.listMembers(uid(context), args.includeInactive ?? false);
      },
      'standupMembers'
    ),

    standupDay: withValidatedResolver(
      standupDateArgsSchema,
      async (_parent, { date }: { date: string }, context) => {
        requireAuth(context, 'standupDay');
        return standupService.getDayView(uid(context), date);
      },
      'standupDay'
    ),

    standupDaySummary: withValidatedResolver(
      standupDateArgsSchema,
      async (_parent, { date }: { date: string }, context) => {
        requireAuth(context, 'standupDaySummary');
        return standupService.getDaySummary(uid(context), date);
      },
      'standupDaySummary'
    ),

    standupWeek: withValidatedResolver(
      standupWeekArgsSchema,
      async (_parent, { endDate, days }: { endDate: string; days?: number }, context) => {
        requireAuth(context, 'standupWeek');
        return standupService.getWeekView(uid(context), endDate, days);
      },
      'standupWeek'
    ),
  },

  Mutation: {
    standupMemberCreate: withValidatedResolver(
      standupMemberCreateInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupMemberCreate');
        return standupService.createMember(uid(context), input);
      },
      'standupMemberCreate'
    ),

    standupMemberUpdate: withValidatedResolver(
      standupMemberUpdateInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupMemberUpdate');
        const { id, ...fields } = input;
        return standupService.updateMember(uid(context), id, fields);
      },
      'standupMemberUpdate'
    ),

    standupMemberDelete: withValidatedResolver(
      standupMemberDeleteInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupMemberDelete');
        return standupService.deleteMember(uid(context), input.id);
      },
      'standupMemberDelete'
    ),

    standupOpenDay: withValidatedResolver(
      standupDateArgsSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupOpenDay');
        return standupService.openDay(uid(context), input.date);
      },
      'standupOpenDay'
    ),

    standupCloseDay: withValidatedResolver(
      standupDateArgsSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupCloseDay');
        return standupService.closeDay(uid(context), input.date);
      },
      'standupCloseDay'
    ),

    standupCarryOver: withValidatedResolver(
      standupCarryOverInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupCarryOver');
        return standupService.carryOverItems(uid(context), input);
      },
      'standupCarryOver'
    ),

    standupItemCreate: withValidatedResolver(
      standupItemCreateInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupItemCreate');
        return standupService.createItem(uid(context), {
          ...input,
          notes: input.notes ?? null,
          ticketNumber: input.ticketNumber ?? null,
        });
      },
      'standupItemCreate'
    ),

    standupItemUpdate: withValidatedResolver(
      standupItemUpdateInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupItemUpdate');
        const { id, ...fields } = input;
        return standupService.updateItem(uid(context), id, fields);
      },
      'standupItemUpdate'
    ),

    standupItemDelete: withValidatedResolver(
      standupItemDeleteInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupItemDelete');
        return standupService.deleteItem(uid(context), input.id);
      },
      'standupItemDelete'
    ),

    standupItemCreateTodo: withValidatedResolver(
      standupItemCreateTodoInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'standupItemCreateTodo');
        return standupService.createTodoFromItem(uid(context), input.itemId);
      },
      'standupItemCreateTodo'
    ),
  },
};
