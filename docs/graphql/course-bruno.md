# Courses — GraphQL para Bruno / clientes

**Colección:** [`bruno/xavi-course-graphql/`](../../bruno/xavi-course-graphql/)

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

IDs: enteros como string (`"3"`).

---

## Queries

### `Courses`

```graphql
query Courses($status: CourseStatus, $difficulty: CourseDifficulty) {
  courses(status: $status, difficulty: $difficulty, page: 1, limit: 20) {
    courses {
      id
      title
      status
      difficulty
      totalModules
      totalLessons
      completedLessons
      progress
    }
    total
  }
}
```

### `Course` (detalle con módulos y lecciones)

```graphql
query Course($id: ID!) {
  course(id: $id) {
    id
    title
    description
    instructor
    status
    progress
    modules {
      id
      title
      orderIndex
      lessons {
        id
        title
        contentType
        orderIndex
        completed
        completionDate
      }
    }
  }
}
```

### `CourseProgress`

```graphql
query CourseProgress($courseId: ID!) {
  courseProgress(courseId: $courseId) {
    courseId
    totalModules
    totalLessons
    completedLessons
    progress
    startedDate
    lastActivity
  }
}
```

---

## Mutations

| Operación | REST equivalente |
|-----------|------------------|
| `courseAdd` | `POST /api/course` |
| `courseEdit` | `PUT /api/course/:id` |
| `courseRemove` | `DELETE /api/course/:id` |
| `courseModuleAdd` | `POST /api/course/:courseId/modules` |
| `courseModuleEdit` | `PUT /api/course/:courseId/modules/:moduleId` |
| `courseModuleRemove` | `DELETE /api/course/:courseId/modules/:moduleId` |
| `courseLessonAdd` | `POST /api/course/.../lessons` |
| `courseLessonEdit` | `PUT /api/course/.../lessons/:lessonId` |
| `courseLessonRemove` | `DELETE /api/course/.../lessons/:lessonId` |
| `courseLessonProgress` | `POST /api/course/:courseId/lessons/:lessonId/progress` |

### `CourseLessonProgress`

```graphql
mutation CourseLessonProgress($input: CourseLessonProgressInput!) {
  courseLessonProgress(input: $input) {
    progress {
      lessonId
      completed
      completionDate
    }
    courseStatus
  }
}
```

Variables:

```json
{
  "input": {
    "courseId": "3",
    "lessonId": "20",
    "completed": true,
    "notes": "Done"
  }
}
```

---

## Notas

- Al marcar lecciones completadas, el `status` del curso se recalcula (`not_started` → `in_progress` → `completed`).
- `Course.modules` y progreso están disponibles en `course(id)`; en listados solo stats agregados.
