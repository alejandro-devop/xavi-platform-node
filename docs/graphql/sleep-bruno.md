# Sleep — GraphQL para Bruno / clientes

**Colección:** [`bruno/xavi-sleep-graphql/`](../../bruno/xavi-sleep-graphql/)

Endpoint: **`POST /graphql`** · Header: **`Authorization: Bearer <token>`**

IDs: enteros como string (`"5"`).

---

## Queries

### `SleepLogs`

```graphql
query SleepLogs($startDate: DateTime, $endDate: DateTime, $quality: SleepQuality) {
  sleepLogs(startDate: $startDate, endDate: $endDate, quality: $quality, page: 1, limit: 30) {
    sleepLogs {
      id
      sleepDate
      bedtime
      wakeTime
      durationMinutes
      durationHours
      quality
      moodOnWaking
    }
    total
    page
    limit
  }
}
```

### `SleepLog`

```graphql
query SleepLog($id: ID!) {
  sleepLog(id: $id) {
    id
    sleepDate
    bedtime
    wakeTime
    durationMinutes
    durationHours
    quality
    moodOnWaking
    notes
  }
}
```

### `SleepStats`

```graphql
query SleepStats($startDate: DateTime, $endDate: DateTime) {
  sleepStats(startDate: $startDate, endDate: $endDate) {
    totalNights
    avgDurationMinutes
    avgDurationHours
    minDurationMinutes
    maxDurationMinutes
    qualityDistribution {
      poor
      fair
      good
      excellent
    }
    period {
      startDate
      endDate
    }
  }
}
```

---

## Mutations

| Operación | REST equivalente |
|-----------|------------------|
| `sleepLogAdd` | `POST /api/sleep` |
| `sleepLogEdit` | `PUT /api/sleep/:id` |
| `sleepLogRemove` | `DELETE /api/sleep/:id` |

### `SleepLogAdd`

```graphql
mutation SleepLogAdd($input: SleepLogInput!) {
  sleepLogAdd(input: $input) {
    id
    sleepDate
    durationMinutes
    durationHours
    quality
  }
}
```

Variables:

```json
{
  "input": {
    "sleepDate": "2024-06-01",
    "bedtime": "2024-05-31T23:00:00.000Z",
    "wakeTime": "2024-06-01T07:00:00.000Z",
    "quality": "good",
    "moodOnWaking": "refreshed"
  }
}
```

---

## Notas

- `durationMinutes` y `durationHours` se calculan en servidor a partir de `bedtime` y `wakeTime`.
- Hay restricción única por `(user_id, sleep_date)`: un registro por noche por usuario.
