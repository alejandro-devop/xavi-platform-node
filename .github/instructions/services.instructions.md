---
description: 'Use when creating, editing, or reviewing service files in src/services/. Covers service singleton pattern, Drizzle ORM usage, DECIMAL conversion, ownership validation, and error handling.'
applyTo: 'src/services/**'
---

# Service Layer Guidelines

Services are exported as **camelCase singleton objects** (not classes). Each method is async and handles one unit of business logic.

## Structure Template

```typescript
// src/services/domain.service.ts
import { eq, and } from 'drizzle-orm';
import { getDb } from '@shared/database/drizzle';
import { domainTable } from '@shared/database/schema';
import { NotFoundError, ForbiddenError, BadRequestError } from '@shared/errors';
import { checkRecordExists } from '@shared/utils/db-validators';
import type { CreateDomainInput, UpdateDomainInput, Domain } from '@/types/services/domain.types';

export const domainService = {
  async getAll(userId: number): Promise<Domain[]> {
    const db = getDb();
    const rows = await db.query.domainTable.findMany({
      where: eq(domainTable.userId, userId),
    });
    return rows.map(mapRow);
  },

  async getById(id: string, userId: number): Promise<Domain> {
    const db = getDb();
    const record = await checkRecordExists({
      table: domainTable,
      idValue: id,
      scopeField: domainTable.userId,
      scopeValue: userId,
      notFoundMessage: 'Domain not found',
      forbiddenMessage: 'Access denied',
    });
    return mapRow(record);
  },

  async create(userId: number, input: CreateDomainInput): Promise<Domain> {
    const db = getDb();
    const [row] = await db
      .insert(domainTable)
      .values({ userId, ...input })
      .returning();
    return mapRow(row);
  },

  async update(id: string, userId: number, input: UpdateDomainInput): Promise<Domain> {
    const db = getDb();
    await checkRecordExists({
      table: domainTable,
      idValue: id,
      scopeField: domainTable.userId,
      scopeValue: userId,
      notFoundMessage: 'Domain not found',
      forbiddenMessage: 'Access denied',
    });
    const [updated] = await db
      .update(domainTable)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(domainTable.id, id))
      .returning();
    return mapRow(updated);
  },

  async remove(id: string, userId: number): Promise<Domain> {
    const db = getDb();
    await checkRecordExists({
      table: domainTable,
      idValue: id,
      scopeField: domainTable.userId,
      scopeValue: userId,
      notFoundMessage: 'Domain not found',
      forbiddenMessage: 'Access denied',
    });
    const [deleted] = await db.delete(domainTable).where(eq(domainTable.id, id)).returning();
    return mapRow(deleted);
  },
};
```

## Rules

- **Always call `getDb()` inside each method**, never at module level
- **DECIMAL fields return strings** — always convert: `parseFloat(row.amount)`, `parseFloat(row.balance)`
- **Ownership check before any mutation** — use `checkRecordExists()` which throws `NotFoundError` or `ForbiddenError`
- **Import tables from `@shared/database/schema`** — never redefine table shapes
- **Import errors from `@shared/errors`** — never throw raw `Error`
- **Service file name**: `kebab-case.service.ts`
- **Service export name**: `camelCase` singleton — `export const domainService = { ... }`
- **Type interfaces** go in `src/types/services/domain.types.ts`

## DECIMAL Mapping Helper Pattern

```typescript
function mapRow(row: typeof domainTable.$inferSelect): Domain {
  return {
    ...row,
    amount: parseFloat(row.amount), // DB returns string
    balance: parseFloat(row.balance), // DB returns string
  };
}
```
