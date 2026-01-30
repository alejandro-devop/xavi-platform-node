import { z } from 'zod';

export const createTodoSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export const updateTodoSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
    description: z.string().optional().nullable(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: z.string().datetime().optional().nullable(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const getTodoSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const deleteTodoSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const completeTodoSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const getTodosSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueBefore: z.string().datetime().optional(),
    dueAfter: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const createSubtaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    orderIndex: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

export const updateSubtaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
    isCompleted: z.boolean().optional(),
    orderIndex: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
    subtaskId: z.string().regex(/^\d+$/, 'Invalid subtask ID'),
  }),
});

export const deleteSubtaskSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
    subtaskId: z.string().regex(/^\d+$/, 'Invalid subtask ID'),
  }),
});
