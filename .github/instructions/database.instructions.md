---
description: "Use when working with database schema, Drizzle ORM, or migrations. Covers schema definition conventions, UUID v7, DECIMAL handling, query patterns, and migration workflow."
applyTo: "src/shared/database/**"
---

# Database & Drizzle ORM Guidelines

## Schema (`src/shared/database/schema.ts`)

`schema.ts` is the **single source of truth**. Never define table shapes elsewhere.

```typescript
// Column conventions
import {
  pgTable, uuid, integer, varchar, text, decimal,
  boolean, timestamp, date, pgEnum
} from 'drizzle-orm/pg-core';
import { generateUuidV7 } from './uuid';

export const domainItems = pgTable('domain_items', {
  id: uuid('id').primaryKey().$defaultFn(() => generateUuidV7()),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

## Rules

- **Primary keys**: always `uuid` with `$defaultFn(() => generateUuidV7())`
- **DECIMAL columns**: use `{ precision: 15, scale: 2 }` — they **return strings** from DB, always `parseFloat()` before returning to callers
- **Column names**: `snake_case` in DB, `camelCase` in TypeScript (Drizzle maps automatically)
- **Timestamps**: always add `createdAt` and `updatedAt` to every table
- **Foreign keys**: always specify `onDelete: 'cascade'` or `'restrict'` explicitly
- **Enums**: use `pgEnum` defined before the table

## Query Patterns

```typescript
import { getDb } from '@shared/database/drizzle';
import { eq, and, desc, asc, gte, lte, ilike } from 'drizzle-orm';
import { domainItems } from '@shared/database/schema';

const db = getDb(); // call inside methods, never at module level

// Read — use query API for type safety
const items = await db.query.domainItems.findMany({
  where: and(
    eq(domainItems.userId, userId),
    eq(domainItems.isActive, true)
  ),
  orderBy: [desc(domainItems.createdAt)],
});

// Create
const [created] = await db
  .insert(domainItems)
  .values({ userId, name, amount: '0' })
  .returning();

// Update
const [updated] = await db
  .update(domainItems)
  .set({ name, updatedAt: new Date() })
  .where(eq(domainItems.id, id))
  .returning();

// Delete
const [deleted] = await db
  .delete(domainItems)
  .where(eq(domainItems.id, id))
  .returning();
```

## Migrations

- Files: `migrations/NNN_description.sql` (zero-padded sequential number)
- Create: `npm run migrate:create` — scaffolds next file
- Run: `npm run migrate`
- **Never modify existing migration files** — only add new ones
- See `docs/MIGRATIONS_GUIDE.md` for full workflow
