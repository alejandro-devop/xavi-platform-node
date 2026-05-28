import { z } from 'zod';

const activityIdString = z.string().regex(/^\d+$/, 'Invalid activity ID');
const followUpIdString = z.string().regex(/^\d+$/, 'Invalid follow-up ID');
const uuidString = z.string().uuid('Invalid UUID');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (use HH:mm or HH:mm:ss)');

const activityStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
const activityPriority = z.enum(['low', 'medium', 'high', 'urgent']);

export const activityIdArgSchema = z.object({
  id: activityIdString,
});

export const activitiesListArgsSchema = z
  .object({
    status: activityStatus.nullish(),
    priority: activityPriority.nullish(),
    categoryId: uuidString.nullish(),
    startDate: z.coerce.date().nullish(),
    endDate: z.coerce.date().nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    status: d.status ?? undefined,
    priority: d.priority ?? undefined,
    categoryId: d.categoryId ?? undefined,
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
  categoryId: uuidString.nullable().optional(),
  scheduledDate: z.coerce.date().nullable().optional(),
});

export const activityEditInputSchema = z
  .object({
    id: activityIdString,
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    status: activityStatus.optional(),
    priority: activityPriority.optional(),
    categoryId: uuidString.nullable().optional(),
    scheduledDate: z.coerce.date().nullable().optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.status !== undefined ||
      d.priority !== undefined ||
      d.categoryId !== undefined ||
      d.scheduledDate !== undefined,
    { message: 'At least one field is required to update' }
  );

export const activityCategoryIdArgSchema = z.object({
  id: uuidString,
});

export const activityCategoryAddInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  icon: z.string().max(255).nullable().optional(),
  color: z.string().max(255).nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const activityCategoryEditInputSchema = z
  .object({
    id: uuidString,
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    icon: z.string().max(255).nullable().optional(),
    color: z.string().max(255).nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.icon !== undefined ||
      d.color !== undefined ||
      d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );

export const activityFollowUpsArgsSchema = z
  .object({
    activityId: activityIdString.nullish(),
    from: dateString.nullish(),
    to: dateString.nullish(),
    limit: z.number().int().positive().max(500).nullish(),
  })
  .transform((d) => ({
    activityId: d.activityId ?? undefined,
    from: d.from ?? undefined,
    to: d.to ?? undefined,
    limit: d.limit ?? undefined,
  }));

export const activityFollowUpsInDatesArgsSchema = z.object({
  from: dateString,
  to: dateString,
});

export const activityDayFollowUpsArgsSchema = z.object({
  date: dateString,
});

export const activityFollowUpIdArgSchema = z.object({
  id: followUpIdString,
});

export const activityFollowUpsFieldArgsSchema = z
  .object({
    limit: z.number().int().positive().max(500).nullish(),
    from: dateString.nullish(),
    to: dateString.nullish(),
  })
  .transform((d) => ({
    limit: d.limit ?? 50,
    from: d.from ?? undefined,
    to: d.to ?? undefined,
  }));

export const activityFollowUpAddInputSchema = z.object({
  activityId: activityIdString,
  date: dateString,
  startTime: timeString,
  durationMinutes: z.number().int().positive().max(24 * 60),
  notes: z.string().nullable().optional(),
});

export const activityFollowUpEditInputSchema = z
  .object({
    id: followUpIdString,
    date: dateString.optional(),
    startTime: timeString.optional(),
    durationMinutes: z.number().int().positive().max(24 * 60).optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (d) =>
      d.date !== undefined ||
      d.startTime !== undefined ||
      d.durationMinutes !== undefined ||
      d.notes !== undefined,
    { message: 'At least one field is required to update' }
  );
