import { z } from 'zod';

const habitIdString = z.string().regex(/^\d+$/, 'Invalid habit ID');
const uuidString = z.string().uuid('Invalid UUID');
const followUpIdString = z.string().regex(/^\d+$/, 'Invalid follow-up ID');

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');

const habitFrequency = z.enum(['daily', 'weekly', 'custom']);

const legacyHabitFields = {
  categoryId: uuidString.nullish(),
  measureId: uuidString.nullish(),
  activityId: z.number().int().positive().nullish(),
  startDate: dateString.nullish(),
  endDate: dateString.nullish(),
  shouldAvoid: z.boolean().optional(),
  shouldKeep: z.boolean().optional(),
  habitType: z.enum(['boolean', 'count', 'time']).optional(),
  weeklyLifelines: z.number().int().min(0).optional(),
  dailyGoal: z.number().int().min(0).optional(),
  timerGoal: z.number().int().min(0).nullable().optional(),
  timesGoal: z.number().int().min(0).nullable().optional(),
  step: z.number().int().nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
};

export const habitIdArgSchema = z.object({
  id: habitIdString,
});

export const habitCategoryIdArgSchema = z.object({
  id: uuidString,
});

export const habitsListArgsSchema = z
  .object({
    isActive: z.boolean().nullish(),
    status: z.enum(['active', 'completed', 'archived']).nullish(),
    categoryId: uuidString.nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    isActive: d.isActive ?? undefined,
    status: d.status ?? undefined,
    categoryId: d.categoryId ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 50,
  }));

export const habitLogsArgsSchema = z
  .object({
    habitId: habitIdString,
    startDate: dateString.nullish(),
    endDate: dateString.nullish(),
    limit: z.number().int().positive().max(365).nullish(),
    isArchived: z.boolean().nullish(),
  })
  .transform((d) => ({
    habitId: d.habitId,
    startDate: d.startDate ?? undefined,
    endDate: d.endDate ?? undefined,
    limit: d.limit ?? 30,
    isArchived: d.isArchived ?? undefined,
  }));

export const habitLogsFieldArgsSchema = z
  .object({
    limit: z.number().int().positive().max(365).nullish(),
    isArchived: z.boolean().nullish(),
  })
  .transform((d) => ({
    limit: d.limit ?? 30,
    isArchived: d.isArchived ?? undefined,
  }));

export const habitFollowUpsFieldArgsSchema = habitLogsFieldArgsSchema;

export const habitStatsArgsSchema = z.object({
  habitId: habitIdString,
});

export const habitFollowUpsArgsSchema = z
  .object({
    habitId: habitIdString.nullish(),
    from: dateString.nullish(),
    to: dateString.nullish(),
    isArchived: z.boolean().nullish(),
    limit: z.number().int().positive().max(500).nullish(),
  })
  .transform((d) => ({
    habitId: d.habitId ?? undefined,
    from: d.from ?? undefined,
    to: d.to ?? undefined,
    isArchived: d.isArchived ?? undefined,
    limit: d.limit ?? 100,
  }));

export const habitMyDayArgsSchema = z.object({
  date: dateString,
});

export const habitFollowUpsInDatesArgsSchema = z.object({
  from: dateString,
  to: dateString,
});

export const habitAddInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().nullable().optional(),
  frequency: habitFrequency.optional(),
  targetCount: z.number().int().min(1).optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  ...legacyHabitFields,
});

const habitEditFields = [
  'name',
  'description',
  'frequency',
  'targetCount',
  'icon',
  'color',
  'isActive',
  'categoryId',
  'measureId',
  'activityId',
  'startDate',
  'endDate',
  'shouldAvoid',
  'shouldKeep',
  'habitType',
  'weeklyLifelines',
  'dailyGoal',
  'timerGoal',
  'timesGoal',
  'step',
  'orderIndex',
  'status',
] as const;

const habitStatus = z.enum(['active', 'completed', 'archived']);

export const habitEditInputSchema = z
  .object({
    id: habitIdString,
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    frequency: habitFrequency.optional(),
    targetCount: z.number().int().min(1).optional(),
    icon: z.string().max(50).nullable().optional(),
    color: z.string().max(20).nullable().optional(),
    isActive: z.boolean().optional(),
    status: habitStatus.optional(),
    ...legacyHabitFields,
  })
  .refine((d) => habitEditFields.some((k) => d[k as keyof typeof d] !== undefined), {
    message: 'At least one field is required to update',
  });

export const habitLogAddInputSchema = z.object({
  habitId: habitIdString,
  completedDate: dateString.optional(),
  count: z.number().int().min(0).optional(),
  time: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
  story: z.string().nullable().optional(),
  isAccomplished: z.boolean().optional(),
  isFailed: z.boolean().optional(),
  isLifeline: z.boolean().optional(),
  difficulty: z.number().int().min(0).max(4).nullable().optional(),
});

export const habitFollowUpAddInputSchema = z.object({
  habitId: habitIdString,
  date: dateString.optional(),
  count: z.number().int().min(0).optional(),
  time: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
  story: z.string().nullable().optional(),
  isAccomplished: z.boolean().optional(),
  isFailed: z.boolean().optional(),
  isLifeline: z.boolean().optional(),
  difficulty: z.number().int().min(0).max(4).nullable().optional(),
});

export const habitFollowUpEditInputSchema = z
  .object({
    id: followUpIdString,
    count: z.number().int().min(0).optional(),
    time: z.number().int().min(0).optional(),
    notes: z.string().nullable().optional(),
    story: z.string().nullable().optional(),
    isAccomplished: z.boolean().optional(),
    isFailed: z.boolean().optional(),
    archived: z.boolean().optional(),
    difficulty: z.number().int().min(0).max(4).nullable().optional(),
  })
  .refine(
    (d) =>
      d.count !== undefined ||
      d.time !== undefined ||
      d.notes !== undefined ||
      d.story !== undefined ||
      d.isAccomplished !== undefined ||
      d.isFailed !== undefined ||
      d.archived !== undefined ||
      d.difficulty !== undefined,
    { message: 'At least one field is required to update' }
  );

export const habitWeekViewArgsSchema = z
  .object({
    habitId: habitIdString,
    weekStart: dateString,
  })
  .refine(
    (d) => new Date(d.weekStart + 'T00:00:00Z').getUTCDay() === 1,
    { message: 'weekStart must be a Monday (ISO week start)' }
  );

export const habitCompleteArgSchema = z.object({ id: habitIdString });

export const habitFollowUpRemoveIdSchema = z.object({
  id: followUpIdString,
});

export const habitCategoryAddInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  icon: z.string().max(255).nullable().optional(),
  color: z.string().max(255).nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const habitCategoryEditInputSchema = z
  .object({
    id: uuidString,
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    icon: z.string().max(255).nullable().optional(),
    color: z.string().max(255).nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.icon !== undefined ||
      d.color !== undefined ||
      d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );

export const habitMeasureAddInputSchema = z.object({
  name: z.string().min(1).max(255),
  abbreviation: z.string().max(50).nullable().optional(),
  type: z.string().max(50).nullable().optional(),
});

export const habitMeasureEditInputSchema = z
  .object({
    id: uuidString,
    name: z.string().min(1).max(255).optional(),
    abbreviation: z.string().max(50).nullable().optional(),
    type: z.string().max(50).nullable().optional(),
  })
  .refine(
    (d) => d.name !== undefined || d.abbreviation !== undefined || d.type !== undefined,
    { message: 'At least one field is required to update' }
  );

export const habitMeasureIdArgSchema = z.object({
  id: uuidString,
});
