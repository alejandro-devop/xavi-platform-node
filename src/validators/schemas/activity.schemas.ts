import { z } from 'zod';

const activityIdString = z.string().regex(/^\d+$/, 'Invalid activity ID');

const activityStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
const activityPriority = z.enum(['low', 'medium', 'high', 'urgent']);

export const activityIdArgSchema = z.object({
  id: activityIdString,
});

export const activitiesListArgsSchema = z
  .object({
    status: activityStatus.nullish(),
    priority: activityPriority.nullish(),
    startDate: z.coerce.date().nullish(),
    endDate: z.coerce.date().nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    status: d.status ?? undefined,
    priority: d.priority ?? undefined,
    startDate: d.startDate ?? undefined,
    endDate: d.endDate ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 20,
  }));

export const activityAddInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  status: activityStatus.optional(),
  priority: activityPriority.optional(),
  scheduledDate: z.coerce.date().nullable().optional(),
});

export const activityEditInputSchema = z
  .object({
    id: activityIdString,
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    status: activityStatus.optional(),
    priority: activityPriority.optional(),
    scheduledDate: z.coerce.date().nullable().optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.status !== undefined ||
      d.priority !== undefined ||
      d.scheduledDate !== undefined,
    { message: 'At least one field is required to update' }
  );
