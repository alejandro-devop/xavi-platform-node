# Activities — GraphQL para Bruno / clientes

**Colección:** [`bruno/xavi-activity-graphql/`](../../bruno/xavi-activity-graphql/)

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

IDs: enteros como string (`"7"`).

---

## Queries

### `Activities`

```graphql
query Activities($status: ActivityStatus, $priority: ActivityPriority) {
  activities(status: $status, priority: $priority, page: 1, limit: 20) {
    activities {
      id
      title
      status
      priority
      scheduledDate
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
    scheduledDate
    completedAt
  }
}
```

---

## Mutations

| Operación | REST equivalente |
|-----------|------------------|
| `activityAdd` | `POST /api/activity` |
| `activityEdit` | `PUT /api/activity/:id` |
| `activityRemove` | `DELETE /api/activity/:id` |
| `activityComplete` | `POST /api/activity/:id/complete` |

### `ActivityComplete`

```graphql
mutation ActivityComplete($id: ID!) {
  activityComplete(id: $id) {
    id
    status
    completedAt
  }
}
```

---

## Integración con Habits

Un hábito puede vincularse con `activityId` en `habitAdd` / `habitEdit`. El field `Habit.activity` resuelve el tipo `Activity` completo.
