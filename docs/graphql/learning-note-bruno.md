# Learning Notes — GraphQL para Bruno / clientes

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

IDs de notas: UUID. IDs de tags: enteros como string (`"12"`).

Filtro `tags`: slugs exactos (AND — la nota debe tener todos).

Con `search`: orden por `ts_rank` (FTS español). Sin search: `updated_at DESC`.

---

## Queries

### `LearningNotes`

```graphql
query LearningNotes($search: String, $tags: [String!], $page: Int, $limit: Int) {
  learningNotes(search: $search, tags: $tags, page: $page, limit: $limit) {
    notes {
      id
      title
      contentMarkdown
      tags { id name slug }
      createdAt
      updatedAt
    }
    page
    limit
    total
  }
}
```

### `LearningNote`

```graphql
query LearningNote($id: ID!) {
  learningNote(id: $id) {
    id
    title
    contentMarkdown
    tags { id name slug }
    createdAt
    updatedAt
  }
}
```

### `LearningTags`

```graphql
query LearningTags($query: String) {
  learningTags(query: $query) {
    id
    name
    slug
  }
}
```

---

## Mutations

### `LearningNoteAdd`

```graphql
mutation LearningNoteAdd($input: LearningNoteInput!) {
  learningNoteAdd(input: $input) {
    id
    title
    contentMarkdown
    tags { id name slug }
  }
}
```

### `LearningNoteEdit`

```graphql
mutation LearningNoteEdit($input: LearningNoteEditInput!) {
  learningNoteEdit(input: $input) {
    id
    title
    contentMarkdown
    tags { id name slug }
    updatedAt
  }
}
```

### `LearningNoteRemove`

```graphql
mutation LearningNoteRemove($id: ID!) {
  learningNoteRemove(id: $id)
}
```

### `LearningTagAdd`

```graphql
mutation LearningTagAdd($input: LearningTagInput!) {
  learningTagAdd(input: $input) {
    id
    name
    slug
  }
}
```

Idempotente por `slug` (si ya existe para el usuario, devuelve el existente).
