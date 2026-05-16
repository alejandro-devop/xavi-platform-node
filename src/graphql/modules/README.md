# GraphQL Modular Structure

This directory contains the modular GraphQL schema and resolvers organized by domain.

## Structure

```
graphql/
├── modules/
│   ├── common/           # Shared definitions
│   │   ├── scalars.schema.ts      # Custom scalars (DateTime, Date, JSON, Decimal)
│   │   ├── health.schema.ts       # Health check type and query
│   │   └── health.resolvers.ts    # Health check resolver
│   │
│   ├── wallet/           # Wallet domain
│   │   ├── wallet.schema.ts       # Wallet types, queries, mutations, inputs
│   │   └── wallet.resolvers.ts    # Wallet resolvers
│   │
│   ├── expense-category/ # Expense categories domain
│   │   ├── expense-category.schema.ts
│   │   └── expense-category.resolvers.ts
│   │
│   ├── expense/          # Expenses domain
│   │   ├── expense.schema.ts
│   │   └── expense.resolvers.ts
│   │
│   ├── scheduled-expense/ # Scheduled expenses domain
│   │   ├── scheduled-expense.schema.ts
│   │   └── scheduled-expense.resolvers.ts
│   │
│   ├── budget/           # Budgets domain
│   │   ├── budget.schema.ts       # Budget and BudgetFollowUp types
│   │   └── budget.resolvers.ts
│   │
│   ├── frequency/        # Frequencies domain
│   │   ├── frequency.schema.ts
│   │   └── frequency.resolvers.ts
│   │
│   ├── period/           # Periods domain
│   │   ├── period.schema.ts
│   │   └── period.resolvers.ts
│   │
│   └── shopping/         # Shopping lists, catalog, list lines
│       ├── shopping.schema.ts
│       └── shopping.resolvers.ts
│
├── schema.ts            # Main schema file (imports and combines all modules)
└── resolvers.ts         # Main resolvers file (merges all module resolvers)
```

## Design Decisions

### Modular Architecture

- **Domain-based organization**: Each business domain has its own module
- **Co-located schemas and resolvers**: Schema definitions and resolvers live together
- **Extend pattern**: Each module extends the base Query and Mutation types

### Benefits

1. **Maintainability**: Easy to find and modify domain-specific code
2. **Scalability**: Adding new domains doesn't affect existing modules
3. **Collaboration**: Multiple developers can work on different modules without conflicts
4. **Testing**: Each module can be tested independently
5. **Code clarity**: Smaller, focused files instead of monolithic 440+ line files

## Adding a New Module

1. Create a new directory under `modules/` with your domain name
2. Create `{domain}.schema.ts`:

   ```typescript
   import { gql } from 'graphql-tag';

   export const {domain}TypeDefs = gql`
     type YourType {
       id: ID!
       # ... fields
     }

     extend type Query {
       yourQuery: YourType
     }

     extend type Mutation {
       yourMutation(input: YourInput!): YourType!
     }

     input YourInput {
       # ... input fields
     }
   `;
   ```

3. Create `{domain}.resolvers.ts`:

   ```typescript
   export const {domain}Resolvers = {
     Query: {
       yourQuery: async () => { ... }
     },
     Mutation: {
       yourMutation: async () => { ... }
     },
   };
   ```

4. Import and add to main files:
   - Add to `schema.ts`: Import typeDefs and add to array
   - Add to `resolvers.ts`: Import resolvers and add to mergeResolvers array

## Implementation Status

✅ **Implemented**:

- Common (scalars, health)
- Wallet
- Expense Category
- Expense
- Shopping (lists, catalog items, list lines)

🔄 **Stub (Not Yet Implemented)** (verify current code — some may have been completed since this README was written):

- Scheduled Expense
- Budget & Budget Follow-up
- Frequency
- Period

Stub modules return null/empty arrays for queries and throw "Not yet implemented" errors for mutations.

**API policy:** Prefer GraphQL for new domains. See repo root `AGENTS.md`.
