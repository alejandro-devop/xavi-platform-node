import { z } from 'zod';

// ============ LEARNING RESOURCES ============

export const createLearningResourceSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    resourceType: z.enum(['article', 'video', 'book', 'course', 'podcast', 'tutorial', 'other']),
    url: z.string().url().optional(),
    category: z.string().max(100).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    estimatedDurationMinutes: z.number().int().positive().optional(),
  }),
});

export const getLearningResourcesSchema = z.object({
  query: z.object({
    resourceType: z
      .enum(['article', 'video', 'book', 'course', 'podcast', 'tutorial', 'other'])
      .optional(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'archived']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    category: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getLearningResourceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const updateLearningResourceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    resourceType: z
      .enum(['article', 'video', 'book', 'course', 'podcast', 'tutorial', 'other'])
      .optional(),
    url: z.string().url().optional(),
    category: z.string().max(100).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'archived']).optional(),
    estimatedDurationMinutes: z.number().int().positive().optional(),
  }),
});

export const deleteLearningResourceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// ============ LEARNING PROGRESS ============

export const logProgressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // resource id
  }),
  body: z.object({
    durationMinutes: z.number().int().positive(),
    notes: z.string().optional(),
    progressPercentage: z.number().int().min(0).max(100).optional(),
    sessionDate: z.string().datetime().optional(),
  }),
});

export const getProgressSessionsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // resource id
  }),
});

export const updateProgressSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // resource id
    sessionId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().optional(),
    progressPercentage: z.number().int().min(0).max(100).optional(),
    sessionDate: z.string().datetime().optional(),
  }),
});

export const deleteProgressSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/), // resource id
    sessionId: z.string().regex(/^\d+$/),
  }),
});
