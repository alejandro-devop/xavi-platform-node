import { z } from 'zod';
import { optionalFolderIdSchema, folderIdString } from './todo-folder.schemas';
import { tagIdsArraySchema } from './todo-tag.schemas';

const todoIdString = z.string().regex(/^\d+$/, 'Invalid todo ID');
const subtaskIdString = z.string().regex(/^\d+$/, 'Invalid subtask ID');

const todoStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
const todoPriority = z.enum(['low', 'medium', 'high', 'urgent']);

/** Markdown descriptions — aligns with PostgreSQL TEXT practical limit for API payloads */
export const TODO_DESCRIPTION_MAX_LENGTH = 32_768;

const todoDescriptionSchema = z
  .string()
  .max(TODO_DESCRIPTION_MAX_LENGTH)
  .nullable()
  .optional();

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
    folderId: folderIdString.nullish(),
    withoutFolder: z.boolean().nullish(),
    selectedToday: z.boolean().nullish(),
    pendingOnly: z.boolean().nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    status: d.status ?? undefined,
    priority: d.priority ?? undefined,
    dueBefore: d.dueBefore ?? undefined,
    dueAfter: d.dueAfter ?? undefined,
    tagId: d.tagId ?? undefined,
    folderId: d.folderId ?? undefined,
    withoutFolder: d.withoutFolder ?? undefined,
    selectedToday: d.selectedToday ?? undefined,
    pendingOnly: d.pendingOnly ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 20,
  }));

export const todoAddInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: todoDescriptionSchema,
  status: todoStatus.optional(),
  priority: todoPriority.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  selectedToday: z.boolean().optional(),
  tagIds: tagIdsArraySchema,
  folderId: optionalFolderIdSchema,
  orderIndex: z.number().int().min(0).optional(),
});

export const todoReorderInputSchema = z.object({
  folderId: z.union([folderIdString, z.null()]),
  todoIds: z.array(todoIdString).min(1).max(500),
});

export const todoEditInputSchema = z
  .object({
    id: todoIdString,
    title: z.string().min(1).max(255).optional(),
    description: todoDescriptionSchema,
    status: todoStatus.optional(),
    priority: todoPriority.optional(),
    dueDate: z.coerce.date().nullable().optional(),
    selectedToday: z.boolean().optional(),
    tagIds: tagIdsArraySchema,
    folderId: optionalFolderIdSchema,
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.status !== undefined ||
      d.priority !== undefined ||
      d.dueDate !== undefined ||
      d.selectedToday !== undefined ||
      d.tagIds !== undefined ||
      d.folderId !== undefined ||
      d.orderIndex !== undefined,
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
