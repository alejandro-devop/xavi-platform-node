export type ExerciseBodyRegion = 'upper' | 'lower';

export const EXERCISE_BODY_REGIONS: readonly ExerciseBodyRegion[] = ['upper', 'lower'] as const;

export interface Exercise {
  id: string;
  userId: number;
  name: string;
  bodyRegion: ExerciseBodyRegion;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutSession {
  id: string;
  userId: number;
  followUpId: string;
  activityId: string;
  createdAt: Date;
  updatedAt: Date;
  sessionExercises?: WorkoutSessionExercise[];
}

export interface WorkoutSessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  createdAt: Date;
  sets?: WorkoutSet[];
  exercise?: Exercise;
}

export interface WorkoutSet {
  id: string;
  sessionExerciseId: string;
  /** 1-based index within the session exercise. */
  setIndex: number;
  weightKg: number;
  reps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExerciseInput {
  name: string;
  bodyRegion: ExerciseBodyRegion;
}

export interface UpdateExerciseInput {
  name?: string;
  bodyRegion?: ExerciseBodyRegion;
}

export interface StartWorkoutSessionInput {
  followUpId: string;
  exerciseIds: string[];
}

export interface UpsertWorkoutSetInput {
  /** When set, updates that set (must belong to user). */
  id?: string;
  sessionExerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
}

/** PR rule (Fase 5): max weightKg among sets with reps ≥ 1; ties → more reps, then most recent. */
export interface ExercisePersonalRecord {
  weightKg: number;
  reps: number;
  setId: string;
  achievedAt: Date;
}

export interface ExerciseHistorySet {
  id: string;
  setIndex: number;
  weightKg: number;
  reps: number;
  createdAt: Date;
  sessionId: string;
  sessionCreatedAt: Date;
}

export interface ExerciseHistory {
  exercise: Exercise;
  personalRecord: ExercisePersonalRecord | null;
  recentSets: ExerciseHistorySet[];
}

/** Ventanas de reporte (Fase 6). */
export type WorkoutReportWindowDays = 7 | 30 | 90;

export const WORKOUT_REPORT_WINDOW_DAYS: readonly WorkoutReportWindowDays[] = [
  7, 30, 90,
] as const;

export interface WorkoutExerciseFrequency {
  exercise: Exercise;
  /** Sesiones distintas en las que apareció el ejercicio. */
  sessionCount: number;
  setCount: number;
  /** Σ(weightKg × reps) en la ventana. */
  volumeKg: number;
}

export interface WorkoutVolumeBucket {
  /** Inicio del bucket (día o semana, UTC). */
  periodStart: Date;
  sessionCount: number;
  setCount: number;
  volumeKg: number;
}

export interface WorkoutReports {
  windowDays: WorkoutReportWindowDays;
  sessionCount: number;
  totalSets: number;
  totalVolumeKg: number;
  /** sessionCount / (windowDays / 7). */
  sessionsPerWeek: number;
  topExercises: WorkoutExerciseFrequency[];
  bottomExercises: WorkoutExerciseFrequency[];
  volumeByPeriod: WorkoutVolumeBucket[];
}

/** Progreso de juego (Fase 8). */
export interface WorkoutGameProgress {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
}

export interface WorkoutSessionXpAward {
  sessionId: string;
  xpAwarded: number;
  validSetCount: number;
  volumeKg: number;
  awardedAt: Date;
}
