import { z } from 'zod';
import { optionalFolderIdSchema } from './todo-folder.schemas';

const todoPriority = z.enum(['low', 'medium', 'high', 'urgent']);
const dayOfWeek = z.number().int().min(0).max(6);

export const todoDailyTemplateIdArgSchema = z.object({
  id: z.string().uuid('Invalid template ID'),
});

export const todoDailyTemplatesDayArgSchema = z.object({
  day: dayOfWeek,
});

export const todoDailyTemplateAddInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(32_768).nullable().optional(),
  priority: todoPriority.optional(),
  folderId: optionalFolderIdSchema,
  days: z.array(dayOfWeek).min(1).max(7),
  orderIndex: z.number().int().min(0).optional(),
});

export const todoDailyTemplateEditInputSchema = z
  .object({
    id: z.string().uuid('Invalid template ID'),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(32_768).nullable().optional(),
    priority: todoPriority.optional(),
    folderId: optionalFolderIdSchema,
    days: z.array(dayOfWeek).min(1).max(7).optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.priority !== undefined ||
      d.folderId !== undefined ||
      d.days !== undefined ||
      d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );
