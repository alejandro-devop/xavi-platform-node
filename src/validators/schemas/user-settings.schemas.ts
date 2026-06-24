import { z } from 'zod';

export const updateUserSettingsInputSchema = z.object({
  hideHiddenHabits: z.boolean().optional(),
});
