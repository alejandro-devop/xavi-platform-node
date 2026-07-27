export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ActivitySubtask {
  id: string;
  activityId: string;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivitySubtasksCount {
  total: number;
  completed: number;
}

export interface Activity {
  id: string;
  userId: number;
  title: string;
  description: string | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  categoryId: string | null;
  scheduledDate: Date | null;
  completedAt: Date | null;
  isWorkout: boolean;
  createdAt: Date;
  updatedAt: Date;
  subtasks?: ActivitySubtask[];
  subtasksCount?: ActivitySubtasksCount;
}

export interface ActivityCollection {
  activities: Activity[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateActivityInput {
  title: string;
  description?: string | null;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  categoryId?: string | null;
  scheduledDate?: Date | string | null;
  todoFolderIds?: string[];
  isWorkout?: boolean;
  workoutExerciseIds?: string[];
}

export interface UpdateActivityInput {
  title?: string;
  description?: string | null;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  categoryId?: string | null;
  scheduledDate?: Date | string | null;
  todoFolderIds?: string[];
  isWorkout?: boolean;
  workoutExerciseIds?: string[];
}

export interface CreateActivitySubtaskInput {
  activityId: string;
  title: string;
  orderIndex?: number;
}

export interface UpdateActivitySubtaskInput {
  title?: string;
  isCompleted?: boolean;
  orderIndex?: number;
}

export interface ListActivitiesOptions {
  status?: ActivityStatus;
  priority?: ActivityPriority;
  categoryId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}
