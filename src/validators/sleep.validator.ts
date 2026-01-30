import { z } from 'zod';

export const createSleepLogSchema = z.object({
  body: z.object({
    sleepDate: z.string().date(),
    bedtime: z.string().datetime(),
    wakeTime: z.string().datetime(),
    quality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
    moodOnWaking: z.enum(['tired', 'groggy', 'refreshed', 'energized']).optional(),
    notes: z.string().optional(),
  }),
});

export const getSleepLogsSchema = z.object({
  query: z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    quality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getSleepLogSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const updateSleepLogSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    sleepDate: z.string().date().optional(),
    bedtime: z.string().datetime().optional(),
    wakeTime: z.string().datetime().optional(),
    quality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
    moodOnWaking: z.enum(['tired', 'groggy', 'refreshed', 'energized']).optional(),
    notes: z.string().optional(),
  }),
});

export const deleteSleepLogSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const getSleepStatsSchema = z.object({
  query: z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
  }),
});
