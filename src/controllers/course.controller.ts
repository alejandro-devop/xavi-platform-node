import { Request, Response } from 'express';
import { courseService } from '../services/course.service';
import { successResponse } from '../shared/utils/response';

export async function createCourse(req: Request, res: Response): Promise<void> {
  const { title, description, instructor, durationHours, difficulty, tags } = req.body;
  const course = await courseService.createCourse(req.user!.id, {
    title,
    description,
    instructor,
    durationHours,
    difficulty,
    tags,
  });
  res.status(201).json(successResponse({ course }));
}

export async function getCourses(req: Request, res: Response): Promise<void> {
  const { status, difficulty, page = '1', limit = '20' } = req.query;
  const collection = await courseService.listCourses(req.user!.id, {
    status: status as never,
    difficulty: difficulty as never,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });
  res.json(
    successResponse({
      courses: collection.courses,
      pagination: {
        page: collection.page,
        limit: collection.limit,
        total: collection.total,
      },
    })
  );
}

export async function getCourseById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const course = await courseService.getCourseById(id, req.user!.id);
  res.json(successResponse({ course }));
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, instructor, durationHours, difficulty, tags, status } = req.body;
  const course = await courseService.updateCourse(id, req.user!.id, {
    title,
    description,
    instructor,
    durationHours,
    difficulty,
    tags,
    status,
  });
  res.json(successResponse({ course }));
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await courseService.deleteCourse(id, req.user!.id);
  res.json(successResponse({ message: 'Course deleted successfully' }));
}

export async function createModule(req: Request, res: Response): Promise<void> {
  const { courseId } = req.params;
  const { title, description, orderIndex } = req.body;
  const module = await courseService.createModule(req.user!.id, {
    courseId,
    title,
    description,
    orderIndex,
  });
  res.status(201).json(successResponse({ module }));
}

export async function updateModule(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId } = req.params;
  const { title, description, orderIndex } = req.body;
  const module = await courseService.updateModule(courseId, moduleId, req.user!.id, {
    title,
    description,
    orderIndex,
  });
  res.json(successResponse({ module }));
}

export async function deleteModule(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId } = req.params;
  await courseService.deleteModule(courseId, moduleId, req.user!.id);
  res.json(successResponse({ message: 'Module deleted successfully' }));
}

export async function createLesson(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId } = req.params;
  const { title, contentType, contentUrl, durationMinutes, orderIndex } = req.body;
  const lesson = await courseService.createLesson(req.user!.id, {
    courseId,
    moduleId,
    title,
    contentType,
    contentUrl,
    durationMinutes,
    orderIndex,
  });
  res.status(201).json(successResponse({ lesson }));
}

export async function updateLesson(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.params;
  const { title, contentType, contentUrl, durationMinutes, orderIndex } = req.body;
  const lesson = await courseService.updateLesson(
    courseId,
    moduleId,
    lessonId,
    req.user!.id,
    { title, contentType, contentUrl, durationMinutes, orderIndex }
  );
  res.json(successResponse({ lesson }));
}

export async function deleteLesson(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.params;
  await courseService.deleteLesson(courseId, moduleId, lessonId, req.user!.id);
  res.json(successResponse({ message: 'Lesson deleted successfully' }));
}

export async function markLessonComplete(req: Request, res: Response): Promise<void> {
  const { courseId, lessonId } = req.params;
  const { completed, notes } = req.body;
  const result = await courseService.updateLessonProgress(req.user!.id, {
    courseId,
    lessonId,
    completed,
    notes,
  });
  res.json(
    successResponse({
      progress: result.progress,
      courseStatus: result.courseStatus,
    })
  );
}

export async function getCourseProgress(req: Request, res: Response): Promise<void> {
  const { courseId } = req.params;
  const progress = await courseService.getCourseProgress(courseId, req.user!.id);
  res.json(successResponse({ progress }));
}
