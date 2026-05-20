import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  Course,
  CourseCollection,
  CourseLesson,
  CourseLessonProgressResult,
  CourseModule,
  CourseProgressDetail,
  CourseStatus,
  CreateCourseInput,
  CreateCourseLessonInput,
  CreateCourseModuleInput,
  ListCoursesOptions,
  UpdateCourseInput,
  UpdateCourseLessonInput,
  UpdateCourseLessonProgressInput,
  UpdateCourseModuleInput,
  UserCourseLessonProgress,
} from '../types/services/course.types';

type CourseRow = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  instructor: string | null;
  duration_hours: number | null;
  difficulty: string | null;
  tags: string[] | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type CourseListRow = CourseRow & {
  total_modules: string;
  total_lessons: string;
  completed_lessons: string;
};

type ModuleRow = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

type LessonRow = {
  id: number;
  module_id: number;
  title: string;
  content_type: string | null;
  content_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

type LessonJsonRow = {
  id: number;
  title: string;
  contentType: string | null;
  contentUrl: string | null;
  durationMinutes: number | null;
  orderIndex: number;
  completed: boolean;
  completionDate: Date | null;
  notes: string | null;
};

type ProgressRow = {
  id: number;
  user_id: number;
  lesson_id: number;
  completed: boolean;
  completion_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

const COURSE_RETURNING = `id, user_id, title, description, instructor, duration_hours, difficulty, tags, status, created_at, updated_at`;
const MODULE_RETURNING = `id, course_id, title, description, order_index, created_at, updated_at`;
const LESSON_RETURNING = `id, module_id, title, content_type, content_url, duration_minutes, order_index, created_at, updated_at`;
const PROGRESS_RETURNING = `id, user_id, lesson_id, completed, completion_date, notes, created_at, updated_at`;

function calcProgressPercent(totalLessons: number, completedLessons: number): number {
  return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
}

function mapCourse(
  row: CourseRow,
  extras?: Partial<Pick<Course, 'totalModules' | 'totalLessons' | 'completedLessons' | 'progress' | 'modules'>>
): Course {
  return {
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    description: row.description,
    instructor: row.instructor,
    durationHours: row.duration_hours,
    difficulty: row.difficulty as Course['difficulty'],
    tags: row.tags,
    status: row.status as Course['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras,
  };
}

function mapListCourse(row: CourseListRow): Course {
  const totalLessons = parseInt(row.total_lessons, 10) || 0;
  const completedLessons = parseInt(row.completed_lessons, 10) || 0;
  return mapCourse(row, {
    totalModules: parseInt(row.total_modules, 10) || 0,
    totalLessons,
    completedLessons,
    progress: calcProgressPercent(totalLessons, completedLessons),
  });
}

function mapLessonFromJson(raw: LessonJsonRow, moduleId: string): CourseLesson {
  return {
    id: String(raw.id),
    moduleId,
    title: raw.title,
    contentType: raw.contentType as CourseLesson['contentType'],
    contentUrl: raw.contentUrl,
    durationMinutes: raw.durationMinutes,
    orderIndex: raw.orderIndex,
    completed: raw.completed ?? false,
    completionDate: raw.completionDate,
    notes: raw.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapLessonRow(row: LessonRow, progress?: { completed: boolean; completionDate: Date | null; notes: string | null }): CourseLesson {
  return {
    id: String(row.id),
    moduleId: String(row.module_id),
    title: row.title,
    contentType: row.content_type as CourseLesson['contentType'],
    contentUrl: row.content_url,
    durationMinutes: row.duration_minutes,
    orderIndex: row.order_index,
    completed: progress?.completed ?? false,
    completionDate: progress?.completionDate ?? null,
    notes: progress?.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapModule(row: ModuleRow, lessons: CourseLesson[] = []): CourseModule {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    lessons,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProgress(row: ProgressRow): UserCourseLessonProgress {
  return {
    id: String(row.id),
    userId: row.user_id,
    lessonId: String(row.lesson_id),
    completed: row.completed,
    completionDate: row.completion_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseCourseId(id: string): number {
  const courseId = parseInt(id, 10);
  if (Number.isNaN(courseId)) throw new NotFoundError('Course not found');
  return courseId;
}

function parseModuleId(id: string): number {
  const moduleId = parseInt(id, 10);
  if (Number.isNaN(moduleId)) throw new NotFoundError('Module not found');
  return moduleId;
}

function parseLessonId(id: string): number {
  const lessonId = parseInt(id, 10);
  if (Number.isNaN(lessonId)) throw new NotFoundError('Lesson not found');
  return lessonId;
}

function assertCourseOwnership(course: { user_id: number }, userId: number): void {
  if (course.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this course');
  }
}

async function getCourseRowOrThrow(courseId: number): Promise<CourseRow> {
  const db = getDbPool();
  const result = await db.query<CourseRow>('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (result.rows.length === 0) throw new NotFoundError('Course not found');
  return result.rows[0];
}

async function getOwnedCourseOrThrow(courseId: number, userId: number): Promise<CourseRow> {
  const row = await getCourseRowOrThrow(courseId);
  assertCourseOwnership(row, userId);
  return row;
}

async function verifyModuleInCourse(moduleId: number, courseId: number): Promise<ModuleRow> {
  const db = getDbPool();
  const result = await db.query<ModuleRow>(
    'SELECT * FROM course_modules WHERE id = $1 AND course_id = $2',
    [moduleId, courseId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Module not found');
  return result.rows[0];
}

async function verifyLessonInCourse(lessonId: number, courseId: number): Promise<{ lesson: LessonRow; userId: number }> {
  const db = getDbPool();
  const result = await db.query<LessonRow & { course_id: number; user_id: number }>(
    `SELECT cl.*, cm.course_id, c.user_id
     FROM course_lessons cl
     JOIN course_modules cm ON cl.module_id = cm.id
     JOIN courses c ON cm.course_id = c.id
     WHERE cl.id = $1 AND c.id = $2`,
    [lessonId, courseId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Lesson not found in this course');
  const row = result.rows[0];
  return { lesson: row, userId: row.user_id };
}

async function loadModulesWithLessons(courseId: number, userId: number): Promise<CourseModule[]> {
  const db = getDbPool();
  const result = await db.query<ModuleRow & { lessons: LessonJsonRow[] | null }>(
    `SELECT cm.*,
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
      ) FILTER (WHERE cl.id IS NOT NULL) AS lessons
     FROM course_modules cm
     LEFT JOIN course_lessons cl ON cm.id = cl.module_id
     LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = $2
     WHERE cm.course_id = $1
     GROUP BY cm.id
     ORDER BY cm.order_index`,
    [courseId, userId]
  );

  return result.rows.map((m) => {
    const moduleId = String(m.id);
    const lessons = (m.lessons ?? []).map((l) => mapLessonFromJson(l, moduleId));
    return mapModule(m, lessons);
  });
}

function summarizeCourseFromModules(modules: CourseModule[]): Pick<Course, 'totalModules' | 'totalLessons' | 'completedLessons' | 'progress'> {
  let totalLessons = 0;
  let completedLessons = 0;
  for (const mod of modules) {
    totalLessons += mod.lessons.length;
    completedLessons += mod.lessons.filter((l) => l.completed).length;
  }
  return {
    totalModules: modules.length,
    totalLessons,
    completedLessons,
    progress: calcProgressPercent(totalLessons, completedLessons),
  };
}

async function syncCourseStatusFromProgress(courseId: number, userId: number): Promise<CourseStatus> {
  const db = getDbPool();
  const statsResult = await db.query<{ total_lessons: string; completed_lessons: string }>(
    `SELECT COUNT(DISTINCT cl.id)::text AS total_lessons,
      COUNT(DISTINCT CASE WHEN ucp.completed = true THEN ucp.id END)::text AS completed_lessons
     FROM courses c
     JOIN course_modules cm ON c.id = cm.course_id
     JOIN course_lessons cl ON cm.id = cl.module_id
     LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = $1
     WHERE c.id = $2`,
    [userId, courseId]
  );

  const totalLessons = parseInt(statsResult.rows[0].total_lessons, 10);
  const completedLessons = parseInt(statsResult.rows[0].completed_lessons, 10);

  let newStatus: CourseStatus = 'not_started';
  if (completedLessons > 0 && completedLessons < totalLessons) {
    newStatus = 'in_progress';
  } else if (completedLessons === totalLessons && totalLessons > 0) {
    newStatus = 'completed';
  }

  await db.query('UPDATE courses SET status = $1 WHERE id = $2', [newStatus, courseId]);
  return newStatus;
}

// ============ Courses ============

async function createCourse(userId: number, input: CreateCourseInput): Promise<Course> {
  const db = getDbPool();
  const result = await db.query<CourseRow>(
    `INSERT INTO courses (user_id, title, description, instructor, duration_hours, difficulty, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COURSE_RETURNING}`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.instructor ?? null,
      input.durationHours ?? null,
      input.difficulty ?? null,
      input.tags ?? null,
    ]
  );
  return mapCourse(result.rows[0], {
    totalModules: 0,
    totalLessons: 0,
    completedLessons: 0,
    progress: 0,
  });
}

async function listCourses(userId: number, options: ListCoursesOptions = {}): Promise<CourseCollection> {
  const db = getDbPool();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE c.user_id = $1';
  const params: (number | string)[] = [userId];
  let paramIndex = 2;

  if (options.status) {
    whereClause += ` AND c.status = $${paramIndex}`;
    params.push(options.status);
    paramIndex++;
  }
  if (options.difficulty) {
    whereClause += ` AND c.difficulty = $${paramIndex}`;
    params.push(options.difficulty);
    paramIndex++;
  }

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM courses c ${whereClause}`,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await db.query<CourseListRow>(
    `SELECT c.*,
      COUNT(DISTINCT cm.id)::text AS total_modules,
      COUNT(DISTINCT cl.id)::text AS total_lessons,
      COUNT(DISTINCT CASE WHEN ucp.completed = true THEN ucp.id END)::text AS completed_lessons
     FROM courses c
     LEFT JOIN course_modules cm ON c.id = cm.course_id
     LEFT JOIN course_lessons cl ON cm.id = cl.module_id
     LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = c.user_id
     ${whereClause}
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  return {
    courses: result.rows.map(mapListCourse),
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getCourseById(id: string, userId: number): Promise<Course> {
  const courseId = parseCourseId(id);
  const row = await getOwnedCourseOrThrow(courseId, userId);
  const modules = await loadModulesWithLessons(courseId, userId);
  return mapCourse(row, { ...summarizeCourseFromModules(modules), modules });
}

async function updateCourse(id: string, userId: number, input: UpdateCourseInput): Promise<Course> {
  const courseId = parseCourseId(id);
  await getOwnedCourseOrThrow(courseId, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(input.title);
    paramIndex++;
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(input.description);
    paramIndex++;
  }
  if (input.instructor !== undefined) {
    updates.push(`instructor = $${paramIndex}`);
    params.push(input.instructor);
    paramIndex++;
  }
  if (input.durationHours !== undefined) {
    updates.push(`duration_hours = $${paramIndex}`);
    params.push(input.durationHours);
    paramIndex++;
  }
  if (input.difficulty !== undefined) {
    updates.push(`difficulty = $${paramIndex}`);
    params.push(input.difficulty);
    paramIndex++;
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex}`);
    params.push(input.tags);
    paramIndex++;
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(input.status);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(courseId);
  const db = getDbPool();
  const result = await db.query<CourseRow>(
    `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${COURSE_RETURNING}`,
    params
  );
  const modules = await loadModulesWithLessons(courseId, userId);
  return mapCourse(result.rows[0], summarizeCourseFromModules(modules));
}

async function deleteCourse(id: string, userId: number): Promise<boolean> {
  const courseId = parseCourseId(id);
  await getOwnedCourseOrThrow(courseId, userId);
  await getDbPool().query('DELETE FROM courses WHERE id = $1', [courseId]);
  return true;
}

// ============ Modules ============

async function createModule(userId: number, input: CreateCourseModuleInput): Promise<CourseModule> {
  const courseId = parseCourseId(input.courseId);
  await getOwnedCourseOrThrow(courseId, userId);

  const db = getDbPool();
  const result = await db.query<ModuleRow>(
    `INSERT INTO course_modules (course_id, title, description, order_index)
     VALUES ($1, $2, $3, $4) RETURNING ${MODULE_RETURNING}`,
    [courseId, input.title, input.description ?? null, input.orderIndex]
  );
  return mapModule(result.rows[0], []);
}

async function updateModule(
  courseIdStr: string,
  moduleIdStr: string,
  userId: number,
  input: UpdateCourseModuleInput
): Promise<CourseModule> {
  const courseId = parseCourseId(courseIdStr);
  await getOwnedCourseOrThrow(courseId, userId);
  const moduleId = parseModuleId(moduleIdStr);
  await verifyModuleInCourse(moduleId, courseId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(input.title);
    paramIndex++;
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(input.description);
    paramIndex++;
  }
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(input.orderIndex);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(moduleId);
  const db = getDbPool();
  const result = await db.query<ModuleRow>(
    `UPDATE course_modules SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${MODULE_RETURNING}`,
    params
  );
  return mapModule(result.rows[0], []);
}

async function deleteModule(courseIdStr: string, moduleIdStr: string, userId: number): Promise<boolean> {
  const courseId = parseCourseId(courseIdStr);
  await getOwnedCourseOrThrow(courseId, userId);
  const moduleId = parseModuleId(moduleIdStr);
  await verifyModuleInCourse(moduleId, courseId);
  await getDbPool().query('DELETE FROM course_modules WHERE id = $1', [moduleId]);
  return true;
}

// ============ Lessons ============

async function createLesson(userId: number, input: CreateCourseLessonInput): Promise<CourseLesson> {
  const courseId = parseCourseId(input.courseId);
  await getOwnedCourseOrThrow(courseId, userId);
  const moduleId = parseModuleId(input.moduleId);
  await verifyModuleInCourse(moduleId, courseId);

  const db = getDbPool();
  const result = await db.query<LessonRow>(
    `INSERT INTO course_lessons (module_id, title, content_type, content_url, duration_minutes, order_index)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${LESSON_RETURNING}`,
    [
      moduleId,
      input.title,
      input.contentType ?? null,
      input.contentUrl ?? null,
      input.durationMinutes ?? null,
      input.orderIndex,
    ]
  );
  return mapLessonRow(result.rows[0]);
}

async function updateLesson(
  courseIdStr: string,
  moduleIdStr: string,
  lessonIdStr: string,
  userId: number,
  input: UpdateCourseLessonInput
): Promise<CourseLesson> {
  const courseId = parseCourseId(courseIdStr);
  await getOwnedCourseOrThrow(courseId, userId);
  const moduleId = parseModuleId(moduleIdStr);
  await verifyModuleInCourse(moduleId, courseId);
  const lessonId = parseLessonId(lessonIdStr);

  const db = getDbPool();
  const check = await db.query('SELECT id FROM course_lessons WHERE id = $1 AND module_id = $2', [
    lessonId,
    moduleId,
  ]);
  if (check.rows.length === 0) throw new NotFoundError('Lesson not found');

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(input.title);
    paramIndex++;
  }
  if (input.contentType !== undefined) {
    updates.push(`content_type = $${paramIndex}`);
    params.push(input.contentType);
    paramIndex++;
  }
  if (input.contentUrl !== undefined) {
    updates.push(`content_url = $${paramIndex}`);
    params.push(input.contentUrl);
    paramIndex++;
  }
  if (input.durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${paramIndex}`);
    params.push(input.durationMinutes);
    paramIndex++;
  }
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(input.orderIndex);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(lessonId);
  const result = await db.query<LessonRow>(
    `UPDATE course_lessons SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${LESSON_RETURNING}`,
    params
  );
  return mapLessonRow(result.rows[0]);
}

async function deleteLesson(
  courseIdStr: string,
  moduleIdStr: string,
  lessonIdStr: string,
  userId: number
): Promise<boolean> {
  const courseId = parseCourseId(courseIdStr);
  await getOwnedCourseOrThrow(courseId, userId);
  const moduleId = parseModuleId(moduleIdStr);
  await verifyModuleInCourse(moduleId, courseId);
  const lessonId = parseLessonId(lessonIdStr);

  const db = getDbPool();
  const result = await db.query(
    'DELETE FROM course_lessons WHERE id = $1 AND module_id = $2 RETURNING id',
    [lessonId, moduleId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Lesson not found');
  return true;
}

// ============ Progress ============

async function updateLessonProgress(
  userId: number,
  input: UpdateCourseLessonProgressInput
): Promise<CourseLessonProgressResult> {
  const courseId = parseCourseId(input.courseId);
  const lessonId = parseLessonId(input.lessonId);
  const { userId: ownerId } = await verifyLessonInCourse(lessonId, courseId);
  if (ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to update progress for this course');
  }

  const completionDate = input.completed ? new Date() : null;
  const db = getDbPool();
  const result = await db.query<ProgressRow>(
    `INSERT INTO user_course_progress (user_id, lesson_id, completed, completion_date, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, lesson_id)
     DO UPDATE SET completed = $3, completion_date = $4, notes = $5
     RETURNING ${PROGRESS_RETURNING}`,
    [userId, lessonId, input.completed, completionDate, input.notes ?? null]
  );

  const courseStatus = await syncCourseStatusFromProgress(courseId, userId);
  return { progress: mapProgress(result.rows[0]), courseStatus };
}

async function getCourseProgress(courseIdStr: string, userId: number): Promise<CourseProgressDetail> {
  const courseId = parseCourseId(courseIdStr);
  await getOwnedCourseOrThrow(courseId, userId);

  const db = getDbPool();
  const result = await db.query<{
    total_lessons: string;
    completed_lessons: string;
    total_modules: string;
    started_date: Date | null;
    last_activity: Date | null;
  }>(
    `SELECT COUNT(DISTINCT cl.id)::text AS total_lessons,
      COUNT(DISTINCT CASE WHEN ucp.completed = true THEN ucp.id END)::text AS completed_lessons,
      COUNT(DISTINCT cm.id)::text AS total_modules,
      MIN(ucp.completion_date) AS started_date,
      MAX(ucp.completion_date) AS last_activity
     FROM courses c
     JOIN course_modules cm ON c.id = cm.course_id
     JOIN course_lessons cl ON cm.id = cl.module_id
     LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND ucp.user_id = $1
     WHERE c.id = $2`,
    [userId, courseId]
  );

  const stats = result.rows[0];
  const totalLessons = parseInt(stats.total_lessons, 10) || 0;
  const completedLessons = parseInt(stats.completed_lessons, 10) || 0;

  return {
    courseId: String(courseId),
    totalModules: parseInt(stats.total_modules, 10) || 0,
    totalLessons,
    completedLessons,
    progress: calcProgressPercent(totalLessons, completedLessons),
    startedDate: stats.started_date,
    lastActivity: stats.last_activity,
  };
}

export const courseService = {
  createCourse,
  listCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  updateLessonProgress,
  getCourseProgress,
  loadModulesWithLessons,
};
