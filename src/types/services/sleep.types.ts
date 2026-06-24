export type SleepQuality = 'poor' | 'fair' | 'good' | 'excellent';

export type MoodOnWaking = 'tired' | 'groggy' | 'refreshed' | 'energized';

export interface SleepLog {
  id: string;
  userId: number;
  sleepDate: Date;
  bedtime: Date;
  wakeTime: Date;
  durationMinutes: number;
  durationHours: string;
  quality: SleepQuality | null;
  moodOnWaking: MoodOnWaking | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SleepLogCollection {
  sleepLogs: SleepLog[];
  page: number;
  limit: number;
  total: number;
}

export interface SleepQualityDistribution {
  poor: number;
  fair: number;
  good: number;
  excellent: number;
}

export interface SleepStatsPeriod {
  startDate: Date | null;
  endDate: Date | null;
}

export interface SleepStats {
  totalNights: number;
  avgDurationMinutes: number;
  avgDurationHours: string;
  minDurationMinutes: number;
  minDurationHours: string;
  maxDurationMinutes: number;
  maxDurationHours: string;
  qualityDistribution: SleepQualityDistribution;
  period: SleepStatsPeriod;
}

export interface CreateSleepLogInput {
  sleepDate: Date | string;
  bedtime: Date | string;
  wakeTime: Date | string;
  quality?: SleepQuality | null;
  moodOnWaking?: MoodOnWaking | null;
  notes?: string | null;
  bedtimeStartTime?: string;
  bedtimeRaw?: string;
}

export interface UpdateSleepLogInput {
  sleepDate?: Date | string;
  bedtime?: Date | string;
  wakeTime?: Date | string;
  quality?: SleepQuality | null;
  moodOnWaking?: MoodOnWaking | null;
  notes?: string | null;
  bedtimeStartTime?: string;
  bedtimeRaw?: string;
}

export interface ListSleepLogsOptions {
  startDate?: Date | string;
  endDate?: Date | string;
  quality?: SleepQuality;
  page?: number;
  limit?: number;
}

export interface SleepStatsOptions {
  startDate?: Date | string;
  endDate?: Date | string;
}
