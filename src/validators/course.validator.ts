import { z } from 'zod';

// ============ COURSES ============

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    instructor: z.string().max(255).optional(),
    durationHours: z.number().int().positive().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const getCoursesSchema = z.object({
  query: z.object({
    status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getCourseSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

export const updateCourseSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    instructor: z.string().max(255).optional(),
    durationHours: z.number().int().positive().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  }),
});

export const deleteCourseSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// ============ MODULES ============

export const createModuleSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    orderIndex: z.number().int().min(0),
  }),
});

export const updateModuleSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^\d+$/),
    moduleId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    orderIndex: z.number().int().min(0).optional(),
  }),
});

export const deleteModuleSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^\d+$/),
    moduleId: z.string().regex(/^\d+$/),
  }),
});

// ============ LESSONS ============

export const createLessonSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^\d+$/),
    moduleId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    title: z.string().min(1).max(255),
    contentType: z.enum(['video', 'text', 'quiz', 'exercise', 'assignment']).optional(),
    contentUrl: z.string().url().optional(),
    durationMinutes: z.number().int().positive().optional(),
    orderIndex: z.number().int().min(0),
  }),
});

export const updateLessonSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^\d+$/),
    moduleId: z.string().regex(/^\d+$/),
    lessonId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    contentType: z.enum(['video', 'text', 'quiz', 'exercise', 'assignment']).optional(),
    contentUrl: z.string().url().optional(),
    durationMinutes: z.number().int().positive().optional(),
    orderIndex: z.number().int().min(0).optional(),
  }),
});

export const deleteLessonSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^\d+$/),
    moduleId: z.string().regex(/^\d+$/),
    lessonId: z.string().regex(/^\d+$/),
  }),
});

// ============ PROGRESS ============

export const markLessonCompleteSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^\d+$/),
    lessonId: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    completed: z.boolean(),
    notes: z.string().optional(),
  }),
});

export const getCourseProgressSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^\d+$/),
  }),
});
