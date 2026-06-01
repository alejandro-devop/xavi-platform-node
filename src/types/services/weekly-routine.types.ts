import type { DayOfWeek } from './routine.types';

export type { DayOfWeek };

export interface WeeklyRoutineActivity {
  id: string;
  routineId: string;
  activityId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  durationMinutes: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyRoutineDaySchedule {
  dayOfWeek: DayOfWeek;
  activities: WeeklyRoutineActivity[];
}

export interface WeeklyRoutine {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  startDay: DayOfWeek;
  isActive: boolean;
  dayStartTime: string;
  dayEndTime: string;
  createdAt: Date;
  updatedAt: Date;
  schedule?: WeeklyRoutineDaySchedule[];
  activitiesCount?: number;
}

export interface WeeklyRoutineCollection {
  routines: WeeklyRoutine[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateWeeklyRoutineInput {
  name: string;
  description?: string | null;
  startDay?: DayOfWeek;
  dayStartTime?: string;
  dayEndTime?: string;
}

export interface UpdateWeeklyRoutineInput {
  name?: string;
  description?: string | null;
  startDay?: DayOfWeek;
  dayStartTime?: string;
  dayEndTime?: string;
}

export interface CreateWeeklyRoutineActivityInput {
  routineId: string;
  activityId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  durationMinutes: number;
  notes?: string | null;
}

export interface UpdateWeeklyRoutineActivityInput {
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  durationMinutes?: number;
  notes?: string | null;
}

export interface BatchCreateWeeklyRoutineActivityInput {
  routineId: string;
  activityId: string;
  days: DayOfWeek[];
  startTime: string;
  durationMinutes: number;
  notes?: string | null;
}

export interface ListWeeklyRoutinesOptions {
  isActive?: boolean;
  page?: number;
  limit?: number;
}
