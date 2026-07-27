# Entrenamiento / Workout — GraphQL para Bruno / clientes

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

- IDs de Activity / follow-up: enteros como string (`"7"`).
- IDs de Exercise / WorkoutSession / WorkoutSet: UUID v7.

Migración: `060_workout_entrenamiento.sql`. Módulo: `src/graphql/modules/workout/`.

---

## Flujo

1. CRUD catálogo `exercises` (`bodyRegion`: `upper` | `lower`).
2. `activityAdd` / `activityEdit` con `isWorkout` + `workoutExerciseIds` (plantilla).
3. `activityFollowUpStart` (como siempre) → `workoutSessionStart(followUpId, exerciseIds)`.
4. Durante follow-up abierto: `workoutSetUpsert` / `workoutSetDelete` (peso kg + reps; `setIndex` 1-based).
5. Al cerrar el follow-up (`activityFollowUpEdit` con duración): si hay ≥1 set válido → XP (idempotente).

---

## Queries

### `workoutGameProgress`

```graphql
query WorkoutGameProgress {
  workoutGameProgress {
    totalXp
    level
    xpIntoLevel
    xpForNextLevel
    currentStreak
    longestStreak
    lastWorkoutDate
  }
}
```

XP por sesión: `50 + min(50, sets×5) + min(100, floor(volumeKg/100)×5)`. Migración: `061_workout_game.sql`.

### `exercises` / `exercise`

```graphql
query Exercises {
  exercises {
    id
    name
    bodyRegion
  }
}

query Exercise($id: ID!) {
  exercise(id: $id) {
    id
    name
    bodyRegion
  }
}
```

### `workoutSession`

Pasar exactamente uno de `id` o `followUpId`.

```graphql
query WorkoutSessionByFollowUp($followUpId: ID!) {
  workoutSession(followUpId: $followUpId) {
    id
    followUpId
    activityId
    sessionExercises {
      id
      orderIndex
      exercise { id name bodyRegion }
      sets { id setIndex weightKg reps }
    }
  }
}
```

### `exerciseHistory`

PR = máximo `weightKg` con `reps ≥ 1` (empate → más reps, luego más reciente). `limit` default 30, max 100.

```graphql
query ExerciseHistory($exerciseId: ID!, $limit: Int) {
  exerciseHistory(exerciseId: $exerciseId, limit: $limit) {
    exercise { id name bodyRegion }
    personalRecord { weightKg reps setId achievedAt }
    recentSets {
      id
      setIndex
      weightKg
      reps
      createdAt
      sessionId
      sessionCreatedAt
    }
  }
}
```

### `workoutReports`

Ventanas: `windowDays` = `7` | `30` | `90`. Volumen = Σ(`weightKg` × `reps`). Top/bottom = hasta 5 ejercicios por frecuencia de sesión. Buckets: día (7) o semana ISO (30/90).

```graphql
query WorkoutReports($windowDays: Int!) {
  workoutReports(windowDays: $windowDays) {
    windowDays
    sessionCount
    totalSets
    totalVolumeKg
    sessionsPerWeek
    topExercises {
      exercise { id name bodyRegion }
      sessionCount
      setCount
      volumeKg
    }
    bottomExercises {
      exercise { id name bodyRegion }
      sessionCount
      setCount
      volumeKg
    }
    volumeByPeriod {
      periodStart
      sessionCount
      setCount
      volumeKg
    }
  }
}
```

### Activity / FollowUp (campos extendidos)

```graphql
query ActivityWorkout($id: ID!) {
  activity(id: $id) {
    id
    title
    isWorkout
    workoutExercises { id name bodyRegion }
  }
}

query OpenFollowUpWorkout {
  activityOpenFollowUp {
    id
    isOpen
    workoutSession {
      id
      sessionExercises {
        exercise { name }
        sets { setIndex weightKg reps }
      }
    }
  }
}
```

---

## Mutations

### Catálogo

```graphql
mutation ExerciseCreate($input: ExerciseCreateInput!) {
  exerciseCreate(input: $input) { id name bodyRegion }
}

mutation ExerciseUpdate($input: ExerciseUpdateInput!) {
  exerciseUpdate(input: $input) { id name bodyRegion }
}

mutation ExerciseDelete($input: ExerciseDeleteInput!) {
  exerciseDelete(input: $input)
}
```

### Activity workout

```graphql
mutation ActivityAddWorkout($input: ActivityInput!) {
  activityAdd(input: $input) {
    id
    isWorkout
    workoutExercises { id name }
  }
}
# input: { title: "Gym", isWorkout: true, workoutExerciseIds: ["…"] }
```

### Sesión + sets

```graphql
mutation WorkoutSessionStart($input: WorkoutSessionStartInput!) {
  workoutSessionStart(input: $input) {
    id
    followUpId
    sessionExercises { id exerciseId orderIndex }
  }
}

mutation WorkoutSetUpsert($input: WorkoutSetUpsertInput!) {
  workoutSetUpsert(input: $input) {
    id
    setIndex
    weightKg
    reps
  }
}

mutation WorkoutSetDelete($input: WorkoutSetDeleteInput!) {
  workoutSetDelete(input: $input)
}
```
