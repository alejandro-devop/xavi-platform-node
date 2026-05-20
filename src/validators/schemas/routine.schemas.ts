import { z } from 'zod';

const routineIdString = z.string().regex(/^\d+$/, 'Invalid routine ID');
const stepIdString = z.string().regex(/^\d+$/, 'Invalid step ID');

const dayOfWeek = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const timeOfDay = z.enum(['morning', 'afternoon', 'evening', 'night', 'anytime']);

export const routineIdArgSchema = z.object({
  id: routineIdString,
});

export const routinesListArgsSchema = z
  .object({
    isActive: z.boolean().nullish(),
    timeOfDay: timeOfDay.nullish(),
    dayOfWeek: dayOfWeek.nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    isActive: d.isActive ?? undefined,
    timeOfDay: d.timeOfDay ?? undefined,
    dayOfWeek: d.dayOfWeek ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 20,
  }));

export const routineAddInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  daysOfWeek: z.array(dayOfWeek).optional(),
  timeOfDay: timeOfDay.optional(),
});

export const routineEditInputSchema = z
  .object({
    id: routineIdString,
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    daysOfWeek: z.array(dayOfWeek).optional(),
    timeOfDay: timeOfDay.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.daysOfWeek !== undefined ||
      d.timeOfDay !== undefined ||
      d.isActive !== undefined,
    { message: 'At least one field is required to update' }
  );

export const routineStepAddInputSchema = z.object({
  routineId: routineIdString,
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const routineStepEditInputSchema = z
  .object({
    routineId: routineIdString,
    stepId: stepIdString,
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    durationMinutes: z.number().int().positive().nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.durationMinutes !== undefined ||
      d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );

export const routineStepRemoveInputSchema = z.object({
  routineId: routineIdString,
  stepId: stepIdString,
});
