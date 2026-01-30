import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

// ============ COURSES ============

export async function createCourse(req: Request, res: Response): Promise<void> {
  const { title, description, instructor, durationHours, difficulty, tags } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO courses (user_id, title, description, instructor, duration_hours, difficulty, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, title, description, instructor, duration_hours, difficulty, tags, status, created_at, updated_at`,
    [userId, title, description || null, instructor || null, durationHours || null, difficulty || null, tags || null]
  );

  const course = result.rows[0];

  res.status(201).json(
    successResponse({
      course: {
        id: course.id,
        userId: course.user_id,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        durationHours: course.duration_hours,
        difficulty: course.difficulty,
        tags: course.tags,
        status: course.status,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      },
    })
  );
}

export async function getCourses(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { status, difficulty, page = '1', limit = '20' } = req.query;

  let query = `
    SELECT 
      c.*,
      COUNT(DISTINCT cm.id) as total_modules,
      COUNT(DISTINCT cl.id) as total_lessons,
      COUNT(DISTINCT CASE WHEN ucp.completed = true THEN ucp.id END) as completed_lessons
    FROM courses c
    LEFT JOIN course_modules cm ON c.id = cm.course_id
    LEFT JOIN course_lessons cl ON cm.id = cl.module_id
    LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = c.user_id
    WHERE c.user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (status) {
    query += ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (difficulty) {
    query += ` AND c.difficulty = $${paramIndex}`;
    params.push(difficulty);
    paramIndex++;
  }

  query += ' GROUP BY c.id ORDER BY c.created_at DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  const courses = result.rows.map((c) => {
    const totalLessons = parseInt(c.total_lessons) || 0;
    const completedLessons = parseInt(c.completed_lessons) || 0;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: c.id,
      userId: c.user_id,
      title: c.title,
      description: c.description,
      instructor: c.instructor,
      durationHours: c.duration_hours,
      difficulty: c.difficulty,
      tags: c.tags,
      status: c.status,
      totalModules: parseInt(c.total_modules) || 0,
      totalLessons,
      completedLessons,
      progress,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  });

  res.json(
    successResponse({
      courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: courses.length,
      },
    })
  );
}

export async function getCourseById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [id]);

  if (courseResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  const course = courseResult.rows[0];

  if (course.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this course');
  }

  // Get modules with lessons and progress
  const modulesResult = await db.query(
    `SELECT 
      cm.*,
      json_agg(
        json_build_object(
          'id', cl.id,
          'title', cl.title,
          'contentType', cl.content_type,
          'contentUrl', cl.content_url,
          'durationMinutes', cl.duration_minutes,
          'orderIndex', cl.order_index,
          'completed', COALESCE(ucp.completed, false),
          'completionDate', ucp.completion_date,
          'notes', ucp.notes
        ) ORDER BY cl.order_index
      ) FILTER (WHERE cl.id IS NOT NULL) as lessons
    FROM course_modules cm
    LEFT JOIN course_lessons cl ON cm.id = cl.module_id
    LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = $2
    WHERE cm.course_id = $1
    GROUP BY cm.id
    ORDER BY cm.order_index`,
    [id, userId]
  );

  const modules = modulesResult.rows.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    orderIndex: m.order_index,
    lessons: m.lessons || [],
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));

  // Calculate progress
  let totalLessons = 0;
  let completedLessons = 0;
  modules.forEach((m) => {
    totalLessons += m.lessons.length;
    completedLessons += m.lessons.filter((l: any) => l.completed).length;
  });
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  res.json(
    successResponse({
      course: {
        id: course.id,
        userId: course.user_id,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        durationHours: course.duration_hours,
        difficulty: course.difficulty,
        tags: course.tags,
        status: course.status,
        totalModules: modules.length,
        totalLessons,
        completedLessons,
        progress,
        modules,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      },
    })
  );
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM courses WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update this course');
  }

  const { title, description, instructor, durationHours, difficulty, tags, status } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(title);
    paramIndex++;
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(description);
    paramIndex++;
  }

  if (instructor !== undefined) {
    updates.push(`instructor = $${paramIndex}`);
    params.push(instructor);
    paramIndex++;
  }

  if (durationHours !== undefined) {
    updates.push(`duration_hours = $${paramIndex}`);
    params.push(durationHours);
    paramIndex++;
  }

  if (difficulty !== undefined) {
    updates.push(`difficulty = $${paramIndex}`);
    params.push(difficulty);
    paramIndex++;
  }

  if (tags !== undefined) {
    updates.push(`tags = $${paramIndex}`);
    params.push(tags);
    paramIndex++;
  }

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(id);

  const result = await db.query(
    `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const course = result.rows[0];

  res.json(
    successResponse({
      course: {
        id: course.id,
        userId: course.user_id,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        durationHours: course.duration_hours,
        difficulty: course.difficulty,
        tags: course.tags,
        status: course.status,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      },
    })
  );
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM courses WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this course');
  }

  await db.query('DELETE FROM courses WHERE id = $1', [id]);

  res.json(successResponse({ message: 'Course deleted successfully' }));
}

// ============ MODULES ============

export async function createModule(req: Request, res: Response): Promise<void> {
  const { courseId } = req.params;
  const { title, description, orderIndex } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify course ownership
  const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

  if (courseResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (courseResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to add modules to this course');
  }

  const result = await db.query(
    `INSERT INTO course_modules (course_id, title, description, order_index)
     VALUES ($1, $2, $3, $4)
     RETURNING id, course_id, title, description, order_index, created_at, updated_at`,
    [courseId, title, description || null, orderIndex]
  );

  const module = result.rows[0];

  res.status(201).json(
    successResponse({
      module: {
        id: module.id,
        courseId: module.course_id,
        title: module.title,
        description: module.description,
        orderIndex: module.order_index,
        createdAt: module.created_at,
        updatedAt: module.updated_at,
      },
    })
  );
}

export async function updateModule(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify course ownership
  const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

  if (courseResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (courseResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update this module');
  }

  const checkResult = await db.query('SELECT * FROM course_modules WHERE id = $1 AND course_id = $2', [moduleId, courseId]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Module not found');
  }

  const { title, description, orderIndex } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(title);
    paramIndex++;
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(description);
    paramIndex++;
  }

  if (orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(orderIndex);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(moduleId);

  const result = await db.query(
    `UPDATE course_modules SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const module = result.rows[0];

  res.json(
    successResponse({
      module: {
        id: module.id,
        courseId: module.course_id,
        title: module.title,
        description: module.description,
        orderIndex: module.order_index,
        createdAt: module.created_at,
        updatedAt: module.updated_at,
      },
    })
  );
}

export async function deleteModule(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify course ownership
  const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

  if (courseResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (courseResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this module');
  }

  const checkResult = await db.query('SELECT * FROM course_modules WHERE id = $1 AND course_id = $2', [moduleId, courseId]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Module not found');
  }

  await db.query('DELETE FROM course_modules WHERE id = $1', [moduleId]);

  res.json(successResponse({ message: 'Module deleted successfully' }));
}

// ============ LESSONS ============

export async function createLesson(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId } = req.params;
  const { title, contentType, contentUrl, durationMinutes, orderIndex } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify course ownership
  const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

  if (courseResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (courseResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to add lessons to this course');
  }

  // Verify module exists in course
  const moduleResult = await db.query('SELECT * FROM course_modules WHERE id = $1 AND course_id = $2', [moduleId, courseId]);

  if (moduleResult.rows.length === 0) {
    throw new NotFoundError('Module not found in this course');
  }

  const result = await db.query(
    `INSERT INTO course_lessons (module_id, title, content_type, content_url, duration_minutes, order_index)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, module_id, title, content_type, content_url, duration_minutes, order_index, created_at, updated_at`,
    [moduleId, title, contentType || null, contentUrl || null, durationMinutes || null, orderIndex]
  );

  const lesson = result.rows[0];

  res.status(201).json(
    successResponse({
      lesson: {
        id: lesson.id,
        moduleId: lesson.module_id,
        title: lesson.title,
        contentType: lesson.content_type,
        contentUrl: lesson.content_url,
        durationMinutes: lesson.duration_minutes,
        orderIndex: lesson.order_index,
        createdAt: lesson.created_at,
        updatedAt: lesson.updated_at,
      },
    })
  );
}

export async function updateLesson(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify course ownership
  const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

  if (courseResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (courseResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update this lesson');
  }

  const checkResult = await db.query(
    'SELECT * FROM course_lessons WHERE id = $1 AND module_id = $2',
    [lessonId, moduleId]
  );

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Lesson not found');
  }

  const { title, contentType, contentUrl, durationMinutes, orderIndex } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(title);
    paramIndex++;
  }

  if (contentType !== undefined) {
    updates.push(`content_type = $${paramIndex}`);
    params.push(contentType);
    paramIndex++;
  }

  if (contentUrl !== undefined) {
    updates.push(`content_url = $${paramIndex}`);
    params.push(contentUrl);
    paramIndex++;
  }

  if (durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${paramIndex}`);
    params.push(durationMinutes);
    paramIndex++;
  }

  if (orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(orderIndex);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(lessonId);

  const result = await db.query(
    `UPDATE course_lessons SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const lesson = result.rows[0];

  res.json(
    successResponse({
      lesson: {
        id: lesson.id,
        moduleId: lesson.module_id,
        title: lesson.title,
        contentType: lesson.content_type,
        contentUrl: lesson.content_url,
        durationMinutes: lesson.duration_minutes,
        orderIndex: lesson.order_index,
        createdAt: lesson.created_at,
        updatedAt: lesson.updated_at,
      },
    })
  );
}

export async function deleteLesson(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify course ownership
  const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

  if (courseResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (courseResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this lesson');
  }

  const checkResult = await db.query(
    'SELECT * FROM course_lessons WHERE id = $1 AND module_id = $2',
    [lessonId, moduleId]
  );

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Lesson not found');
  }

  await db.query('DELETE FROM course_lessons WHERE id = $1', [lessonId]);

  res.json(successResponse({ message: 'Lesson deleted successfully' }));
}

// ============ PROGRESS ============

export async function markLessonComplete(req: Request, res: Response): Promise<void> {
  const { courseId, lessonId } = req.params;
  const { completed, notes } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify course ownership and lesson exists
  const lessonResult = await db.query(
    `SELECT cl.*, cm.course_id, c.user_id
     FROM course_lessons cl
     JOIN course_modules cm ON cl.module_id = cm.id
     JOIN courses c ON cm.course_id = c.id
     WHERE cl.id = $1 AND c.id = $2`,
    [lessonId, courseId]
  );

  if (lessonResult.rows.length === 0) {
    throw new NotFoundError('Lesson not found in this course');
  }

  if (lessonResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update progress for this course');
  }

  const completionDate = completed ? new Date() : null;

  const result = await db.query(
    `INSERT INTO user_course_progress (user_id, lesson_id, completed, completion_date, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, lesson_id)
     DO UPDATE SET completed = $3, completion_date = $4, notes = $5
     RETURNING id, user_id, lesson_id, completed, completion_date, notes, created_at, updated_at`,
    [userId, lessonId, completed, completionDate, notes || null]
  );

  const progress = result.rows[0];

  // Auto-update course status based on overall progress
  const statsResult = await db.query(
    `SELECT 
      COUNT(DISTINCT cl.id) as total_lessons,
      COUNT(DISTINCT CASE WHEN ucp.completed = true THEN ucp.id END) as completed_lessons
    FROM courses c
    JOIN course_modules cm ON c.id = cm.course_id
    JOIN course_lessons cl ON cm.id = cl.module_id
    LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = $1
    WHERE c.id = $2`,
    [userId, courseId]
  );

  const stats = statsResult.rows[0];
  const totalLessons = parseInt(stats.total_lessons);
  const completedLessons = parseInt(stats.completed_lessons);

  let newStatus = 'not_started';
  if (completedLessons > 0 && completedLessons < totalLessons) {
    newStatus = 'in_progress';
  } else if (completedLessons === totalLessons && totalLessons > 0) {
    newStatus = 'completed';
  }

  await db.query('UPDATE courses SET status = $1 WHERE id = $2', [newStatus, courseId]);

  res.json(
    successResponse({
      progress: {
        id: progress.id,
        userId: progress.user_id,
        lessonId: progress.lesson_id,
        completed: progress.completed,
        completionDate: progress.completion_date,
        notes: progress.notes,
        createdAt: progress.created_at,
        updatedAt: progress.updated_at,
      },
      courseStatus: newStatus,
    })
  );
}

export async function getCourseProgress(req: Request, res: Response): Promise<void> {
  const { courseId } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify course ownership
  const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

  if (courseResult.rows.length === 0) {
    throw new NotFoundError('Course not found');
  }

  if (courseResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this course');
  }

  const result = await db.query(
    `SELECT 
      COUNT(DISTINCT cl.id) as total_lessons,
      COUNT(DISTINCT CASE WHEN ucp.completed = true THEN ucp.id END) as completed_lessons,
      COUNT(DISTINCT cm.id) as total_modules,
      MIN(ucp.completion_date) as started_date,
      MAX(ucp.completion_date) as last_activity
    FROM courses c
    JOIN course_modules cm ON c.id = cm.course_id
    JOIN course_lessons cl ON cm.id = cl.module_id
    LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = $1
    WHERE c.id = $2`,
    [userId, courseId]
  );

  const stats = result.rows[0];
  const totalLessons = parseInt(stats.total_lessons) || 0;
  const completedLessons = parseInt(stats.completed_lessons) || 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  res.json(
    successResponse({
      progress: {
        courseId: parseInt(courseId),
        totalModules: parseInt(stats.total_modules) || 0,
        totalLessons,
        completedLessons,
        progress,
        startedDate: stats.started_date,
        lastActivity: stats.last_activity,
      },
    })
  );
}
