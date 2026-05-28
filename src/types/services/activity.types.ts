export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';

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
  createdAt: Date;
  updatedAt: Date;
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
}

export interface UpdateActivityInput {
  title?: string;
  description?: string | null;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  categoryId?: string | null;
  scheduledDate?: Date | string | null;
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
