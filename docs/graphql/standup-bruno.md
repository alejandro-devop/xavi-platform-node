# Standup (My Stand up) — operaciones GraphQL

Dominio para seguimiento diario del equipo de desarrollo: responsables, días abiertos/cerrados, ítems y resumen copiable.

## Queries

### standupMembers

```graphql
query StandupMembers($includeInactive: Boolean) {
  standupMembers(includeInactive: $includeInactive) {
    id
    name
    isActive
    orderIndex
  }
}
```

### standupDay

```graphql
query StandupDay($date: String!) {
  standupDay(date: $date) {
    day {
      id
      date
      status
      openedAt
      closedAt
    }
    items {
      id
      title
      notes
      ticketNumber
      status
      backlogStartedOn
      daysInBacklog
      memberId
      linkedTodoId
      member { id name }
    }
    carryOverCandidates {
      id
      title
      status
      memberId
      daysInBacklog
    }
  }
}
```

### standupDaySummary

```graphql
query StandupDaySummary($date: String!) {
  standupDaySummary(date: $date) {
    date
    text
    groups {
      memberId
      memberName
      items { id title status ticketNumber daysInBacklog }
    }
  }
}
```

## Mutations

### Responsables

```graphql
mutation StandupMemberCreate($input: StandupMemberCreateInput!) {
  standupMemberCreate(input: $input) { id name isActive }
}

mutation StandupMemberUpdate($input: StandupMemberUpdateInput!) {
  standupMemberUpdate(input: $input) { id name isActive }
}

mutation StandupMemberDelete($input: StandupMemberDeleteInput!) {
  standupMemberDelete(input: $input)
}
```

### Día

```graphql
mutation StandupOpenDay($input: StandupDateInput!) {
  standupOpenDay(input: $input) {
    day { id date status }
    carryOverCandidates { id title status }
  }
}

mutation StandupCloseDay($input: StandupDateInput!) {
  standupCloseDay(input: $input) { id date status closedAt }
}

mutation StandupCarryOver($input: StandupCarryOverInput!) {
  standupCarryOver(input: $input) {
    id
    title
    sourceItemId
    backlogStartedOn
    daysInBacklog
  }
}
```

### Ítems

```graphql
mutation StandupItemCreate($input: StandupItemCreateInput!) {
  standupItemCreate(input: $input) {
    id title notes ticketNumber status daysInBacklog memberId
  }
}

mutation StandupItemUpdate($input: StandupItemUpdateInput!) {
  standupItemUpdate(input: $input) { id title status ticketNumber }
}

mutation StandupItemDelete($input: StandupItemDeleteInput!) {
  standupItemDelete(input: $input)
}

mutation StandupItemCreateTodo($input: StandupItemCreateTodoInput!) {
  standupItemCreateTodo(input: $input) { id title folderId status }
}
```

### Carpeta destino de todos

```graphql
mutation UpdateStandupTodoFolder($input: UpdateUserSettingsInput!) {
  updateMySettings(input: $input) {
    standupTodoFolderId
  }
}
```

Variables ejemplo: `{ "input": { "standupTodoFolderId": "10" } }`

## Flujo típico

1. Crear responsables (`standupMemberCreate`).
2. Configurar `standupTodoFolderId` en settings.
3. `standupOpenDay` para la fecha.
4. Opcional: `standupCarryOver` con candidatos de ayer.
5. CRUD de ítems del día.
6. `standupDaySummary` → copiar `text` al PM.
7. `standupCloseDay` al terminar.
