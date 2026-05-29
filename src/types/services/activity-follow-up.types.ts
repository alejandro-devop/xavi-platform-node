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
}

export interface StartActivityFollowUpInput {
  activityId: string;
  date: string;
  startTime: string;
  notes?: string | null;
  linkedTodoId?: string | null;
}

export interface CreateActivityFollowUpInput {
  activityId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string | null;
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
