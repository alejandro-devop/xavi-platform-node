# Learning — GraphQL para Bruno / clientes

**Colección:** [`bruno/xavi-learning-graphql/`](../../bruno/xavi-learning-graphql/)

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

IDs: enteros como string (`"12"`).

---

## Queries

### `LearningResources`

```graphql
query LearningResources($resourceType: LearningResourceType, $status: LearningResourceStatus) {
  learningResources(resourceType: $resourceType, status: $status, page: 1, limit: 20) {
    resources {
      id
      title
      resourceType
      status
      priority
      progressStats {
        totalSessions
        totalTimeSpent
        currentProgress
      }
    }
    total
  }
}
```

### `LearningResource`

```graphql
query LearningResource($id: ID!) {
  learningResource(id: $id) {
    id
    title
    description
    resourceType
    url
    category
    status
    estimatedDurationMinutes
    progressStats {
      totalSessions
      totalTimeSpent
      currentProgress
    }
    progressSessions {
      id
      sessionDate
      durationMinutes
      progressPercentage
      notes
    }
  }
}
```

---

## Mutations

| Operación | REST equivalente |
|-----------|------------------|
| `learningResourceAdd` | `POST /api/learning` |
| `learningResourceEdit` | `PUT /api/learning/:id` |
| `learningResourceRemove` | `DELETE /api/learning/:id` |
| `learningProgressAdd` | `POST /api/learning/:id/progress` |
| `learningProgressEdit` | `PUT /api/learning/:id/progress/:sessionId` |
| `learningProgressRemove` | `DELETE /api/learning/:id/progress/:sessionId` |

### `LearningResourceAdd`

```graphql
mutation LearningResourceAdd($input: LearningResourceInput!) {
  learningResourceAdd(input: $input) {
    id
    title
    resourceType
    status
    priority
  }
}
```

Variables:

```json
{
  "input": {
    "title": "TypeScript Handbook",
    "resourceType": "book",
    "category": "dev",
    "priority": "high",
    "estimatedDurationMinutes": 600
  }
}
```

### `LearningProgressAdd`

```graphql
mutation LearningProgressAdd($input: LearningProgressInput!) {
  learningProgressAdd(input: $input) {
    id
    resourceId
    durationMinutes
    progressPercentage
    sessionDate
  }
}
```

Variables:

```json
{
  "input": {
    "resourceId": "12",
    "durationMinutes": 45,
    "progressPercentage": 25
  }
}
```

---

## Notas

- Al registrar progreso con `progressPercentage`, el estado del recurso puede pasar automáticamente a `in_progress` o `completed`.
- `progressStats.currentProgress` es el máximo `progressPercentage` registrado en sesiones.
