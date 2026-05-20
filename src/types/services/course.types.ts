export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type CourseStatus = 'not_started' | 'in_progress' | 'completed';

export type LessonContentType = 'video' | 'text' | 'quiz' | 'exercise' | 'assignment';

export interface CourseProgressSummary {
  totalModules: number;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  startedDate?: Date | null;
  lastActivity?: Date | null;
}

export interface CourseProgressDetail extends CourseProgressSummary {
  courseId: string;
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  contentType: LessonContentType | null;
  contentUrl: string | null;
  durationMinutes: number | null;
  orderIndex: number;
  completed: boolean;
  completionDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: CourseLesson[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  userId: number;
  title: string;
  description: string | null;
  instructor: string | null;
  durationHours: number | null;
  difficulty: CourseDifficulty | null;
  tags: string[] | null;
  status: CourseStatus;
  totalModules?: number;
  totalLessons?: number;
  completedLessons?: number;
  progress?: number;
  modules?: CourseModule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseCollection {
  courses: Course[];
  page: number;
  limit: number;
  total: number;
}

export interface UserCourseLessonProgress {
  id: string;
  userId: number;
  lessonId: string;
  completed: boolean;
  completionDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseLessonProgressResult {
  progress: UserCourseLessonProgress;
  courseStatus: CourseStatus;
}

export interface CreateCourseInput {
  title: string;
  description?: string | null;
  instructor?: string | null;
  durationHours?: number | null;
  difficulty?: CourseDifficulty | null;
  tags?: string[] | null;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string | null;
  instructor?: string | null;
  durationHours?: number | null;
  difficulty?: CourseDifficulty | null;
  tags?: string[] | null;
  status?: CourseStatus;
}

export interface ListCoursesOptions {
  status?: CourseStatus;
  difficulty?: CourseDifficulty;
  page?: number;
  limit?: number;
}

export interface CreateCourseModuleInput {
  courseId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
}

export interface UpdateCourseModuleInput {
  title?: string;
  description?: string | null;
  orderIndex?: number;
}

export interface CreateCourseLessonInput {
  courseId: string;
  moduleId: string;
  title: string;
  contentType?: LessonContentType | null;
  contentUrl?: string | null;
  durationMinutes?: number | null;
  orderIndex: number;
}

export interface UpdateCourseLessonInput {
  title?: string;
  contentType?: LessonContentType | null;
  contentUrl?: string | null;
  durationMinutes?: number | null;
  orderIndex?: number;
}

export interface UpdateCourseLessonProgressInput {
  courseId: string;
  lessonId: string;
  completed: boolean;
  notes?: string | null;
}
