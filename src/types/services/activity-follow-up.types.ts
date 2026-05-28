export interface ActivityFollowUp {
  id: string;
  activityId: string;
  userId: number;
  date: string;
  startTime: string;
  durationMinutes: number;
  endTime: string;
  endDate: string;
  endDateTime: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
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
