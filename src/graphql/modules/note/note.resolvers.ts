import { noteService } from '../../../services/note.service';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  noteAddInputSchema,
  noteEditInputSchema,
  noteIdArgSchema,
  notesListArgsSchema,
} from '../../../validators/schemas/note.schemas';
import type { Note } from '../../../types/services/note.types';

function uid(context: GraphQLContext): number {
  return Number(context.user!.id);
}

export const noteResolvers = {
  Note: {
    tags: async (parent: Note, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'Note.tags');
      if (parent.tags) return parent.tags;
      return noteService.listTagsForNote(parent.id);
    },
  },

  Query: {
    note: withValidatedResolver(noteIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'note');
      return noteService.getNoteById(id, uid(context));
    }, 'note'),

    notes: withValidatedResolver(notesListArgsSchema, async (_: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
      requireAuth(context, 'notes');
      return noteService.listNotes(uid(context), args as any);
    }, 'notes'),
  },

  Mutation: {
    noteAdd: withValidatedResolver(noteAddInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'noteAdd');
      return noteService.createNote(uid(context), input);
    }, 'noteAdd'),

    noteEdit: withValidatedResolver(noteEditInputSchema, async (_: unknown, { input }: { input: any }, context: GraphQLContext) => {
      requireAuth(context, 'noteEdit');
      const { id, ...rest } = input;
      return noteService.updateNote(id, uid(context), rest);
    }, 'noteEdit'),

    noteRemove: withValidatedResolver(noteIdArgSchema, async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context, 'noteRemove');
      return noteService.deleteNote(id, uid(context));
    }, 'noteRemove'),
  },
};
