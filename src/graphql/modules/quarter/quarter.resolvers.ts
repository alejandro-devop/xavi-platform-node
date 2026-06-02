import { z } from 'zod';
import { quarterService } from '../../../services/quarter.service';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  projectIdArgSchema,
  projectAddInputSchema,
  projectEditInputSchema,
  objectiveAddInputSchema,
  objectiveEditInputSchema,
  objectiveIdArgSchema,
  quarterIdArgSchema,
  quarterAddInputSchema,
  quarterEditInputSchema,
  quarterCompleteInputSchema,
  quarterProjectAddInputSchema,
  quarterProjectEditInputSchema,
  quarterProjectIdArgSchema,
  sessionLogAddInputSchema,
  sessionLogEditInputSchema,
  sessionLogIdArgSchema,
  sessionLogsListArgsSchema,
  projectSessionLogsArgsSchema,
  weekScheduleSlotAddInputSchema,
  weekScheduleSlotEditInputSchema,
  weekScheduleSlotIdArgSchema,
  weekScheduleSlotsListArgsSchema,
} from '../../../validators/schemas/quarter.schemas';
import type { Project, Quarter } from '../../../types/services/quarter.types';

function uid(context: GraphQLContext): number {
  return Number(context.user!.id);
}

export const quarterResolvers = {
  Project: {
    objectives: async (parent: Project, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'Project.objectives');
      if (parent.objectives) return parent.objectives;
      return quarterService.listObjectivesForProject(parent.id);
    },
    members: async (parent: Project, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'Project.members');
      if (parent.members) return parent.members;
      return quarterService.listMembersForProject(parent.id);
    },
  },

  Quarter: {
    projects: async (parent: Quarter, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'Quarter.projects');
      if (parent.projects) return parent.projects;
      return quarterService.listQuarterProjects(parent.id, uid(context));
    },
  },

  Query: {
    projects: withValidatedResolver(
      z.object({}),
      async (_: unknown, _args: unknown, context: GraphQLContext) => {
        requireAuth(context, 'projects');
        return quarterService.listProjects(uid(context));
      },
      'projects',
    ),

    project: withValidatedResolver(projectIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'project');
      return quarterService.getProjectById(id, uid(context));
    }, 'project'),

    quarters: withValidatedResolver(
      z.object({}),
      async (_: unknown, _args: unknown, context: GraphQLContext) => {
        requireAuth(context, 'quarters');
        return quarterService.listQuarters(uid(context));
      },
      'quarters',
    ),

    quarter: withValidatedResolver(quarterIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'quarter');
      return quarterService.getQuarterById(id, uid(context));
    }, 'quarter'),

    activeQuarter: withValidatedResolver(
      z.object({}),
      async (_: unknown, _args: unknown, context: GraphQLContext) => {
        requireAuth(context, 'activeQuarter');
        return quarterService.getActiveQuarter(uid(context));
      },
      'activeQuarter',
    ),

    sessionLogs: withValidatedResolver(sessionLogsListArgsSchema, async (_: unknown, args: { quarterId: string; projectId?: string }, context: GraphQLContext) => {
      requireAuth(context, 'sessionLogs');
      return quarterService.listSessionLogs(args.quarterId, uid(context), args.projectId);
    }, 'sessionLogs'),

    projectSessionLogs: withValidatedResolver(projectSessionLogsArgsSchema, async (_: unknown, { projectId }: { projectId: string }, context: GraphQLContext) => {
      requireAuth(context, 'projectSessionLogs');
      return quarterService.listSessionLogsByProject(projectId, uid(context));
    }, 'projectSessionLogs'),

    weekScheduleSlots: withValidatedResolver(weekScheduleSlotsListArgsSchema, async (_: unknown, { quarterId }: { quarterId: string }, context: GraphQLContext) => {
      requireAuth(context, 'weekScheduleSlots');
      return quarterService.listWeekScheduleSlots(quarterId, uid(context));
    }, 'weekScheduleSlots'),
  },

  Mutation: {
    projectAdd: withValidatedResolver(projectAddInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'projectAdd');
      return quarterService.createProject(uid(context), input);
    }, 'projectAdd'),

    projectEdit: withValidatedResolver(projectEditInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'projectEdit');
      const { id, ...rest } = input;
      return quarterService.updateProject(id, uid(context), rest);
    }, 'projectEdit'),

    projectRemove: withValidatedResolver(projectIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'projectRemove');
      return quarterService.deleteProject(id, uid(context));
    }, 'projectRemove'),

    projectObjectiveAdd: withValidatedResolver(objectiveAddInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'projectObjectiveAdd');
      return quarterService.addObjective(uid(context), input);
    }, 'projectObjectiveAdd'),

    projectObjectiveEdit: withValidatedResolver(objectiveEditInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'projectObjectiveEdit');
      const { id, ...rest } = input;
      return quarterService.updateObjective(id, uid(context), rest);
    }, 'projectObjectiveEdit'),

    projectObjectiveRemove: withValidatedResolver(objectiveIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'projectObjectiveRemove');
      return quarterService.removeObjective(id, uid(context));
    }, 'projectObjectiveRemove'),

    quarterAdd: withValidatedResolver(quarterAddInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'quarterAdd');
      return quarterService.createQuarter(uid(context), input);
    }, 'quarterAdd'),

    quarterEdit: withValidatedResolver(quarterEditInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'quarterEdit');
      const { id, ...rest } = input;
      return quarterService.updateQuarter(id, uid(context), rest);
    }, 'quarterEdit'),

    quarterActivate: withValidatedResolver(quarterIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'quarterActivate');
      return quarterService.activateQuarter(id, uid(context));
    }, 'quarterActivate'),

    quarterComplete: withValidatedResolver(quarterCompleteInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'quarterComplete');
      const { id, ...rest } = input;
      return quarterService.completeQuarter(id, uid(context), rest);
    }, 'quarterComplete'),

    quarterProjectAdd: withValidatedResolver(quarterProjectAddInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'quarterProjectAdd');
      return quarterService.addProjectToQuarter(uid(context), input);
    }, 'quarterProjectAdd'),

    quarterProjectEdit: withValidatedResolver(quarterProjectEditInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'quarterProjectEdit');
      const { id, ...rest } = input;
      return quarterService.updateQuarterProject(id, uid(context), rest);
    }, 'quarterProjectEdit'),

    quarterProjectRemove: withValidatedResolver(quarterProjectIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'quarterProjectRemove');
      return quarterService.removeProjectFromQuarter(id, uid(context));
    }, 'quarterProjectRemove'),

    sessionLogAdd: withValidatedResolver(sessionLogAddInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'sessionLogAdd');
      return quarterService.createSessionLog(uid(context), input);
    }, 'sessionLogAdd'),

    sessionLogEdit: withValidatedResolver(sessionLogEditInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'sessionLogEdit');
      const { id, ...rest } = input;
      return quarterService.updateSessionLog(id, uid(context), rest);
    }, 'sessionLogEdit'),

    sessionLogRemove: withValidatedResolver(sessionLogIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'sessionLogRemove');
      return quarterService.deleteSessionLog(id, uid(context));
    }, 'sessionLogRemove'),

    weekScheduleSlotAdd: withValidatedResolver(weekScheduleSlotAddInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'weekScheduleSlotAdd');
      return quarterService.createWeekScheduleSlot(uid(context), input);
    }, 'weekScheduleSlotAdd'),

    weekScheduleSlotEdit: withValidatedResolver(weekScheduleSlotEditInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'weekScheduleSlotEdit');
      const { id, ...rest } = input;
      return quarterService.updateWeekScheduleSlot(id, uid(context), rest);
    }, 'weekScheduleSlotEdit'),

    weekScheduleSlotRemove: withValidatedResolver(weekScheduleSlotIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'weekScheduleSlotRemove');
      return quarterService.deleteWeekScheduleSlot(id, uid(context));
    }, 'weekScheduleSlotRemove'),
  },
};
