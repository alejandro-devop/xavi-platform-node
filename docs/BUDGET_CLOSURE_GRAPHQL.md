# Budget Period Closure via GraphQL

This guide shows how to close a budget period and how to query closures from any GraphQL client (GraphiQL, Apollo Sandbox, Insomnia, Postman).

## 1) Close A Budget Period (Mutation)

```graphql
mutation CloseBudgetPeriod($input: CloseBudgetPeriodInput!) {
  closeBudgetPeriod(input: $input) {
    id
    budgetId
    periodStart
    periodEnd
    plannedAmount
    spentAmount
    remainingAmount
    overspentAmount
    expensesCount
    notes
    closedAt
    createdAt
    budget {
      id
      name
      amount
      balance
      isActive
    }
  }
}
```

### Variables (with notes)

```json
{
  "input": {
    "budgetId": "PUT_BUDGET_ID_HERE",
    "notes": "Monthly closure - April"
  }
}
```

### Variables (without notes)

```json
{
  "input": {
    "budgetId": "PUT_BUDGET_ID_HERE"
  }
}
```

## 2) Query Closures For A Budget

```graphql
query GetBudgetClosures($budgetId: ID!) {

## 3) Bulk Close Multiple Budgets

```graphql
mutation CloseBudgetPeriods($inputs: [CloseBudgetPeriodInput!]!) {
  closeBudgetPeriods(inputs: $inputs) {
    id
    budgetId
    periodStart
    periodEnd
    plannedAmount
    spentAmount
    remainingAmount
    overspentAmount
    expensesCount
    notes
    closedAt
  }
}
```

### Variables

```json
{
  "inputs": [
    {
      "budgetId": "PUT_BUDGET_ID_1_HERE",
      "notes": "Monthly closure - April"
    },
    {
      "budgetId": "PUT_BUDGET_ID_2_HERE"
    }
  ]
}
```

If one closure fails (for example, a period is already closed), the entire bulk operation is rolled back.
  walletBudgetClosures(budgetId: $budgetId) {
## 4) Optional: Get A Budget First
    budgetId
    periodStart
    periodEnd
    plannedAmount
    spentAmount
    remainingAmount
    overspentAmount
    expensesCount
    notes
    closedAt
    createdAt
  }
}
```

### Variables

```json
{
  "budgetId": "PUT_BUDGET_ID_HERE"
}
```

## 3) Optional: Get A Budget First

If you need to discover budget IDs first, query your budgets:

```graphql
query GetBudgets {
  walletBudgets {
    id
    name
    startDate
    endDate
    amount
    balance
    isActive
  }
}
```

## Notes

- `closeBudgetPeriod` prevents duplicate closures for the same budget and period.
- After closure, protected operations against closed periods are blocked by backend validations.
- Use your normal Authorization header/token required by your API.
