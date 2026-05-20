# Routines — GraphQL para Bruno / clientes

**Colección:** [`bruno/xavi-routine-graphql/`](../../bruno/xavi-routine-graphql/)

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

IDs de rutinas y pasos: enteros como string (`"5"`).

---

## Queries

### `Routines`

```graphql
query Routines($isActive: Boolean, $timeOfDay: RoutineTimeOfDay, $dayOfWeek: DayOfWeek) {
  routines(isActive: $isActive, timeOfDay: $timeOfDay, dayOfWeek: $dayOfWeek) {
    routines {
      id
      name
      timeOfDay
      isActive
      stepsCount
      totalDuration
    }
    total
  }
}
```

### `Routine`

```graphql
query Routine($id: ID!) {
  routine(id: $id) {
    id
    name
    daysOfWeek
    timeOfDay
    isActive
    steps {
      id
      title
      durationMinutes
      orderIndex
    }
  }
}
```

---

## Mutations

| Operación | Descripción |
|-----------|-------------|
| `routineAdd` | Crear rutina |
| `routineEdit` | Actualizar |
| `routineRemove` | Eliminar |
| `routineSetActive` | Activa una y desactiva las demás del usuario |
| `routineToggleActive` | Alterna `isActive` (paridad REST `/toggle`) |
| `routineStepAdd` | Añadir paso |
| `routineStepEdit` | Editar paso |
| `routineStepRemove` | Quitar paso |

### `routineSetActive`

```graphql
mutation RoutineSetActive($id: ID!) {
  routineSetActive(id: $id) {
    id
    name
    isActive
  }
}
```

### `routineStepAdd`

```graphql
mutation RoutineStepAdd($input: RoutineStepInput!) {
  routineStepAdd(input: $input) {
    id
    routineId
    title
    durationMinutes
    orderIndex
  }
}
```

```json
{
  "input": {
    "routineId": "5",
    "title": "Stretch",
    "durationMinutes": 5,
    "orderIndex": 0
  }
}
```

---

## REST equivalente

| GraphQL | REST |
|---------|------|
| `routineAdd` | `POST /api/routine` |
| `routines` | `GET /api/routine` |
| `routine` | `GET /api/routine/:id` |
| `routineEdit` | `PUT /api/routine/:id` |
| `routineRemove` | `DELETE /api/routine/:id` |
| `routineToggleActive` | `POST /api/routine/:id/toggle` |
| `routineStepAdd` | `POST /api/routine/:id/steps` |
