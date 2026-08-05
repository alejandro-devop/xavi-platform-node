# App Ideas — GraphQL para Bruno / clientes

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

IDs de ideas: UUID.

`status`: `draft` | `exploring` | `building` | `shipped` | `archived`.

Con `search`: orden por `ts_rank` (FTS español). Sin search: `updated_at DESC`.

---

## Queries

### `AppIdeas`

```graphql
query AppIdeas($search: String, $status: AppIdeaStatus, $page: Int, $limit: Int) {
  appIdeas(search: $search, status: $status, page: $page, limit: $limit) {
    ideas {
      id
      title
      contentMarkdown
      status
      createdAt
      updatedAt
    }
    page
    limit
    total
  }
}
```

### `AppIdea`

```graphql
query AppIdea($id: ID!) {
  appIdea(id: $id) {
    id
    title
    contentMarkdown
    status
    createdAt
    updatedAt
  }
}
```

---

## Mutations

### `AppIdeaAdd`

```graphql
mutation AppIdeaAdd($input: AppIdeaInput!) {
  appIdeaAdd(input: $input) {
    id
    title
    contentMarkdown
    status
  }
}
```

### `AppIdeaEdit`

```graphql
mutation AppIdeaEdit($input: AppIdeaEditInput!) {
  appIdeaEdit(input: $input) {
    id
    title
    contentMarkdown
    status
    updatedAt
  }
}
```

### `AppIdeaRemove`

```graphql
mutation AppIdeaRemove($id: ID!) {
  appIdeaRemove(id: $id)
}
```
