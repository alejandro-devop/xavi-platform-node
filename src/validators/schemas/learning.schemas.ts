import { z } from 'zod';

const learningResourceIdString = z.string().regex(/^\d+$/, 'Invalid learning resource ID');
const learningProgressIdString = z.string().regex(/^\d+$/, 'Invalid progress session ID');

const learningResourceType = z.enum([
  'article',
  'video',
  'book',
  'course',
  'podcast',
  'tutorial',
  'other',
]);

const learningResourceStatus = z.enum(['not_started', 'in_progress', 'completed', 'archived']);
const learningPriority = z.enum(['low', 'medium', 'high', 'urgent']);

export const learningResourceIdArgSchema = z.object({
  id: learningResourceIdString,
});

export const learningResourcesListArgsSchema = z
  .object({
    resourceType: learningResourceType.nullish(),
    status: learningResourceStatus.nullish(),
    priority: learningPriority.nullish(),
    category: z.string().max(100).nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    resourceType: d.resourceType ?? undefined,
    status: d.status ?? undefined,
    priority: d.priority ?? undefined,
    category: d.category ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 20,
  }));

export const learningResourceAddInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  resourceType: learningResourceType,
  url: z.string().url().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  priority: learningPriority.optional(),
  estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
});

export const learningResourceEditInputSchema = z
  .object({
    id: learningResourceIdString,
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    resourceType: learningResourceType.optional(),
    url: z.string().url().nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    priority: learningPriority.optional(),
    status: learningResourceStatus.optional(),
    estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.resourceType !== undefined ||
      d.url !== undefined ||
      d.category !== undefined ||
      d.priority !== undefined ||
      d.status !== undefined ||
      d.estimatedDurationMinutes !== undefined,
    { message: 'At least one field is required to update' }
  );

export const learningProgressAddInputSchema = z.object({
  resourceId: learningResourceIdString,
  durationMinutes: z.number().int().positive(),
  notes: z.string().nullable().optional(),
  progressPercentage: z.number().int().min(0).max(100).nullable().optional(),
  sessionDate: z.coerce.date().optional(),
});

export const learningProgressEditInputSchema = z
  .object({
    resourceId: learningResourceIdString,
    sessionId: learningProgressIdString,
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().nullable().optional(),
    progressPercentage: z.number().int().min(0).max(100).nullable().optional(),
    sessionDate: z.coerce.date().optional(),
  })
  .refine(
    (d) =>
      d.durationMinutes !== undefined ||
      d.notes !== undefined ||
      d.progressPercentage !== undefined ||
      d.sessionDate !== undefined,
    { message: 'At least one field is required to update' }
  );

export const learningProgressRemoveInputSchema = z.object({
  resourceId: learningResourceIdString,
  sessionId: learningProgressIdString,
});
