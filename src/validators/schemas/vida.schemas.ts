import { z } from 'zod';

const uuidString = z.string().uuid('Invalid UUID');
const activityIdString = z.string().regex(/^\d+$/, 'Invalid activity ID');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');
const clientIdString = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'clientId must be a UUID v7'
  );

const vidaDayOfWeek = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const daysArray = z
  .array(vidaDayOfWeek)
  .min(1, 'At least one day is required')
  .max(7)
  .refine((days) => new Set(days).size === days.length, {
    message: 'days must not contain duplicates',
  });

export const vidaItemsArgsSchema = z.object({
  includeInactive: z.boolean().optional(),
});

export const vidaDateArgsSchema = z.object({
  date: dateString,
});

export const vidaItemCreateInputSchema = z.object({
  activityId: activityIdString,
  days: daysArray,
  notes: z.string().max(2000).nullish(),
  orderIndex: z.number().int().min(0).optional(),
  clientId: clientIdString.optional(),
});

export const vidaItemUpdateInputSchema = z
  .object({
    id: uuidString,
    days: daysArray.optional(),
    notes: z.string().max(2000).nullish(),
    isActive: z.boolean().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.days !== undefined ||
      d.notes !== undefined ||
      d.isActive !== undefined ||
      d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );

export const vidaItemDeleteInputSchema = z.object({
  id: uuidString,
});

export const vidaMarkTakenTodayInputSchema = z.object({
  vidaItemId: uuidString,
  date: dateString,
});

export const vidaUnmarkTakenTodayInputSchema = z.object({
  vidaItemId: uuidString,
  date: dateString,
});
