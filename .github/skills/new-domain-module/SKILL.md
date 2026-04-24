---
name: new-domain-module
description: "Use when adding a new feature domain to the project. Scaffolds the complete vertical slice: service, types, Zod validators, GraphQL schema, GraphQL resolvers, and unit tests. Invoke with: /new-domain-module <domain-name>"
argument-hint: "<domain-name> (e.g. habit, shopping, note)"
---

# New Domain Module

Creates a complete vertical slice for a new feature domain following all project conventions.

## When to Use
- Adding a new business entity with CRUD operations (e.g., `habit`, `note`, `goal`)
- The domain needs both a GraphQL API and optional REST support
- You want all layers scaffolded consistently from the start

## Files to Create

Given domain name `<domain>` (e.g. `habit`), create these files:

| File | Purpose |
|---|---|
| `src/types/services/<domain>.types.ts` | TypeScript interfaces |
| `src/validators/schemas/<domain>.schemas.ts` | Zod schemas for GraphQL |
| `src/services/<domain>.service.ts` | Business logic singleton |
| `src/graphql/modules/<domain>/<domain>.schema.ts` | GraphQL type definitions |
| `src/graphql/modules/<domain>/<domain>.resolvers.ts` | GraphQL resolvers |
| `tests/unit/services/<domain>.service.test.ts` | Unit tests for service |

## Step-by-Step Procedure

### Step 1 — Confirm domain name and fields
Ask the user (or infer from context): what is the domain name, its primary fields, and which operations are needed (CRUD subset)?

### Step 2 — Create Types (`src/types/services/<domain>.types.ts`)

```typescript
export interface Domain {
  id: string;
  userId: number;
  name: string;
  // ... other fields, DECIMAL columns as number (not string)
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDomainInput {
  name: string;
  // ... required creation fields
}

export interface UpdateDomainInput {
  name?: string;
  // ... optional update fields
}
```

### Step 3 — Create Zod Schemas (`src/validators/schemas/<domain>.schemas.ts`)

Flat objects (no body/params wrapping — that is only for REST validators).

```typescript
import { z } from 'zod';

export const domainIdSchema = z.object({
  id: z.string().uuid('Invalid domain ID format'),
});

export const createDomainInputSchema = z.object({
  name: z.string().min(1).max(255),
  // nullable + optional for GraphQL fields that can be omitted OR explicitly null:
  description: z.string().max(1000).nullable().optional(),
});

export const updateDomainInputSchema = createDomainInputSchema.partial();
```

### Step 4 — Create Service (`src/services/<domain>.service.ts`)

- Export as `export const domainService = { ... }`
- Call `getDb()` inside every method (never at module level)
- Convert DECIMAL columns with `parseFloat()`
- Use `checkRecordExists()` before all mutations
- See [services.instructions.md](../../instructions/services.instructions.md) for full template

### Step 5 — Create GraphQL Schema (`src/graphql/modules/<domain>/<domain>.schema.ts`)

- Export as `export const domainTypeDefs = gql\`...\``
- Use `extend type Query` and `extend type Mutation`
- Operation names: `domainAdd`, `domainEdit`, `domainRemove`, `domain`, `domains`
- See [graphql.instructions.md](../../instructions/graphql.instructions.md) for full template

### Step 6 — Create GraphQL Resolvers (`src/graphql/modules/<domain>/<domain>.resolvers.ts`)

- Export as `export const domainResolvers = { Query: {}, Mutation: {} }`
- Wrap all resolvers with `withErrorHandling` / `withValidatedResolver` / `withAsyncValidatedResolver`
- Call `requireAuth(context, 'operationName')` in every resolver
- See [graphql.instructions.md](../../instructions/graphql.instructions.md) for full template

### Step 7 — Register the Module

```typescript
// src/graphql/schema.ts — add import and include in mergeTypeDefs([...])
import { domainTypeDefs } from './modules/<domain>/<domain>.schema';

// src/graphql/resolvers.ts — add import and include in mergeResolvers([...])
import { domainResolvers } from './modules/<domain>/<domain>.resolvers';
```

### Step 8 — Write Unit Tests (`tests/unit/services/<domain>.service.test.ts`)

- Mock `getDb` before importing the service
- Use `resetAllMocks()` in `beforeEach`
- Use `createMockX()` or build an inline factory for the domain
- Test: happy path, not-found error, forbidden error, validation errors
- See [tests.instructions.md](../../instructions/tests.instructions.md) for full template

## Checklist
- [ ] Types defined (interfaces match DB schema with numbers not strings)
- [ ] Zod schemas: flat objects, nullable handled
- [ ] Service: getDb() called inside methods, DECIMAL → parseFloat, ownership check
- [ ] GraphQL schema: uses extend type Query/Mutation
- [ ] GraphQL resolvers: all wrapped, requireAuth called
- [ ] Module registered in schema.ts and resolvers.ts
- [ ] Tests: mock setup, happy path, error cases
