import { z } from 'zod';
import { tagIdsArraySchema } from './todo-tag.schemas';

const todoIdString = z.string().regex(/^\d+$/, 'Invalid todo ID');
const subtaskIdString = z.string().regex(/^\d+$/, 'Invalid subtask ID');

const todoStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
const todoPriority = z.enum(['low', 'medium', 'high', 'urgent']);

export const todoIdArgSchema = z.object({
  id: todoIdString,
});

const tagIdFilter = z.string().regex(/^\d+$/, 'Invalid tag ID').nullish();

export const todosListArgsSchema = z
  .object({
    status: todoStatus.nullish(),
    priority: todoPriority.nullish(),
    dueBefore: z.coerce.date().nullish(),
    dueAfter: z.coerce.date().nullish(),
    tagId: tagIdFilter,
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    status: d.status ?? undefined,
    priority: d.priority ?? undefined,
    dueBefore: d.dueBefore ?? undefined,
    dueAfter: d.dueAfter ?? undefined,
    tagId: d.tagId ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 20,
  }));

export const todoAddInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  status: todoStatus.optional(),
  priority: todoPriority.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  tagIds: tagIdsArraySchema,
});

export const todoEditInputSchema = z
  .object({
    id: todoIdString,
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    status: todoStatus.optional(),
    priority: todoPriority.optional(),
    dueDate: z.coerce.date().nullable().optional(),
    tagIds: tagIdsArraySchema,
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.status !== undefined ||
      d.priority !== undefined ||
      d.dueDate !== undefined ||
      d.tagIds !== undefined,
    { message: 'At least one field is required to update' }
  );

export const todoSubtaskAddInputSchema = z.object({
  todoId: todoIdString,
  title: z.string().min(1).max(255),
  orderIndex: z.number().int().min(0).optional(),
});

export const todoSubtaskEditInputSchema = z
  .object({
    todoId: todoIdString,
    subtaskId: subtaskIdString,
    title: z.string().min(1).max(255).optional(),
    isCompleted: z.boolean().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined || d.isCompleted !== undefined || d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );

export const todoSubtaskRemoveInputSchema = z.object({
  todoId: todoIdString,
  subtaskId: subtaskIdString,
});
