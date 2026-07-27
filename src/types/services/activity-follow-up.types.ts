import type { ActivitySubtasksCount } from './activity.types';

export interface ActivityFollowUpSubtask {
  id: string;
  followUpId: string;
  activitySubtaskId: string | null;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityFollowUp {
  id: string;
  activityId: string;
  userId: number;
  date: string;
  startTime: string;
  durationMinutes: number | null;
  isOpen: boolean;
  endTime: string | null;
  endDate: string | null;
  endDateTime: string | null;
  notes: string | null;
  linkedTodoId: string | null;
  createdAt: Date;
  updatedAt: Date;
  sessionSubtasks?: ActivityFollowUpSubtask[];
  sessionSubtasksCount?: ActivitySubtasksCount;
}

export interface StartActivityFollowUpInput {
  activityId: string;
  date: string;
  startTime: string;
  notes?: string | null;
  linkedTodoId?: string | null;
  clientId?: string | null;
  /** IDs de `activity_subtasks` a incluir en esta ejecución. */
  subtaskIds?: string[];
}

export interface UpdateActivityFollowUpSubtaskInput {
  isCompleted: boolean;
}

export interface AddActivityFollowUpSubtaskInput {
  followUpId: string;
  title: string;
}

export interface CreateActivityFollowUpInput {
  activityId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string | null;
  clientId?: string | null;
}

export interface UpdateActivityFollowUpInput {
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  notes?: string | null;
}

export interface ListActivityFollowUpsOptions {
  activityId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface ActivityFollowUpsDateGroup {
  date: string;
  followUps: ActivityFollowUp[];
}
