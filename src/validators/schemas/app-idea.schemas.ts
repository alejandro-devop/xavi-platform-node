import { z } from 'zod';

export const appIdeaStatuses = [
  'draft',
  'exploring',
  'building',
  'shipped',
  'archived',
] as const;

const appIdeaStatusSchema = z.enum(appIdeaStatuses);

export const appIdeaIdArgSchema = z.object({
  id: z.string().uuid('Invalid app idea ID'),
});

export const appIdeaAddInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  contentMarkdown: z.string().max(200000).optional(),
  status: appIdeaStatusSchema.optional(),
});

export const appIdeaEditInputSchema = z
  .object({
    id: z.string().uuid('Invalid app idea ID'),
    title: z.string().trim().min(1).max(255).optional(),
    contentMarkdown: z.string().max(200000).optional(),
    status: appIdeaStatusSchema.optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.contentMarkdown !== undefined ||
      d.status !== undefined,
    { message: 'At least one field is required to update' },
  );

export const appIdeasListArgsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: appIdeaStatusSchema.optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
