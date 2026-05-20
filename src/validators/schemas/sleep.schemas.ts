import { z } from 'zod';

const sleepLogIdString = z.string().regex(/^\d+$/, 'Invalid sleep log ID');

const sleepQuality = z.enum(['poor', 'fair', 'good', 'excellent']);
const moodOnWaking = z.enum(['tired', 'groggy', 'refreshed', 'energized']);

export const sleepLogIdArgSchema = z.object({
  id: sleepLogIdString,
});

export const sleepLogsListArgsSchema = z
  .object({
    startDate: z.coerce.date().nullish(),
    endDate: z.coerce.date().nullish(),
    quality: sleepQuality.nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    startDate: d.startDate ?? undefined,
    endDate: d.endDate ?? undefined,
    quality: d.quality ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 30,
  }));

export const sleepStatsArgsSchema = z
  .object({
    startDate: z.coerce.date().nullish(),
    endDate: z.coerce.date().nullish(),
  })
  .transform((d) => ({
    startDate: d.startDate ?? undefined,
    endDate: d.endDate ?? undefined,
  }));

export const sleepLogAddInputSchema = z.object({
  sleepDate: z.coerce.date(),
  bedtime: z.coerce.date(),
  wakeTime: z.coerce.date(),
  quality: sleepQuality.nullable().optional(),
  moodOnWaking: moodOnWaking.nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const sleepLogEditInputSchema = z
  .object({
    id: sleepLogIdString,
    sleepDate: z.coerce.date().optional(),
    bedtime: z.coerce.date().optional(),
    wakeTime: z.coerce.date().optional(),
    quality: sleepQuality.nullable().optional(),
    moodOnWaking: moodOnWaking.nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (d) =>
      d.sleepDate !== undefined ||
      d.bedtime !== undefined ||
      d.wakeTime !== undefined ||
      d.quality !== undefined ||
      d.moodOnWaking !== undefined ||
      d.notes !== undefined,
    { message: 'At least one field is required to update' }
  );
