import { z } from 'zod';

const courseIdString = z.string().regex(/^\d+$/, 'Invalid course ID');
const moduleIdString = z.string().regex(/^\d+$/, 'Invalid module ID');
const lessonIdString = z.string().regex(/^\d+$/, 'Invalid lesson ID');

const courseDifficulty = z.enum(['beginner', 'intermediate', 'advanced']);
const courseStatus = z.enum(['not_started', 'in_progress', 'completed']);
const lessonContentType = z.enum(['video', 'text', 'quiz', 'exercise', 'assignment']);

export const courseIdArgSchema = z.object({
  id: courseIdString,
});

export const courseProgressArgsSchema = z.object({
  courseId: courseIdString,
});

export const coursesListArgsSchema = z
  .object({
    status: courseStatus.nullish(),
    difficulty: courseDifficulty.nullish(),
    page: z.number().int().positive().nullish(),
    limit: z.number().int().positive().max(100).nullish(),
  })
  .transform((d) => ({
    status: d.status ?? undefined,
    difficulty: d.difficulty ?? undefined,
    page: d.page ?? 1,
    limit: d.limit ?? 20,
  }));

export const courseAddInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  instructor: z.string().max(255).nullable().optional(),
  durationHours: z.number().int().positive().nullable().optional(),
  difficulty: courseDifficulty.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export const courseEditInputSchema = z
  .object({
    id: courseIdString,
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    instructor: z.string().max(255).nullable().optional(),
    durationHours: z.number().int().positive().nullable().optional(),
    difficulty: courseDifficulty.nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    status: courseStatus.optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.instructor !== undefined ||
      d.durationHours !== undefined ||
      d.difficulty !== undefined ||
      d.tags !== undefined ||
      d.status !== undefined,
    { message: 'At least one field is required to update' }
  );

export const courseModuleAddInputSchema = z.object({
  courseId: courseIdString,
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  orderIndex: z.number().int().min(0),
});

export const courseModuleEditInputSchema = z
  .object({
    courseId: courseIdString,
    moduleId: moduleIdString,
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) => d.title !== undefined || d.description !== undefined || d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );

export const courseModuleRemoveInputSchema = z.object({
  courseId: courseIdString,
  moduleId: moduleIdString,
});

export const courseLessonAddInputSchema = z.object({
  courseId: courseIdString,
  moduleId: moduleIdString,
  title: z.string().min(1).max(255),
  contentType: lessonContentType.nullable().optional(),
  contentUrl: z.string().url().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  orderIndex: z.number().int().min(0),
});

export const courseLessonEditInputSchema = z
  .object({
    courseId: courseIdString,
    moduleId: moduleIdString,
    lessonId: lessonIdString,
    title: z.string().min(1).max(255).optional(),
    contentType: lessonContentType.nullable().optional(),
    contentUrl: z.string().url().nullable().optional(),
    durationMinutes: z.number().int().positive().nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.contentType !== undefined ||
      d.contentUrl !== undefined ||
      d.durationMinutes !== undefined ||
      d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );

export const courseLessonRemoveInputSchema = z.object({
  courseId: courseIdString,
  moduleId: moduleIdString,
  lessonId: lessonIdString,
});

export const courseLessonProgressInputSchema = z.object({
  courseId: courseIdString,
  lessonId: lessonIdString,
  completed: z.boolean(),
  notes: z.string().nullable().optional(),
});
