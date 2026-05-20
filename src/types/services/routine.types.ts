export type RoutineTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface RoutineStep {
  id: string;
  routineId: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Routine {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  daysOfWeek: DayOfWeek[];
  timeOfDay: RoutineTimeOfDay;
  isActive: boolean;
  stepsCount?: number;
  totalDuration?: number;
  createdAt: Date;
  updatedAt: Date;
  steps?: RoutineStep[];
}

export interface RoutineCollection {
  routines: Routine[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateRoutineInput {
  name: string;
  description?: string | null;
  daysOfWeek?: DayOfWeek[];
  timeOfDay?: RoutineTimeOfDay;
}

export interface UpdateRoutineInput {
  name?: string;
  description?: string | null;
  daysOfWeek?: DayOfWeek[];
  timeOfDay?: RoutineTimeOfDay;
  isActive?: boolean;
}

export interface ListRoutinesOptions {
  isActive?: boolean;
  timeOfDay?: RoutineTimeOfDay;
  dayOfWeek?: DayOfWeek;
  page?: number;
  limit?: number;
}

export interface CreateRoutineStepInput {
  routineId: string;
  title: string;
  description?: string | null;
  durationMinutes?: number | null;
  orderIndex?: number;
}

export interface UpdateRoutineStepInput {
  title?: string;
  description?: string | null;
  durationMinutes?: number | null;
  orderIndex?: number;
}
