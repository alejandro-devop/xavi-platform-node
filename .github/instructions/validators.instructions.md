---
description: "Use when creating or editing Zod validation schemas in src/validators/. Covers the difference between REST validators and GraphQL schemas, nullable handling, custom validators, and schema registration."
applyTo: "src/validators/**"
---

# Validation Guidelines

There are two types of validators, stored in different locations.

## REST Validators (`src/validators/*.validator.ts`)

Used with `validateRequest()` middleware in Express routes. Schema wraps `body` and `params`:

```typescript
// src/validators/domain.validator.ts
import { z } from 'zod';

export const createDomainSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    amount: z.number().nonnegative(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
});

export const updateDomainSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
  }),
});
```

Usage in routes:
```typescript
import { validateRequest } from '@shared/middleware/validate';
import { createDomainSchema } from '../validators/domain.validator';

router.post('/', authenticateToken, validateRequest(createDomainSchema), createDomain);
```

## GraphQL Validators (`src/validators/schemas/*.schemas.ts`)

Used directly in resolvers via `withValidatedResolver` or `.parseAsync()`. Schema is a **flat object** (no body/params wrapper):

```typescript
// src/validators/schemas/domain.schemas.ts
import { z } from 'zod';

export const domainIdSchema = z.object({
  id: z.string().uuid('Invalid domain ID'),
});

export const createDomainInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(), // null (explicit) or undefined (omitted)
  amount: z.number().nonnegative().optional(),
});
```

## Rules

- **REST schemas**: always nest fields under `body:` and/or `params:`
- **GraphQL schemas**: flat objects, no nesting
- **Nullable GraphQL inputs**: use `.nullable().optional()` when the field can be `null` (client sends null) **or** `undefined` (client omits it)
- **UUID params**: always `z.string().uuid('Invalid X ID format')`
- **Custom domain validators** (unique name, DB existence checks): import from `@shared/utils/custom-validators`

## Custom Validators (`@shared/utils/custom-validators.ts`)

```typescript
// Already available — use, don't recreate:
import { uniqueNameValidator, checkExistsByField } from '@shared/utils/custom-validators';

// Example: validate unique name within user scope
name: z.string().superRefine(uniqueNameValidator({
  table: walletExpenseCategories,
  field: walletExpenseCategories.name,
  scopeField: walletExpenseCategories.userId,
  scopeValue: userId,
  excludeId: existingId, // for updates
}))
```
