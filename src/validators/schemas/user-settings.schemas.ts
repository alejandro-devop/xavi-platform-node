import { z } from 'zod';

const uuidString = z.string().uuid('Invalid UUID');

export const updateUserSettingsInputSchema = z.object({
  hideHiddenHabits: z.boolean().optional(),
  sleepActivityCategoryId: uuidString.nullable().optional(),
});
