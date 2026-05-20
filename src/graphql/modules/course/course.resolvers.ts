import { courseService } from '../../../services/course.service';
import type { Course } from '../../../types/services/course.types';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  courseAddInputSchema,
  courseEditInputSchema,
  courseIdArgSchema,
  courseLessonAddInputSchema,
  courseLessonEditInputSchema,
  courseLessonProgressInputSchema,
  courseLessonRemoveInputSchema,
  courseModuleAddInputSchema,
  courseModuleEditInputSchema,
  courseModuleRemoveInputSchema,
  courseProgressArgsSchema,
  coursesListArgsSchema,
} from '../../../validators/schemas/course.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

function courseProgressFields(parent: Course) {
  if (parent.modules) {
    let totalLessons = 0;
    let completedLessons = 0;
    for (const mod of parent.modules) {
      totalLessons += mod.lessons.length;
      completedLessons += mod.lessons.filter((l) => l.completed).length;
    }
    const totalModules = parent.modules.length;
    const progress =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return { totalModules, totalLessons, completedLessons, progress };
  }
  return {
    totalModules: parent.totalModules ?? 0,
    totalLessons: parent.totalLessons ?? 0,
    completedLessons: parent.completedLessons ?? 0,
    progress: parent.progress ?? 0,
  };
}

export const courseResolvers = {
  Course: {
    modules: async (
      parent: Course,
      _args: unknown,
      context: { user?: { id: string | number } | null }
    ) => {
      requireAuth(context, 'Course.modules');
      if (parent.modules) return parent.modules;
      return await courseService.loadModulesWithLessons(parseInt(parent.id, 10), uid(context));
    },

    totalModules: (parent: Course) => courseProgressFields(parent).totalModules,
    totalLessons: (parent: Course) => courseProgressFields(parent).totalLessons,
    completedLessons: (parent: Course) => courseProgressFields(parent).completedLessons,
    progress: (parent: Course) => courseProgressFields(parent).progress,
  },

  Query: {
    course: withValidatedResolver(
      courseIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'course');
        return await courseService.getCourseById(id, uid(context));
      },
      'course'
    ),

    courses: withValidatedResolver(
      coursesListArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'courses');
        return await courseService.listCourses(uid(context), args);
      },
      'courses'
    ),

    courseProgress: withValidatedResolver(
      courseProgressArgsSchema,
      async (_parent, { courseId }: { courseId: string }, context) => {
        requireAuth(context, 'courseProgress');
        return await courseService.getCourseProgress(courseId, uid(context));
      },
      'courseProgress'
    ),
  },

  Mutation: {
    courseAdd: withValidatedResolver(
      courseAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseAdd');
        return await courseService.createCourse(uid(context), input);
      },
      'courseAdd'
    ),

    courseEdit: withValidatedResolver(
      courseEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseEdit');
        const { id, ...fields } = input;
        return await courseService.updateCourse(id, uid(context), fields);
      },
      'courseEdit'
    ),

    courseRemove: withValidatedResolver(
      courseIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'courseRemove');
        return await courseService.deleteCourse(id, uid(context));
      },
      'courseRemove'
    ),

    courseModuleAdd: withValidatedResolver(
      courseModuleAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseModuleAdd');
        return await courseService.createModule(uid(context), input);
      },
      'courseModuleAdd'
    ),

    courseModuleEdit: withValidatedResolver(
      courseModuleEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseModuleEdit');
        const { courseId, moduleId, ...fields } = input;
        return await courseService.updateModule(courseId, moduleId, uid(context), fields);
      },
      'courseModuleEdit'
    ),

    courseModuleRemove: withValidatedResolver(
      courseModuleRemoveInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseModuleRemove');
        const { courseId, moduleId } = input;
        return await courseService.deleteModule(courseId, moduleId, uid(context));
      },
      'courseModuleRemove'
    ),

    courseLessonAdd: withValidatedResolver(
      courseLessonAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseLessonAdd');
        return await courseService.createLesson(uid(context), input);
      },
      'courseLessonAdd'
    ),

    courseLessonEdit: withValidatedResolver(
      courseLessonEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseLessonEdit');
        const { courseId, moduleId, lessonId, ...fields } = input;
        return await courseService.updateLesson(courseId, moduleId, lessonId, uid(context), fields);
      },
      'courseLessonEdit'
    ),

    courseLessonRemove: withValidatedResolver(
      courseLessonRemoveInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseLessonRemove');
        const { courseId, moduleId, lessonId } = input;
        return await courseService.deleteLesson(courseId, moduleId, lessonId, uid(context));
      },
      'courseLessonRemove'
    ),

    courseLessonProgress: withValidatedResolver(
      courseLessonProgressInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'courseLessonProgress');
        return await courseService.updateLessonProgress(uid(context), input);
      },
      'courseLessonProgress'
    ),
  },
};
