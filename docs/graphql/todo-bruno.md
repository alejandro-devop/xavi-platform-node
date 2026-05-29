# Todos — GraphQL para Bruno / clientes

**Colección:** [`bruno/xavi-todo-graphql/`](../../bruno/xavi-todo-graphql/)

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

IDs: enteros como string (`"10"`).

---

## Queries

### `Todos`

```graphql
query Todos($status: TodoStatus, $priority: TodoPriority) {
  todos(status: $status, priority: $priority, page: 1, limit: 20) {
    todos {
      id
      title
      status
      priority
      dueDate
      subtasksCount {
        total
        completed
      }
    }
    total
    page
    limit
  }
}
```

### `Todo`

```graphql
query Todo($id: ID!) {
  todo(id: $id) {
    id
    title
    description
    status
    priority
    dueDate
    completedAt
    subtasks {
      id
      title
      isCompleted
      orderIndex
    }
    subtasksCount {
      total
      completed
    }
  }
}
```

### `TodoTags`

```graphql
query TodoTags {
  todoTags {
    id
    name
    color
  }
}
```

### `TodoFolders`

```graphql
query TodoFolders {
  todoFolders {
    id
    name
    color
    orderIndex
    todoCount
  }
}
```

Filter todos: `todos(folderId: "2")` or `todos(withoutFolder: true)`.

---

## Mutations

| Operación | REST equivalente |
|-----------|------------------|
| `todoAdd` | `POST /api/todo` |
| `todoEdit` | `PUT /api/todo/:id` |
| `todoRemove` | `DELETE /api/todo/:id` |
| `todoComplete` | `POST /api/todo/:id/complete` |
| `todoSubtaskAdd` | `POST /api/todo/:id/subtasks` |
| `todoSubtaskEdit` | `PUT /api/todo/:id/subtasks/:subtaskId` |
| `todoSubtaskRemove` | `DELETE /api/todo/:id/subtasks/:subtaskId` |
| `todoTagAdd` | — |
| `todoTagEdit` | — |
| `todoTagRemove` | — |
| `todoFolderAdd` | — |
| `todoFolderEdit` | — |
| `todoFolderRemove` | — |

### `TodoFolderAdd`

```graphql
mutation TodoFolderAdd($input: TodoFolderInput!) {
  todoFolderAdd(input: $input) {
    id
    name
    color
    orderIndex
    todoCount
  }
}
```

Variables: `{ "input": { "name": "Personal", "color": "#10B981" } }`

Deleting a folder (`todoFolderRemove`) leaves tasks uncategorized (`folder_id` null).

### `TodoTagAdd`

```graphql
mutation TodoTagAdd($input: TodoTagInput!) {
  todoTagAdd(input: $input) {
    id
    name
    color
  }
}
```

Variables: `{ "input": { "name": "Work", "color": "#2563EB" } }`

### `TodoAdd`

```graphql
mutation TodoAdd($input: TodoInput!) {
  todoAdd(input: $input) {
    id
    title
    status
    priority
    dueDate
  }
}
```

Variables:

```json
{
  "input": {
    "title": "Buy groceries",
    "priority": "high",
    "dueDate": "2024-06-15T18:00:00.000Z",
    "tagIds": ["1", "2"],
    "folderId": "2"
  }
}
```

List filters: `todos(tagId: "1")`, `todos(folderId: "2")`, `todos(withoutFolder: true)`.

Folder lists sort by `orderIndex` ascending.

### `TodoReorder`

```graphql
mutation TodoReorder($input: TodoReorderInput!) {
  todoReorder(input: $input) {
    id
    orderIndex
    folderId
  }
}
```

Variables: `{ "input": { "folderId": "2", "todoIds": ["10", "12", "11"] } }`

Use `folderId: null` for uncategorized todos.

### `TodoComplete`

```graphql
mutation TodoComplete($id: ID!) {
  todoComplete(id: $id) {
    id
    status
    completedAt
  }
}
```

### `TodoSubtaskAdd`

```graphql
mutation TodoSubtaskAdd($input: TodoSubtaskInput!) {
  todoSubtaskAdd(input: $input) {
    id
    todoId
    title
    isCompleted
    orderIndex
  }
}
```

Variables:

```json
{
  "input": {
    "todoId": "10",
    "title": "Milk",
    "orderIndex": 0
  }
}
```
