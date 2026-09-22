import { z } from 'zod';

const uuidString = z.string().uuid('Invalid UUID');
const folderIdString = z.string().regex(/^\d+$/, 'Invalid folder ID');
const activityIdString = z.string().regex(/^\d+$/, 'Invalid activity ID');
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)')
  .nullable();

const vidaDayOfWeek = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

/** Las mismas noches que los días de un VidaItem, sin repetidos. */
const nightDaysArray = z
  .array(vidaDayOfWeek)
  .min(1, 'At least one night is required')
  .max(7)
  .refine((days) => new Set(days).size === days.length, {
    message: 'vidaNightDays must not contain duplicates',
  })
  .nullable();

export const updateUserSettingsInputSchema = z.object({
  hideHiddenHabits: z.boolean().optional(),
  sleepActivityCategoryId: uuidString.nullable().optional(),
  habitReminderEnabled: z.boolean().optional(),
  habitReminderTime: timeSchema.optional(),
  dayStartReminderEnabled: z.boolean().optional(),
  dayStartReminderTime: timeSchema.optional(),
  standupTodoFolderId: folderIdString.nullable().optional(),
  houseworkActivityId: activityIdString.nullable().optional(),
  vidaDayStartTime: timeSchema.optional(),
  vidaDayEndTime: timeSchema.optional(),
  // La noche. **No se valida que despertar sea posterior a acostarse**: «23:00
  // → 05:00» cruza la medianoche y «01:00 → 06:40» no, y las dos son noches
  // legales. Lo único que se exige es el formato, y que no sean la misma hora.
  vidaNightBedTime: timeSchema.optional(),
  vidaNightWakeTime: timeSchema.optional(),
  vidaNightDays: nightDaysArray.optional(),
});
