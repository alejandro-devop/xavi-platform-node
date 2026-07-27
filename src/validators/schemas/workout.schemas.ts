import { z } from 'zod';

const uuidString = z.string().uuid('Invalid UUID');
const followUpIdString = z.string().regex(/^\d+$/, 'Invalid follow-up ID');
const activityIdString = z.string().regex(/^\d+$/, 'Invalid activity ID');

const exerciseBodyRegion = z.enum(['upper', 'lower']);

const exerciseIdsArray = z
  .array(uuidString)
  .min(1, 'At least one exercise is required')
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'exerciseIds must not contain duplicates',
  });

const workoutExerciseIdsArray = z
  .array(uuidString)
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'workoutExerciseIds must not contain duplicates',
  });

export const exercisesArgsSchema = z.object({});

export const exerciseIdArgSchema = z.object({
  id: uuidString,
});

export const exerciseHistoryArgsSchema = z.object({
  exerciseId: uuidString,
  limit: z.number().int().min(1).max(100).optional(),
});

export const workoutReportsArgsSchema = z.object({
  windowDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
});

export const exerciseCreateInputSchema = z.object({
  name: z.string().min(1).max(255),
  bodyRegion: exerciseBodyRegion,
});

export const exerciseUpdateInputSchema = z
  .object({
    id: uuidString,
    name: z.string().min(1).max(255).optional(),
    bodyRegion: exerciseBodyRegion.optional(),
  })
  .refine((d) => d.name !== undefined || d.bodyRegion !== undefined, {
    message: 'At least one field is required to update',
  });

export const exerciseDeleteInputSchema = z.object({
  id: uuidString,
});

export const workoutSessionArgsSchema = z
  .object({
    id: uuidString.optional(),
    followUpId: followUpIdString.optional(),
  })
  .refine((d) => (d.id != null) !== (d.followUpId != null), {
    message: 'Provide exactly one of id or followUpId',
  });

export const workoutSessionStartInputSchema = z.object({
  followUpId: followUpIdString,
  exerciseIds: exerciseIdsArray,
});

export const workoutSetUpsertInputSchema = z.object({
  id: uuidString.optional(),
  sessionExerciseId: uuidString,
  setIndex: z.number().int().min(1).max(100),
  weightKg: z.number().min(0).max(2000),
  reps: z.number().int().min(1).max(1000),
});

export const workoutSetDeleteInputSchema = z.object({
  id: uuidString,
});

/** Extra fields accepted on Activity create/update (validated in activity schemas). */
export const activityWorkoutExerciseIdsSchema = workoutExerciseIdsArray.optional();

export const activityIdForWorkoutSchema = z.object({
  activityId: activityIdString,
});
