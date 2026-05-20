export type LearningResourceType =
  | 'article'
  | 'video'
  | 'book'
  | 'course'
  | 'podcast'
  | 'tutorial'
  | 'other';

export type LearningResourceStatus = 'not_started' | 'in_progress' | 'completed' | 'archived';

export type LearningPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface LearningProgressStats {
  totalSessions: number;
  totalTimeSpent: number;
  currentProgress: number;
}

export interface LearningProgressSession {
  id: string;
  resourceId: string;
  sessionDate: Date;
  durationMinutes: number;
  notes: string | null;
  progressPercentage: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningResource {
  id: string;
  userId: number;
  title: string;
  description: string | null;
  resourceType: LearningResourceType;
  url: string | null;
  category: string | null;
  priority: LearningPriority;
  status: LearningResourceStatus;
  estimatedDurationMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
  progressStats?: LearningProgressStats;
  progressSessions?: LearningProgressSession[];
}

export interface LearningResourceCollection {
  resources: LearningResource[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateLearningResourceInput {
  title: string;
  description?: string | null;
  resourceType: LearningResourceType;
  url?: string | null;
  category?: string | null;
  priority?: LearningPriority;
  estimatedDurationMinutes?: number | null;
}

export interface UpdateLearningResourceInput {
  title?: string;
  description?: string | null;
  resourceType?: LearningResourceType;
  url?: string | null;
  category?: string | null;
  priority?: LearningPriority;
  status?: LearningResourceStatus;
  estimatedDurationMinutes?: number | null;
}

export interface ListLearningResourcesOptions {
  resourceType?: LearningResourceType;
  status?: LearningResourceStatus;
  priority?: LearningPriority;
  category?: string;
  page?: number;
  limit?: number;
}

export interface CreateLearningProgressInput {
  resourceId: string;
  durationMinutes: number;
  notes?: string | null;
  progressPercentage?: number | null;
  sessionDate?: Date | string;
}

export interface UpdateLearningProgressInput {
  durationMinutes?: number;
  notes?: string | null;
  progressPercentage?: number | null;
  sessionDate?: Date | string;
}
