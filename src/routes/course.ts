import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  markLessonComplete,
  getCourseProgress,
} from '../controllers/course.controller';
import {
  createCourseSchema,
  getCoursesSchema,
  getCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  deleteModuleSchema,
  createLessonSchema,
  updateLessonSchema,
  deleteLessonSchema,
  markLessonCompleteSchema,
  getCourseProgressSchema,
} from '../validators/course.validator';

const router = Router();

// All course routes require authentication
router.use(authMiddleware);

// Course routes
router.post('/', validate(createCourseSchema), asyncHandler(createCourse));
router.get('/', validate(getCoursesSchema), asyncHandler(getCourses));
router.get('/:id', validate(getCourseSchema), asyncHandler(getCourseById));
router.put('/:id', validate(updateCourseSchema), asyncHandler(updateCourse));
router.delete('/:id', validate(deleteCourseSchema), asyncHandler(deleteCourse));

// Module routes
router.post('/:courseId/modules', validate(createModuleSchema), asyncHandler(createModule));
router.put(
  '/:courseId/modules/:moduleId',
  validate(updateModuleSchema),
  asyncHandler(updateModule)
);
router.delete(
  '/:courseId/modules/:moduleId',
  validate(deleteModuleSchema),
  asyncHandler(deleteModule)
);

// Lesson routes
router.post(
  '/:courseId/modules/:moduleId/lessons',
  validate(createLessonSchema),
  asyncHandler(createLesson)
);
router.put(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  validate(updateLessonSchema),
  asyncHandler(updateLesson)
);
router.delete(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  validate(deleteLessonSchema),
  asyncHandler(deleteLesson)
);

// Progress routes
router.post(
  '/:courseId/lessons/:lessonId/progress',
  validate(markLessonCompleteSchema),
  asyncHandler(markLessonComplete)
);
router.get(
  '/:courseId/progress',
  validate(getCourseProgressSchema),
  asyncHandler(getCourseProgress)
);

export default router;
