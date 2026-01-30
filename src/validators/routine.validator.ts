import { z } from 'zod';

// Valid days of week
const daysOfWeekEnum = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

// ============ ROUTINES ============

export const createRoutineSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    daysOfWeek: z.array(daysOfWeekEnum).optional().default([]),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night', 'anytime']).optional().default('anytime'),
  }),
});

export const getRoutinesSchema = z.object({
  query: z.object({
    isActive: z.enum(['true', 'false']).optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night', 'anytime']).optional(),
    dayOfWeek: daysOfWeekEnum.optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getRoutineSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const updateRoutineSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    daysOfWeek: z.array(daysOfWeekEnum).optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night', 'anytime']).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteRoutineSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const toggleRoutineActiveSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// ============ ROUTINE STEPS ============

export const createRoutineStepSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // routine id
  }),
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
    orderIndex: z.number().int().min(0).optional().default(0),
  }),
});

export const updateRoutineStepSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // routine id
    stepId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
    orderIndex: z.number().int().min(0).optional(),
  }),
});

export const deleteRoutineStepSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // routine id
    stepId: z.string().regex(/^\d+$/),
  }),
});
