import { BadRequestError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { courseService } from '../../../src/services/course.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const COURSE_ID = 3;
const MODULE_ID = 10;
const LESSON_ID = 20;

function createCourseRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: COURSE_ID,
    user_id: USER_ID,
    title: 'Node.js Basics',
    description: null,
    instructor: 'Jane',
    duration_hours: 10,
    difficulty: 'beginner',
    tags: ['nodejs'],
    status: 'not_started',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('CourseService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('createCourse', () => {
    it('creates course with zero progress', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createCourseRow()] });

      const course = await courseService.createCourse(USER_ID, {
        title: 'Node.js Basics',
      });

      expect(course.id).toBe(String(COURSE_ID));
      expect(course.progress).toBe(0);
      expect(course.totalModules).toBe(0);
    });
  });

  describe('getCourseById', () => {
    it('returns course with modules and lessons', async () => {
      const now = new Date();
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createCourseRow()] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: MODULE_ID,
              course_id: COURSE_ID,
              title: 'Intro',
              description: null,
              order_index: 0,
              created_at: now,
              updated_at: now,
              lessons: [
                {
                  id: LESSON_ID,
                  title: 'Welcome',
                  contentType: 'video',
                  contentUrl: null,
                  durationMinutes: 15,
                  orderIndex: 0,
                  completed: true,
                  completionDate: now,
                  notes: null,
                },
              ],
            },
          ],
        });

      const course = await courseService.getCourseById(String(COURSE_ID), USER_ID);

      expect(course.modules).toHaveLength(1);
      expect(course.modules![0].lessons[0].completed).toBe(true);
      expect(course.progress).toBe(100);
    });

    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createCourseRow({ user_id: 2 })],
      });

      await expect(courseService.getCourseById(String(COURSE_ID), USER_ID)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('listCourses', () => {
    it('returns paginated courses with progress stats', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              ...createCourseRow(),
              total_modules: '1',
              total_lessons: '4',
              completed_lessons: '2',
            },
          ],
        });

      const collection = await courseService.listCourses(USER_ID);

      expect(collection.courses[0].progress).toBe(50);
      expect(collection.total).toBe(1);
    });
  });

  describe('updateLessonProgress', () => {
    it('marks lesson complete and updates course status', async () => {
      const now = new Date();
      mockDbPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: LESSON_ID,
              module_id: MODULE_ID,
              title: 'L1',
              content_type: 'video',
              content_url: null,
              duration_minutes: 10,
              order_index: 0,
              created_at: now,
              updated_at: now,
              course_id: COURSE_ID,
              user_id: USER_ID,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: USER_ID,
              lesson_id: LESSON_ID,
              completed: true,
              completion_date: now,
              notes: null,
              created_at: now,
              updated_at: now,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total_lessons: '1', completed_lessons: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await courseService.updateLessonProgress(USER_ID, {
        courseId: String(COURSE_ID),
        lessonId: String(LESSON_ID),
        completed: true,
      });

      expect(result.progress.completed).toBe(true);
      expect(result.courseStatus).toBe('completed');
    });
  });

  describe('createModule', () => {
    it('creates module for owned course', async () => {
      const now = new Date();
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createCourseRow()] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: MODULE_ID,
              course_id: COURSE_ID,
              title: 'Intro',
              description: null,
              order_index: 0,
              created_at: now,
              updated_at: now,
            },
          ],
        });

      const module = await courseService.createModule(USER_ID, {
        courseId: String(COURSE_ID),
        title: 'Intro',
        orderIndex: 0,
      });

      expect(module.title).toBe('Intro');
      expect(module.courseId).toBe(String(COURSE_ID));
    });
  });

  describe('updateCourse', () => {
    it('throws BadRequestError when no fields', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createCourseRow()] });

      await expect(
        courseService.updateCourse(String(COURSE_ID), USER_ID, {})
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('deleteCourse', () => {
    it('throws NotFoundError when missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(courseService.deleteCourse(String(COURSE_ID), USER_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
