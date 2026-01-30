import { z } from 'zod';

export const createHabitSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
    description: z.string().optional(),
    frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
    targetCount: z.number().int().min(1).optional(),
    icon: z.string().max(50).optional(),
    color: z.string().max(20).optional(),
  }),
});

export const updateHabitSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
    description: z.string().optional().nullable(),
    frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
    targetCount: z.number().int().min(1).optional(),
    icon: z.string().max(50).optional().nullable(),
    color: z.string().max(20).optional().nullable(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const getHabitSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const deleteHabitSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const getHabitsSchema = z.object({
  query: z.object({
    isActive: z.enum(['true', 'false']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const logHabitSchema = z.object({
  body: z.object({
    completedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)').optional(),
    count: z.number().int().min(1).optional(),
    notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const getHabitLogsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getHabitStatsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});
