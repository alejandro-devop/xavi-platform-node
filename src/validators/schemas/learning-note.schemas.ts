import { z } from 'zod';

const tagIdString = z.string().regex(/^\d+$/, 'Invalid tag ID');
const slugString = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid tag slug');

export const learningNoteIdArgSchema = z.object({
  id: z.string().uuid('Invalid learning note ID'),
});

export const learningNoteAddInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  contentMarkdown: z.string().max(200000).optional(),
  tagIds: z.array(tagIdString).max(50).optional(),
});

export const learningNoteEditInputSchema = z
  .object({
    id: z.string().uuid('Invalid learning note ID'),
    title: z.string().trim().min(1).max(255).optional(),
    contentMarkdown: z.string().max(200000).optional(),
    tagIds: z.array(tagIdString).max(50).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined || d.contentMarkdown !== undefined || d.tagIds !== undefined,
    { message: 'At least one field is required to update' },
  );

export const learningNotesListArgsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  tags: z.array(slugString).max(20).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const learningTagsArgsSchema = z.object({
  query: z.string().trim().max(100).optional(),
});

export const learningTagAddInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
