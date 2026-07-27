import { z } from 'zod';

const uuidString = z.string().uuid('Invalid UUID');
const folderIdString = z.string().regex(/^\d+$/, 'Invalid folder ID');
const activityIdString = z.string().regex(/^\d+$/, 'Invalid activity ID');
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)')
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
});
