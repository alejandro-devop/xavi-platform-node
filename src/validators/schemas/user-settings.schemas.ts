import { z } from 'zod';

const uuidString = z.string().uuid('Invalid UUID');
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)')
  .nullable();

export const updateUserSettingsInputSchema = z.object({
  hideHiddenHabits: z.boolean().optional(),
  sleepActivityCategoryId: uuidString.nullable().optional(),
  habitReminderEnabled: z.boolean().optional(),
  habitReminderTime: timeSchema.optional(),
});
