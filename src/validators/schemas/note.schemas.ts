import { z } from 'zod';

const tagIdString = z.string().regex(/^\d+$/, 'Invalid tag ID');

export const noteIdArgSchema = z.object({
  id: z.string().uuid('Invalid note ID'),
});

export const noteAddInputSchema = z.object({
  content: z.string().max(50000),
  tagIds: z.array(tagIdString).max(50).optional(),
});

export const noteEditInputSchema = z
  .object({
    id: z.string().uuid('Invalid note ID'),
    content: z.string().max(50000).optional(),
    tagIds: z.array(tagIdString).max(50).optional(),
  })
  .refine((d) => d.content !== undefined || d.tagIds !== undefined, {
    message: 'At least one field is required to update',
  });

export const notesListArgsSchema = z.object({
  tagId: tagIdString.optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
