import { gql } from 'graphql-tag';

export const workoutTypeDefs = gql`
  """
  Tren muscular del ejercicio (catálogo Entrenamiento).
  """
  enum ExerciseBodyRegion {
    upper
    lower
  }

  type Exercise {
    id: ID!
    userId: Int!
    name: String!
    bodyRegion: ExerciseBodyRegion!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WorkoutSession {
    id: ID!
    userId: Int!
    followUpId: ID!
    activityId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    sessionExercises: [WorkoutSessionExercise!]!
  }

  type WorkoutSessionExercise {
    id: ID!
    sessionId: ID!
    exerciseId: ID!
    orderIndex: Int!
    createdAt: DateTime!
    exercise: Exercise
    sets: [WorkoutSet!]!
  }

  type WorkoutSet {
    id: ID!
    sessionExerciseId: ID!
    """Índice 1-based de la serie dentro del ejercicio de la sesión."""
    setIndex: Int!
    weightKg: Float!
    reps: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  Personal record derivado: máximo weightKg con reps ≥ 1.
  En empate de peso gana más reps; luego el set más reciente.
  """
  type ExercisePersonalRecord {
    weightKg: Float!
    reps: Int!
    setId: ID!
    achievedAt: DateTime!
  }

  type ExerciseHistorySet {
    id: ID!
    setIndex: Int!
    weightKg: Float!
    reps: Int!
    createdAt: DateTime!
    sessionId: ID!
    sessionCreatedAt: DateTime!
  }

  type ExerciseHistory {
    exercise: Exercise!
    personalRecord: ExercisePersonalRecord
    recentSets: [ExerciseHistorySet!]!
  }

  """
  Frecuencia de un ejercicio en la ventana del reporte.
  """
  type WorkoutExerciseFrequency {
    exercise: Exercise!
    sessionCount: Int!
    setCount: Int!
    """Σ(weightKg × reps) en la ventana."""
    volumeKg: Float!
  }

  """
  Bucket de volumen/sesiones (día para 7d; semana ISO para 30/90d).
  """
  type WorkoutVolumeBucket {
    periodStart: DateTime!
    sessionCount: Int!
    setCount: Int!
    volumeKg: Float!
  }

  """
  Reportes agregados de Entrenamiento. windowDays: 7 | 30 | 90.
  """
  type WorkoutReports {
    windowDays: Int!
    sessionCount: Int!
    totalSets: Int!
    totalVolumeKg: Float!
    sessionsPerWeek: Float!
    topExercises: [WorkoutExerciseFrequency!]!
    bottomExercises: [WorkoutExerciseFrequency!]!
    volumeByPeriod: [WorkoutVolumeBucket!]!
  }

  """
  Progreso de juego (XP / nivel / racha). Award al cerrar follow-up con ≥1 set válido.
  """
  type WorkoutGameProgress {
    totalXp: Int!
    level: Int!
    xpIntoLevel: Int!
    """0 si el nivel es el máximo definido."""
    xpForNextLevel: Int!
    currentStreak: Int!
    longestStreak: Int!
    """YYYY-MM-DD del último día con award."""
    lastWorkoutDate: String
  }

  type WorkoutSessionXpAward {
    sessionId: ID!
    xpAwarded: Int!
    validSetCount: Int!
    volumeKg: Float!
    awardedAt: DateTime!
  }

  extend type Activity {
    isWorkout: Boolean!
    """Plantilla de ejercicios sugeridos al iniciar (no es el log de la sesión)."""
    workoutExercises: [Exercise!]!
  }

  extend type ActivityFollowUp {
    workoutSession: WorkoutSession
    """XP otorgado al cerrar esta sesión (null si no hay award)."""
    workoutXpAward: WorkoutSessionXpAward
  }

  extend type Query {
    exercises: [Exercise!]!
    exercise(id: ID!): Exercise
    """
    Sesión de workout. Pasar exactamente uno de id o followUpId.
    """
    workoutSession(id: ID, followUpId: ID): WorkoutSession
    """
    PR (max weightKg) + sets recientes del ejercicio. limit default 30, max 100.
    """
    exerciseHistory(exerciseId: ID!, limit: Int): ExerciseHistory!
    """
    Frecuencia, volumen y tendencia. windowDays debe ser 7, 30 o 90.
    """
    workoutReports(windowDays: Int!): WorkoutReports!
    """Progreso de juego del usuario (XP, nivel, racha)."""
    workoutGameProgress: WorkoutGameProgress!
  }

  extend type Mutation {
    exerciseCreate(input: ExerciseCreateInput!): Exercise!
    exerciseUpdate(input: ExerciseUpdateInput!): Exercise!
    exerciseDelete(input: ExerciseDeleteInput!): Boolean!
    """
    Tras activityFollowUpStart en una Activity isWorkout: fija los ejercicios de esta sesión.
    """
    workoutSessionStart(input: WorkoutSessionStartInput!): WorkoutSession!
    workoutSetUpsert(input: WorkoutSetUpsertInput!): WorkoutSet!
    workoutSetDelete(input: WorkoutSetDeleteInput!): Boolean!
  }

  input ExerciseCreateInput {
    name: String!
    bodyRegion: ExerciseBodyRegion!
  }

  input ExerciseUpdateInput {
    id: ID!
    name: String
    bodyRegion: ExerciseBodyRegion
  }

  input ExerciseDeleteInput {
    id: ID!
  }

  input WorkoutSessionStartInput {
    followUpId: ID!
    exerciseIds: [ID!]!
  }

  input WorkoutSetUpsertInput {
    """Si se omite, crea o actualiza por (sessionExerciseId, setIndex)."""
    id: ID
    sessionExerciseId: ID!
    setIndex: Int!
    weightKg: Float!
    reps: Int!
  }

  input WorkoutSetDeleteInput {
    id: ID!
  }
`;
