---
description: 'Use when creating, editing, or reviewing GraphQL schema or resolver files in src/graphql/. Covers module structure, resolver wrappers, authentication, schema registration, and naming conventions.'
applyTo: 'src/graphql/**'
---

# GraphQL Layer Guidelines

GraphQL modules live in `src/graphql/modules/<domain>/` and consist of two files:

- `<domain>.schema.ts` — GraphQL type definitions (gql tagged template)
- `<domain>.resolvers.ts` — Resolver map with wrapped handlers

## Schema Template

```typescript
// src/graphql/modules/domain/domain.schema.ts
import { gql } from 'graphql-tag';

export const domainTypeDefs = gql`
  type Domain {
    id: ID!
    name: String!
    createdAt: DateTime!
  }

  input DomainInput {
    name: String!
  }

  extend type Query {
    domain(id: ID!): Domain
    domains: [Domain!]!
  }

  extend type Mutation {
    domainAdd(input: DomainInput!): Domain!
    domainEdit(id: ID!, input: DomainInput!): Domain!
    domainRemove(id: ID!): Domain!
  }
`;
```

## Resolver Template

```typescript
// src/graphql/modules/domain/domain.resolvers.ts
import {
  withErrorHandling,
  withValidatedResolver,
  withAsyncValidatedResolver,
} from '@/graphql/utils/error-handler';
import { requireAuth } from '@/graphql/utils/error-handler';
import { domainService } from '@/services/domain.service';
import { domainIdSchema, createDomainInputSchema } from '@/validators/schemas/domain.schemas';

export const domainResolvers = {
  Query: {
    domains: withErrorHandling(async (_: unknown, __: unknown, context: any) => {
      requireAuth(context, 'domains');
      return domainService.getAll(context.user.id);
    }, 'domains'),

    domain: withValidatedResolver(
      domainIdSchema,
      async (_: unknown, { id }: { id: string }, context: any) => {
        requireAuth(context, 'domain');
        return domainService.getById(id, context.user.id);
      },
      'domain'
    ),
  },

  Mutation: {
    domainAdd: withAsyncValidatedResolver(
      createDomainInputSchema,
      async (_: unknown, { input }: any, context: any) => {
        requireAuth(context, 'domainAdd');
        const validated = await createDomainInputSchema.parseAsync(input);
        return domainService.create(context.user.id, validated);
      },
      'domainAdd'
    ),
  },
};
```

## Rules

- **Always wrap resolvers** with `withErrorHandling`, `withValidatedResolver`, or `withAsyncValidatedResolver`
- **Always call `requireAuth(context, 'operationName')`** at the top of authenticated resolvers
- **Operation naming**: `domainAdd`, `domainEdit`, `domainRemove`, `domainGet`, `domains` (camelCase, noun first)
- **GraphQL type naming**: PascalCase — `Domain`, `DomainInput`, `DomainConnection`
- **After creating a module, register it**:
  - Add `typeDefs` to `src/graphql/schema.ts`
  - Add `resolvers` to `src/graphql/resolvers.ts`
- **Nullable Zod inputs**: use `.nullable().optional()` when field can be `null` (explicit) or `undefined` (omitted)
- **Custom scalars**: `DateTime`, `Decimal`, `UUID` are already registered in `src/graphql/modules/common/`

## Registering a New Module

```typescript
// src/graphql/schema.ts — add to the merge array
import { domainTypeDefs } from './modules/domain/domain.schema';
export const typeDefs = mergeTypeDefs([..., domainTypeDefs]);

// src/graphql/resolvers.ts — add to the merge array
import { domainResolvers } from './modules/domain/domain.resolvers';
export const resolvers = mergeResolvers([..., domainResolvers]);
```
