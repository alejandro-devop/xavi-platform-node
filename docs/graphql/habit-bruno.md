# Habit Tracker — GraphQL para Bruno / clientes

**Colección lista para importar:** carpeta del repo [`bruno/xavi-habit-graphql/`](../../bruno/xavi-habit-graphql/) (OpenCollection YAML, Bruno 3.0+). Ver `README.md` en esa carpeta.

Endpoint HTTP: **`POST /graphql`**

Cabecera: **`Authorization: Bearer <access_token>`** (JWT del flujo de auth del producto).

**IDs:** hábitos y follow-ups usan enteros como string (`"10"`). Categorías y medidas usan **UUID v7**.

**Migración requerida:** aplicar [`migrations/024_habit_legacy_phase2.sql`](../../migrations/024_habit_legacy_phase2.sql) antes de usar las operaciones de Fase 2.

---

## Fragmentos reutilizables

```graphql
fragment HabitCategoryFields on HabitCategory {
  id
  orderIndex
  name
  description
  icon
  color
}

fragment HabitFields on Habit {
  id
  userId
  name
  description
  frequency
  targetCount
  icon
  color
  isActive
  orderIndex
  startDate
  endDate
  shouldAvoid
  shouldKeep
  isCounter
  isTimer
  isIncremental
  isDecremental
  days
  streak
  maxStreak
  dailyGoal
  timerGoal
  timesGoal
  categoryId
  measureId
  createdAt
  updatedAt
  category {
    ...HabitCategoryFields
  }
}

fragment HabitFollowUpFields on HabitFollowUp {
  id
  habitId
  date
  count
  time
  notes
  story
  archived
  isAccomplished
  isFailed
  createdAt
}

fragment HabitStatsFields on HabitStats {
  totalCompletions
  totalCount
  currentStreak
  last30Days
  streak
  maxStreak
}
```

---

## Queries — Fase 1 (siguen disponibles)

| Operación | Descripción |
|-----------|-------------|
| `habit` | Un hábito |
| `habits` | Listado paginado (`categoryId` opcional en Fase 2) |
| `habitLogs` | Logs de un hábito |
| `habitStats` | Estadísticas |

---

## Queries — Fase 2

### `HabitCategories`

```graphql
query HabitCategories {
  habitCategories {
    ...HabitCategoryFields
  }
}
```

### `HabitCategory`

```graphql
query HabitCategory($id: ID!) {
  habitCategory(id: $id) {
    ...HabitCategoryFields
  }
}
```

### `HabitMeasures`

```graphql
query HabitMeasures {
  habitMeasures {
    id
    name
    abbreviation
    type
  }
}
```

### `HabitFollowUps` — por hábito o rango global

```graphql
query HabitFollowUps($habitId: ID, $from: String, $to: String, $isArchived: Boolean) {
  habitFollowUps(habitId: $habitId, from: $from, to: $to, isArchived: $isArchived) {
    ...HabitFollowUpFields
    habit {
      id
      name
      streak
      maxStreak
    }
  }
}
```

### `HabitMyDay` — hábitos activos + follow-up del día

```graphql
query HabitMyDay($date: String!) {
  habitMyDay(date: $date) {
    habit {
      ...HabitFields
    }
    followUp {
      ...HabitFollowUpFields
    }
  }
}
```

**Variables**

```json
{ "date": "2026-05-19" }
```

### `Habit` con follow-ups y racha persistida

```graphql
query Habit($id: ID!) {
  habit(id: $id) {
    ...HabitFields
    followUps(limit: 30, isArchived: false) {
      ...HabitFollowUpFields
    }
    stats {
      ...HabitStatsFields
    }
  }
}
```

---

## Mutations — Fase 1

| Operación | Notas |
|-----------|--------|
| `habitAdd` / `habitEdit` / `habitRemove` | Ampliados en Fase 2 (ver inputs) |
| `habitLogAdd` | Si ya hay log ese día, **suma** `count`/`time` y recalcula racha |

---

## Mutations — Categorías

### `HabitCategoryAdd`

```graphql
mutation HabitCategoryAdd($input: HabitCategoryInput!) {
  habitCategoryAdd(input: $input) {
    ...HabitCategoryFields
  }
}
```

### `HabitCategoryEdit` / `HabitCategoryRemove`

```graphql
mutation HabitCategoryEdit($input: HabitCategoryEditInput!) {
  habitCategoryEdit(input: $input) {
    ...HabitCategoryFields
  }
}

mutation HabitCategoryRemove($id: ID!) {
  habitCategoryRemove(id: $id)
}
```

---

## Mutations — Medidas

### `HabitMeasureAdd` / `HabitMeasureEdit` / `HabitMeasureRemove`

Misma convención que categorías (`habitMeasureAdd`, `habitMeasureEdit`, `habitMeasureRemove`).

---

## Mutations — Follow-ups (con racha)

### `HabitFollowUpAdd`

Al marcar `isAccomplished: true` (o cumplir meta), incrementa `habit.streak` y `maxStreak`.  
Con `isFailed: true`, pone racha en 0 y extiende `endDate` / `restartCount`. El historial previo **no** se archiva (sigue visible en semana/día).

```graphql
mutation HabitFollowUpAdd($input: HabitFollowUpAddInput!) {
  habitFollowUpAdd(input: $input) {
    ...HabitFollowUpFields
    habit {
      id
      streak
      maxStreak
    }
  }
}
```

**Variables (ejemplo — hábito timer 30 min)**

```json
{
  "input": {
    "habitId": "10",
    "date": "2026-05-19",
    "time": 35,
    "isAccomplished": true
  }
}
```

### `HabitFollowUpEdit` / `HabitFollowUpRemove`

```graphql
mutation HabitFollowUpEdit($input: HabitFollowUpEditInput!) {
  habitFollowUpEdit(input: $input) {
    ...HabitFollowUpFields
    habit { streak maxStreak }
  }
}

mutation HabitFollowUpRemove($id: ID!) {
  habitFollowUpRemove(id: $id)
}
```

---

## Crear hábito con categoría y modo (Fase 2)

```graphql
mutation HabitAdd($input: HabitInput!) {
  habitAdd(input: $input) {
    ...HabitFields
  }
}
```

```json
{
  "input": {
    "name": "Read daily",
    "categoryId": "CATEGORY-UUID",
    "shouldKeep": true,
    "isCounter": true,
    "dailyGoal": 30,
    "isTimer": false
  }
}
```

Si omites `categoryId`, se asigna la categoría **General** (creada automáticamente).

---

## Fase 3 — Avanzado

### `HabitFollowUpsInDates` — follow-ups agrupados por fecha

Equivalente a `GET /v1/follow-ups/habit/in-dates/{from}/{to}` (spec legacy).

```graphql
query HabitFollowUpsInDates($from: String!, $to: String!) {
  habitFollowUpsInDates(from: $from, to: $to) {
    date
    followUps {
      id
      habitId
      date
      count
      isAccomplished
    }
  }
}
```

### `Habit.activity` — actividad vinculada

Si el hábito tiene `activityId`, resuelve el tipo GraphQL `Activity` (módulo activities).

### Racha recalculada (Fase 3)

Tras cada follow-up **accomplished**/**failed** o al **borrar** un follow-up, `streak` / `maxStreak` / `days` se recalculan desde los logs (no solo incremento manual). Con `isFailed: true` la racha vuelve a 0 usando el fallo como frontera de época; el historial no se oculta.

---

## Reglas de racha (Fase 2)

- Meta efectiva: `timerGoal` si `isTimer`, `timesGoal` si incremental/decremental, si no `dailyGoal` / `targetCount`.
- Sin meta (`goal <= 0`): no cuenta como accomplished automático.
- `streak` y `maxStreak` se persisten en `habits`.
- `habitStats.currentStreak` coincide con `habit.streak` persistido (recalculado en Fase 3).

---

## Equivalencia REST (legado `/api/habit`)

| GraphQL | REST |
|---------|------|
| `habitCategoryAdd` | `POST /v1/habit-category` (spec; no implementado en `/api`) |
| `habitFollowUpAdd` | `POST /v1/follow-ups/habit/add` (spec) |
| `habitMyDay` | `GET /v1/follow-ups/habit/my-day/:date` (spec) |
| Fase 1 | `/api/habit/*` (sigue activo, delega en el mismo servicio) |
