import type { HabitCategory } from './habit-category.types';
import type { HabitMeasure } from './habit-measure.types';

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

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
  isCounter: boolean;
  isTimer: boolean;
  isIncremental: boolean;
  isDecremental: boolean;
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
  habitType: 'boolean' | 'count' | 'time';
  periodDays: number;
  restartCount: number;
  weeklyLifelines: number;
  status: 'active' | 'completed' | 'archived';
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
}

export interface HabitFollowUpsDateGroup {
  date: string;
  followUps: HabitFollowUp[];
}

/** Activity linked to a habit — use GraphQL `Activity` type via `Habit.activity`. */

export interface CreateHabitInput {
  name: string;
  description?: string | null;
  frequency?: HabitFrequency;
  targetCount?: number;
  icon?: string | null;
  color?: string | null;
  categoryId?: string | null;
  measureId?: string | null;
  activityId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  shouldAvoid?: boolean;
  shouldKeep?: boolean;
  isCounter?: boolean;
  isTimer?: boolean;
  isIncremental?: boolean;
  isDecremental?: boolean;
  dailyGoal?: number;
  timerGoal?: number;
  timesGoal?: number;
  step?: number | null;
  orderIndex?: number;
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
  startDate?: string | null;
  endDate?: string | null;
  shouldAvoid?: boolean;
  shouldKeep?: boolean;
  isCounter?: boolean;
  isTimer?: boolean;
  isIncremental?: boolean;
  isDecremental?: boolean;
  dailyGoal?: number;
  timerGoal?: number;
  timesGoal?: number;
  step?: number | null;
  orderIndex?: number;
}

export interface ListHabitsOptions {
  isActive?: boolean;
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
