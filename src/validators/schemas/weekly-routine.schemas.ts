import { z } from 'zod';

const dayOfWeek = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);

const uuidSchema = z.string().uuid('Invalid ID');
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)');

export const weeklyRoutineIdArgSchema = z.object({ id: uuidSchema });

export const weeklyRoutinesListArgsSchema = z
  .object({
    isActive: z.boolean().nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    isActive: d.isActive ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 20,
  }));

export const weeklyRoutineAddInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  startDay: dayOfWeek.optional(),
  dayStartTime: timeSchema.optional(),
  dayEndTime: timeSchema.optional(),
});

export const weeklyRoutineEditInputSchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    startDay: dayOfWeek.optional(),
    dayStartTime: timeSchema.optional(),
    dayEndTime: timeSchema.optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.startDay !== undefined ||
      d.dayStartTime !== undefined ||
      d.dayEndTime !== undefined,
    { message: 'At least one field is required to update' }
  );

export const weeklyRoutineActivityAddInputSchema = z.object({
  routineId: uuidSchema,
  activityId: z.string().regex(/^\d+$/, 'Invalid activity ID'),
  dayOfWeek,
  startTime: timeSchema,
  durationMinutes: z.number().int().positive(),
  notes: z.string().nullable().optional(),
});

export const weeklyRoutineActivityBatchAddInputSchema = z.object({
  routineId: uuidSchema,
  activityId: z.string().regex(/^\d+$/, 'Invalid activity ID'),
  days: z.array(dayOfWeek).min(1, 'At least one day is required'),
  startTime: timeSchema,
  durationMinutes: z.number().int().positive(),
  notes: z.string().nullable().optional(),
});

export const weeklyRoutineActivityEditInputSchema = z
  .object({
    id: uuidSchema,
    dayOfWeek: dayOfWeek.optional(),
    startTime: timeSchema.optional(),
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.dayOfWeek !== undefined || d.startTime !== undefined || d.durationMinutes !== undefined || d.notes !== undefined,
    { message: 'At least one field is required to update' }
  );

export const weeklyRoutineActivityIdArgSchema = z.object({ id: uuidSchema });
