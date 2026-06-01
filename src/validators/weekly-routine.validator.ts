import { z } from 'zod';

const dayOfWeek = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);

const uuidParam = z.string().uuid('Invalid ID');
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)');

export const createWeeklyRoutineSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    startDay: dayOfWeek.optional().default('monday'),
    dayStartTime: timeSchema.optional(),
    dayEndTime: timeSchema.optional(),
  }),
});

export const listWeeklyRoutinesSchema = z.object({
  query: z.object({
    isActive: z.enum(['true', 'false']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getWeeklyRoutineSchema = z.object({
  params: z.object({ id: uuidParam }),
});

export const updateWeeklyRoutineSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    startDay: dayOfWeek.optional(),
    dayStartTime: timeSchema.optional(),
    dayEndTime: timeSchema.optional(),
  }),
});

export const deleteWeeklyRoutineSchema = z.object({
  params: z.object({ id: uuidParam }),
});

export const toggleWeeklyRoutineSchema = z.object({
  params: z.object({ id: uuidParam }),
});

export const addWeeklyRoutineActivitySchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    activityId: z.string().regex(/^\d+$/, 'Invalid activity ID'),
    dayOfWeek,
    startTime: timeSchema,
    durationMinutes: z.number().int().positive(),
    notes: z.string().optional(),
  }),
});

export const updateWeeklyRoutineActivitySchema = z.object({
  params: z.object({
    id: uuidParam,
    activityEntryId: uuidParam,
  }),
  body: z.object({
    dayOfWeek: dayOfWeek.optional(),
    startTime: timeSchema.optional(),
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().nullable().optional(),
  }),
});

export const deleteWeeklyRoutineActivitySchema = z.object({
  params: z.object({
    id: uuidParam,
    activityEntryId: uuidParam,
  }),
});
