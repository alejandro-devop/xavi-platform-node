# Activities — GraphQL para Bruno / clientes

**Colección:** [`bruno/xavi-activity-graphql/`](../../bruno/xavi-activity-graphql/)

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

- IDs de actividad y follow-up: enteros como string (`"7"`).
- IDs de categoría: UUID (`"0194a1b2-..."`).

---

## Queries — Actividades

### `Activities`

```graphql
query Activities($status: ActivityStatus, $categoryId: ID) {
  activities(status: $status, categoryId: $categoryId, page: 1, limit: 20) {
    activities {
      id
      title
      status
      priority
      categoryId
      category { id name color }
      spentTimeMinutes
    }
    total
  }
}
```

### `Activity`

```graphql
query Activity($id: ID!) {
  activity(id: $id) {
    id
    title
    description
    status
    priority
    categoryId
    category { id name icon color }
    spentTimeMinutes
    followUps(limit: 20) {
      id
      date
      startTime
      durationMinutes
      endTime
      endDateTime
      notes
    }
  }
}
```

---

## Queries — Categorías

### `ActivityCategories`

```graphql
query ActivityCategories {
  activityCategories {
    id
    name
    orderIndex
    color
    icon
  }
}
```

### `ActivityCategory`

```graphql
query ActivityCategory($id: ID!) {
  activityCategory(id: $id) {
    id
    name
    description
    orderIndex
  }
}
```

---

## Queries — Follow-ups

### `ActivityFollowUps`

```graphql
query ActivityFollowUps($activityId: ID, $from: String, $to: String) {
  activityFollowUps(activityId: $activityId, from: $from, to: $to, limit: 50) {
    id
    activityId
    date
    startTime
    durationMinutes
    endTime
    endDate
    endDateTime
    notes
  }
}
```

### `ActivityDayFollowUps`

```graphql
query ActivityDayFollowUps($date: String!) {
  activityDayFollowUps(date: $date) {
    id
    startTime
    durationMinutes
    endDateTime
    activity { id title }
  }
}
```

---

## Mutations — Actividades

| Operación | REST equivalente |
|-----------|------------------|
| `activityAdd` | `POST /api/activity` |
| `activityEdit` | `PUT /api/activity/:id` |
| `activityRemove` | `DELETE /api/activity/:id` |
| `activityComplete` | `POST /api/activity/:id/complete` |

### `ActivityAdd` (con categoría)

```graphql
mutation ActivityAdd($input: ActivityInput!) {
  activityAdd(input: $input) {
    id
    title
    categoryId
  }
}
```

```json
{
  "input": {
    "title": "Revisar informe",
    "priority": "high",
    "categoryId": "0194a1b2-c3d4-7000-8000-000000000001"
  }
}
```

---

## Mutations — Categorías

```graphql
mutation ActivityCategoryAdd($input: ActivityCategoryInput!) {
  activityCategoryAdd(input: $input) {
    id
    name
  }
}
```

```graphql
mutation ActivityCategoryEdit($input: ActivityCategoryEditInput!) {
  activityCategoryEdit(input: $input) {
    id
    name
    color
  }
}
```

```graphql
mutation ActivityCategoryRemove($id: ID!) {
  activityCategoryRemove(id: $id)
}
```

---

## Mutations — Follow-ups

La hora de fin **no se persiste**; el API devuelve `endTime`, `endDate` y `endDateTime` calculados.

```graphql
mutation ActivityFollowUpAdd($input: ActivityFollowUpAddInput!) {
  activityFollowUpAdd(input: $input) {
    id
    date
    startTime
    durationMinutes
    endTime
    endDateTime
  }
}
```

```json
{
  "input": {
    "activityId": "7",
    "date": "2026-05-20",
    "startTime": "09:30",
    "durationMinutes": 90,
    "notes": "Sesión enfocada"
  }
}
```

```graphql
mutation ActivityFollowUpEdit($input: ActivityFollowUpEditInput!) {
  activityFollowUpEdit(input: $input) {
    id
    durationMinutes
    endTime
  }
}
```

```graphql
mutation ActivityFollowUpRemove($id: ID!) {
  activityFollowUpRemove(id: $id)
}
```

---

## Integración con Habits

Un hábito puede vincularse con `activityId` en `habitAdd` / `habitEdit`. El field `Habit.activity` resuelve el tipo `Activity` completo.
