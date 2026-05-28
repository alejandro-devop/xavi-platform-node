# CLAUDE.md — xavi-platform-node

> Contexto esencial para Claude Code. Ver `AI_CONTEXT.md` para referencia técnica completa y `AGENTS.md` para rutas exactas por dominio.

## Qué es este proyecto

API personal de productividad y finanzas (xavi-api). Migración de Laravel/PHP a Node.js/TypeScript en Google Cloud Run. Dos APIs coexisten:

- **REST** `/api/*` — legado, no añadir rutas nuevas
- **GraphQL** `/graphql` — nueva funcionalidad aquí siempre

## Stack

Node.js ≥18 · TypeScript 5 · Express 4 · Apollo Server 5 · PostgreSQL 17 · Drizzle ORM · Redis · Zod · Jest · Docker

## Regla #1 — GraphQL primero

**Nunca añadas rutas Express nuevas** para funcionalidad nueva. Toda feature nueva va en:

```
src/graphql/modules/<dominio>/   ← schema.ts + resolvers.ts
src/services/<dominio>.service.ts ← lógica de negocio
src/types/services/<dominio>.types.ts
src/validators/schemas/<dominio>.schemas.ts
```

Registrar en `src/graphql/schema.ts` y `src/graphql/resolvers.ts`.

## Dominios activos

| Dominio | GraphQL module | Service(s) |
|---|---|---|
| wallet | `wallet/` | `wallet.service.ts` |
| expense | `expense/`, `expense-category/`, `scheduled-expense/` | `expense*.service.ts`, `scheduled-expense.service.ts` |
| budget | `budget/` | `budget.service.ts`, `budget-closure.service.ts` |
| shopping | `shopping/` | `shopping.service.ts` |
| habit | `habit/` | `habit.service.ts`, `habit-category.service.ts`, `habit-measure.service.ts`, `habit-streak.ts` |
| routine | `routine/` | `routine.service.ts` |
| activity | `activity/` | `activity.service.ts`, `activity-category.service.ts`, `activity-follow-up.service.ts` |
| todo | `todo/` | `todo.service.ts` |
| sleep | `sleep/` | `sleep.service.ts` |
| learning | `learning/` | `learning.service.ts` |
| course | `course/` | `course.service.ts` |

## Patrones obligatorios

### Servicio
```typescript
import { getDb } from '../shared/database/drizzle';
import { eq } from 'drizzle-orm';
import { myTable } from '../shared/database/schema';

export const myService = {
  async getItems(userId: string) {
    const db = getDb();
    return db.query.myTable.findMany({ where: eq(myTable.userId, userId) });
  },
};
```

### Resolver GraphQL
```typescript
export const myResolvers = {
  Query: {
    myItems: async (_: unknown, __: unknown, { userId }: GraphQLContext) =>
      myService.getItems(userId),
  },
};
```

### Errores
```typescript
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';
```

### Validación en resolvers
Usar `withValidatedResolver` / `withAsyncValidatedResolver` con schemas Zod en `src/validators/schemas/`.

### IDs
Siempre UUID v7: `import { generateUUIDv7 } from '../shared/database/uuid'`.

## Tests

- Framework: Jest + ts-jest
- Setup global: `tests/setup.ts` (mocks de DB y Redis ya configurados)
- Mocks helper: `tests/helpers/mocks.ts`
- Cobertura mínima: **70%** (branches, functions, lines, statements)
- Path aliases: `@/` → `src/`, `@shared/` → `src/shared/`
- Los controllers y routes **no** se incluyen en cobertura (excepto auth)
- Correr: `npm test` | `npm run test:coverage`

## Migraciones

SQL puro en `migrations/` (numeradas, actualmente hasta `025_`). Nunca Drizzle para migraciones.

```bash
npm run migrate:create   # genera archivo nuevo
npm run migrate          # aplica pendientes
```

## Dev

```bash
npm run dev        # hot reload
npm run docker:up  # levanta postgres + redis + adminer + app
```

GraphiQL disponible en `http://localhost:8080/graphiql` (solo development).

## Colecciones Bruno

Cada dominio tiene su colección en `bruno/xavi-<dominio>-graphql/`. Para regenerar todas:

```bash
node scripts/generate-bruno-collection.mjs
```

## Schema de DB

**Fuente única de verdad**: `src/shared/database/schema.ts`. Nunca strings literales de tabla — siempre importar desde ahí.
