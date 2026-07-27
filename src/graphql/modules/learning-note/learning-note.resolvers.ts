import { learningNoteService } from '../../../services/learning-note.service';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  learningNoteAddInputSchema,
  learningNoteEditInputSchema,
  learningNoteIdArgSchema,
  learningNotesListArgsSchema,
  learningTagAddInputSchema,
  learningTagsArgsSchema,
} from '../../../validators/schemas/learning-note.schemas';
import type { LearningNote } from '../../../types/services/learning-note.types';

function uid(context: GraphQLContext): number {
  return Number(context.user!.id);
}

export const learningNoteResolvers = {
  LearningNote: {
    tags: async (parent: LearningNote, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'LearningNote.tags');
      if (parent.tags) return parent.tags;
      return learningNoteService.listTagsForNote(parent.id);
    },
  },

  Query: {
    learningNote: withValidatedResolver(
      learningNoteIdArgSchema,
      async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
        requireAuth(context, 'learningNote');
        return learningNoteService.getLearningNoteById(id, uid(context));
      },
      'learningNote',
    ),

    learningNotes: withValidatedResolver(
      learningNotesListArgsSchema,
      async (_: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
        requireAuth(context, 'learningNotes');
        return learningNoteService.listLearningNotes(uid(context), args as any);
      },
      'learningNotes',
    ),

    learningTags: withValidatedResolver(
      learningTagsArgsSchema,
      async (_: unknown, { query }: { query?: string }, context: GraphQLContext) => {
        requireAuth(context, 'learningTags');
        return learningNoteService.listLearningTags(uid(context), query);
      },
      'learningTags',
    ),
  },

  Mutation: {
    learningNoteAdd: withValidatedResolver(
      learningNoteAddInputSchema,
      async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
        requireAuth(context, 'learningNoteAdd');
        return learningNoteService.createLearningNote(uid(context), input);
      },
      'learningNoteAdd',
    ),

    learningNoteEdit: withValidatedResolver(
      learningNoteEditInputSchema,
      async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
        requireAuth(context, 'learningNoteEdit');
        const { id, ...rest } = input;
        return learningNoteService.updateLearningNote(id, uid(context), rest);
      },
      'learningNoteEdit',
    ),

    learningNoteRemove: withValidatedResolver(
      learningNoteIdArgSchema,
      async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
        requireAuth(context, 'learningNoteRemove');
        return learningNoteService.deleteLearningNote(id, uid(context));
      },
      'learningNoteRemove',
    ),

    learningTagAdd: withValidatedResolver(
      learningTagAddInputSchema,
      async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
        requireAuth(context, 'learningTagAdd');
        return learningNoteService.createLearningTag(uid(context), input);
      },
      'learningTagAdd',
    ),
  },
};
