import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid ID');

export const projectIdArgSchema = z.object({ id: uuidSchema });

export const projectAddInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
});

export const projectEditInputSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
});

export const objectiveAddInputSchema = z.object({
  projectId: uuidSchema,
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const objectiveEditInputSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const objectiveIdArgSchema = z.object({ id: uuidSchema });

export const quarterIdArgSchema = z.object({ id: uuidSchema });

export const quarterAddInputSchema = z.object({
  name: z.string().min(1).max(255),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const quarterEditInputSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(255).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  retrospectiveNotes: z.string().max(50000).optional(),
  summaryNotes: z.string().max(50000).optional(),
});

export const quarterCompleteInputSchema = z.object({
  id: uuidSchema,
  retrospectiveNotes: z.string().max(50000).optional(),
  summaryNotes: z.string().max(50000).optional(),
});

export const quarterProjectAddInputSchema = z.object({
  quarterId: uuidSchema,
  projectId: uuidSchema,
  weeklyHours: z.number().min(0).max(168),
});

export const quarterProjectEditInputSchema = z.object({
  id: uuidSchema,
  weeklyHours: z.number().min(0).max(168),
});

export const quarterProjectIdArgSchema = z.object({ id: uuidSchema });

export const sessionLogAddInputSchema = z.object({
  quarterId: uuidSchema,
  projectId: uuidSchema,
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  content: z.string().max(50000),
});

export const sessionLogEditInputSchema = z.object({
  id: uuidSchema,
  content: z.string().max(50000).optional(),
});

export const sessionLogIdArgSchema = z.object({ id: uuidSchema });

export const sessionLogsListArgsSchema = z.object({
  quarterId: uuidSchema,
  projectId: uuidSchema.optional(),
});

export const projectSessionLogsArgsSchema = z.object({
  projectId: uuidSchema,
});

const dayOfWeekEnum = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const weekScheduleSlotAddInputSchema = z.object({
  quarterId: uuidSchema,
  projectId: uuidSchema,
  dayOfWeek: dayOfWeekEnum,
  startTime: z.string().regex(timeRegex, 'Time must be HH:MM').optional(),
  hours: z.number().positive().max(24),
  notes: z.string().max(500).optional(),
});

export const weekScheduleSlotEditInputSchema = z.object({
  id: uuidSchema,
  startTime: z.string().regex(timeRegex).nullable().optional(),
  hours: z.number().positive().max(24).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const weekScheduleSlotIdArgSchema = z.object({ id: uuidSchema });

export const weekScheduleSlotsListArgsSchema = z.object({
  quarterId: uuidSchema,
});
