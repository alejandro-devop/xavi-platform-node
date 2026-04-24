---
name: add-migration
description: 'Use when adding a new database migration: creating tables, adding columns, renaming fields, adding indexes, or any schema change. Covers file naming, SQL conventions, Drizzle schema updates, and running the migration.'
argument-hint: '<description> (e.g. add_tags_table, add_priority_to_todos)'
---

# Add Database Migration

Creates and applies a new SQL migration following the project's sequential numbering system.

## When to Use

- Adding a new table
- Adding/removing columns from existing tables
- Adding indexes or constraints
- Renaming columns or changing types
- Any persistent schema change

## Step-by-Step Procedure

### Step 1 — Find the next migration number

```bash
ls migrations/ | sort | tail -5
```

The next file should be `NNN_description.sql` where `NNN` is the next sequential number (zero-padded to 3 digits).

Or use the scaffold command:

```bash
npm run migrate:create
```

### Step 2 — Create the SQL file (`migrations/NNN_description.sql`)

File naming: `NNN_snake_case_description.sql`

```sql
-- migrations/019_add_tags_table.sql

-- Create table
CREATE TABLE IF NOT EXISTS domain_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_domain_tags_user_id ON domain_tags(user_id);

-- For adding a column to existing table:
-- ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- For adding index to existing table:
-- CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);
```

### Step 3 — Update Drizzle Schema (`src/shared/database/schema.ts`)

Add the new table or column definition. This is the **single source of truth** — it must reflect the DB after migration.

```typescript
export const domainTags = pgTable('domain_tags', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Step 4 — Run the migration

```bash
npm run migrate
```

Verify it ran:

```bash
# Check migration status
npx tsx scripts/migration-status.ts
```

### Step 5 — If rollback is needed

```bash
npm run migrate:rollback
```

## SQL Conventions

| Convention   | Rule                                                           |
| ------------ | -------------------------------------------------------------- |
| Table names  | `snake_case`, plural (`domain_tags`, `wallet_wallets`)         |
| Column names | `snake_case` (`user_id`, `created_at`)                         |
| Primary keys | `UUID DEFAULT uuid_generate_v7()`                              |
| Timestamps   | Always `TIMESTAMPTZ NOT NULL DEFAULT NOW()`                    |
| Soft-delete? | Use `deleted_at TIMESTAMPTZ` column                            |
| Nullable     | Omit `NOT NULL` for optional columns                           |
| Indexes      | Prefix with `idx_tablename_column`                             |
| Constraints  | Prefix with `uq_` (unique), `fk_` (foreign key), `ck_` (check) |

## Rules

- **Never modify existing migration files** — only add new sequential files
- **Always use `IF NOT EXISTS` / `IF EXISTS`** for idempotency
- **Always update `schema.ts` to match** after migration is confirmed
- **Document non-obvious changes** with a comment in the SQL file
- See `docs/MIGRATIONS_GUIDE.md` for rollback procedures and advanced patterns
