import type { HabitCategory } from './habit-category.types';
import type { HabitMeasure } from './habit-measure.types';

export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type HabitType = 'boolean' | 'count' | 'time';
export type HabitStatus = 'active' | 'completed' | 'archived';
export type HabitDayStatus = 'empty' | 'accomplished' | 'failed' | 'lifeline';

export interface Habit {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  targetCount: number;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
  shouldAvoid: boolean;
  shouldKeep: boolean;
  days: number;
  streak: number;
  maxStreak: number;
  dailyGoal: number;
  timerGoal: number;
  timesGoal: number;
  step: number | null;
  categoryId: string | null;
  measureId: string | null;
  activityId: number | null;
  purposeId: number | null;
  habitType: HabitType;
  periodDays: number;
  restartCount: number;
  weeklyLifelines: number;
  status: HabitStatus;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: HabitCategory | null;
  measure?: HabitMeasure | null;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: number;
  completedDate: string;
  count: number;
  time: number;
  notes: string | null;
  story: string | null;
  archived: boolean;
  isAccomplished: boolean;
  isFailed: boolean;
  difficulty: number | null;
  isLifeline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Alias for GraphQL HabitFollowUp */
export type HabitFollowUp = HabitLog;

export interface HabitStats {
  totalCompletions: number;
  totalCount: number;
  currentStreak: number;
  last30Days: number;
  streak: number;
  maxStreak: number;
}

export interface HabitCollection {
  habits: Habit[];
  page: number;
  limit: number;
  total: number;
}

export interface HabitMyDayEntry {
  habit: Habit;
  followUp: HabitFollowUp | null;
  lifelinesUsedThisWeek: number;
  lifelinesRemaining: number;
}

export interface HabitDayEntry {
  date: string;
  status: HabitDayStatus;
  followUp: HabitFollowUp | null;
}

export interface HabitWeekView {
  habit: Habit;
  days: HabitDayEntry[];
  lifelinesRemaining: number;
}

export interface HabitFollowUpsDateGroup {
  date: string;
  followUps: HabitFollowUp[];
}

/** Activity linked to a habit — use GraphQL `Activity` type via `Habit.activity`. */

export interface CreateHabitInput {
  /** UUID v7 opcional generado en cliente (solo tablas con PK UUID). */
  id?: string | null;
  name: string;
  description?: string | null;
  frequency?: HabitFrequency;
  targetCount?: number;
  icon?: string | null;
  color?: string | null;
  categoryId?: string | null;
  measureId?: string | null;
  activityId?: number | null;
  purposeId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  shouldAvoid?: boolean;
  shouldKeep?: boolean;
  habitType?: HabitType;
  weeklyLifelines?: number;
  dailyGoal?: number;
  timerGoal?: number;
  timesGoal?: number;
  step?: number | null;
  orderIndex?: number;
  hidden?: boolean;
}

export interface UpdateHabitInput {
  name?: string;
  description?: string | null;
  frequency?: HabitFrequency;
  targetCount?: number;
  icon?: string | null;
  color?: string | null;
  isActive?: boolean;
  categoryId?: string | null;
  measureId?: string | null;
  activityId?: number | null;
  purposeId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  shouldAvoid?: boolean;
  shouldKeep?: boolean;
  habitType?: HabitType;
  weeklyLifelines?: number;
  status?: HabitStatus;
  dailyGoal?: number;
  timerGoal?: number;
  timesGoal?: number;
  step?: number | null;
  orderIndex?: number;
  hidden?: boolean;
}

export interface ListHabitsOptions {
  isActive?: boolean;
  status?: HabitStatus;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface ListHabitLogsOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  isArchived?: boolean;
}

export interface AddHabitLogInput {
  completedDate?: string;
  count?: number;
  time?: number;
  notes?: string | null;
  story?: string | null;
  isAccomplished?: boolean;
  isFailed?: boolean;
  isLifeline?: boolean;
  difficulty?: number | null;
  /** UUID v7 del cliente para idempotencia offline. */
  clientId?: string | null;
}

export interface UpdateHabitFollowUpInput {
  count?: number;
  time?: number;
  notes?: string | null;
  story?: string | null;
  isAccomplished?: boolean;
  isFailed?: boolean;
  archived?: boolean;
  difficulty?: number | null;
}

export interface ListHabitFollowUpsOptions {
  habitId?: string;
  from?: string;
  to?: string;
  isArchived?: boolean;
  limit?: number;
}
