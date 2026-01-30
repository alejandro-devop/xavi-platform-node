import { z } from 'zod';

export const createActivitySchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    scheduledDate: z.string().datetime().optional(),
  }),
});

export const updateActivitySchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    scheduledDate: z.string().datetime().optional().nullable(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const getActivitySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const deleteActivitySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const completeActivitySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const getActivitiesSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});
