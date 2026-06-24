import { z } from 'zod';

const sleepLogIdString = z.string().regex(/^\d+$/, 'Invalid sleep log ID');

const sleepQuality = z.enum(['poor', 'fair', 'good', 'excellent']);
const moodOnWaking = z.enum(['tired', 'groggy', 'refreshed', 'energized']);
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (use HH:mm or HH:mm:ss)');

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

export const sleepLogAddInputSchema = z
  .object({
    sleepDate: z.union([z.string(), z.date()]),
    bedtime: z.union([z.string(), z.date()]),
    wakeTime: z.union([z.string(), z.date()]),
    quality: sleepQuality.nullable().optional(),
    moodOnWaking: moodOnWaking.nullable().optional(),
    notes: z.string().nullable().optional(),
    bedtimeStartTime: timeString.optional(),
  })
  .transform((d) => ({
    sleepDate: new Date(d.sleepDate),
    bedtime: new Date(d.bedtime),
    wakeTime: new Date(d.wakeTime),
    quality: d.quality,
    moodOnWaking: d.moodOnWaking,
    notes: d.notes,
    bedtimeStartTime: d.bedtimeStartTime,
    bedtimeRaw: typeof d.bedtime === 'string' ? d.bedtime : undefined,
  }));

export const sleepLogEditInputSchema = z
  .object({
    id: sleepLogIdString,
    sleepDate: z.union([z.string(), z.date()]).optional(),
    bedtime: z.union([z.string(), z.date()]).optional(),
    wakeTime: z.union([z.string(), z.date()]).optional(),
    quality: sleepQuality.nullable().optional(),
    moodOnWaking: moodOnWaking.nullable().optional(),
    notes: z.string().nullable().optional(),
    bedtimeStartTime: timeString.optional(),
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
  )
  .transform((d) => ({
    id: d.id,
    sleepDate: d.sleepDate !== undefined ? new Date(d.sleepDate) : undefined,
    bedtime: d.bedtime !== undefined ? new Date(d.bedtime) : undefined,
    wakeTime: d.wakeTime !== undefined ? new Date(d.wakeTime) : undefined,
    quality: d.quality,
    moodOnWaking: d.moodOnWaking,
    notes: d.notes,
    bedtimeStartTime: d.bedtimeStartTime,
    bedtimeRaw: typeof d.bedtime === 'string' ? d.bedtime : undefined,
  }));
