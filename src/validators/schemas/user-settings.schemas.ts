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

/**
 * El Pomodoro de Vida. Llega entero y reemplaza entero al anterior. El
 * descanso largo es un par: o vienen los dos campos o ninguno, porque uno sin
 * el otro no dice nada. Las categorías repetidas se quitan en silencio.
 */
const vidaPomodoroSchema = z
  .object({
    enabled: z.boolean(),
    categoryIds: z
      .array(uuidString)
      .max(50)
      .transform((ids) => [...new Set(ids)]),
    workMinutes: z.number().int().min(5).max(240),
    breakMinutes: z.number().int().min(1).max(60),
    longBreakMinutes: z.number().int().min(1).max(120).nullable().optional(),
    longBreakEvery: z.number().int().min(2).max(10).nullable().optional(),
  })
  .transform((d) => ({
    ...d,
    longBreakMinutes: d.longBreakMinutes ?? null,
    longBreakEvery: d.longBreakEvery ?? null,
  }))
  .refine((d) => (d.longBreakMinutes === null) === (d.longBreakEvery === null), {
    message: 'longBreakMinutes and longBreakEvery must be both set or both null',
    path: ['longBreakEvery'],
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
  vidaPomodoro: vidaPomodoroSchema.optional(),
});
