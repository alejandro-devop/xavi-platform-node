# AI_CONTEXT — Xavi Platform Node.js API

> Pega este archivo completo al inicio de cualquier prompt. Con él, una IA no necesita explorar el proyecto para entender su estructura.

---

## 1. ¿Qué es este proyecto?

**xavi-api** — API personal de productividad y finanzas personales.  
Migración de un sistema Laravel/PHP hacia Node.js/TypeScript desplegado en **Google Cloud Run**.

- **Runtime**: Node.js ≥18 · TypeScript 5.3 · ES2022 / CommonJS
- **Frameworks**: Express 4 + Apollo Server 5 (GraphQL)
- **Base de datos**: PostgreSQL 17 vía `pg` + **Drizzle ORM**
- **Cache**: Redis 7 vía `ioredis`
- **Auth**: JWT (`jsonwebtoken`) + bcryptjs
- **Validación**: Zod
- **Logging**: Pino + pino-pretty
- **Tests**: Jest + ts-jest (umbral 70%)
- **Despliegue**: Docker + Google Cloud Run · puerto **8080**

---

## 2. Estructura de directorios

```
src/
├── app.ts                   # Crea la app Express (middleware, rutas)
├── server.ts                # Punto de entrada, inicia HTTP + Apollo + DB + Redis
├── controllers/             # Controladores REST (uno por dominio)
│   ├── auth.controller.ts
│   ├── activity.controller.ts
│   ├── course.controller.ts
│   ├── habit.controller.ts
│   ├── learning.controller.ts
│   ├── routine.controller.ts
│   ├── shopping.controller.ts
│   ├── sleep.controller.ts
│   ├── todo.controller.ts
│   └── wallet.controller.ts
├── routes/                  # Rutas Express (una por dominio)
│   ├── index.ts             # Agrega todas las rutas bajo /api
│   ├── auth.ts, activity.ts, course.ts, docs.ts
│   ├── habit.ts, health.ts, learning.ts, routine.ts
│   ├── shopping.ts, sleep.ts, todo.ts, wallet.ts
├── services/                # Lógica de negocio (wallet, gastos, shopping, …)
│   ├── wallet.service.ts
│   ├── expense.service.ts
│   ├── expense-category.service.ts
│   ├── scheduled-expense.service.ts
│   └── shopping.service.ts
├── graphql/                 # Capa GraphQL completa
│   ├── server.ts            # Crea ApolloServer, context
│   ├── schema.ts            # Combina todos los typeDefs
│   ├── resolvers.ts         # Combina todos los resolvers
│   ├── modules/             # Módulos GraphQL (schema + resolvers por dominio)
│   │   ├── common/          # health, scalars
│   │   ├── wallet/
│   │   ├── expense/
│   │   ├── expense-category/
│   │   ├── scheduled-expense/
│   │   ├── budget/
│   │   ├── frequency/
│   │   ├── period/
│   │   └── shopping/
│   └── utils/
│       ├── error-handler.ts
│       └── validation.ts
├── shared/
│   ├── config/index.ts      # initializeServices() — arranca DB y Redis
│   ├── database/
│   │   ├── drizzle.ts       # getDb() — instancia Drizzle
│   │   ├── pool.ts          # Pool pg, closeDbPool()
│   │   ├── schema.ts        # *** FUENTE ÚNICA DE VERDAD del schema DB ***
│   │   └── uuid.ts          # generateUUIDv7()
│   ├── errors/
│   │   └── index.ts         # NotFoundError, ForbiddenError, BadRequestError, etc.
│   ├── logger/index.ts      # logger (Pino)
│   ├── middleware/
│   │   ├── auth.ts          # JWT middleware: autenticateToken
│   │   ├── error-handler.ts # Express error handler global
│   │   ├── request-logger.ts
│   │   └── validate.ts      # Zod validate middleware
│   ├── redis/client.ts      # getRedisClient(), closeRedisClient()
│   └── utils/
│       ├── async-handler.ts   # asyncHandler() wrapper
│       ├── balance-strategies.ts  # Estrategias de balance de wallet
│       ├── custom-validators.ts   # Validadores Zod personalizados
│       ├── db-validators.ts       # checkRecordExists()
│       ├── jwt.ts                 # signToken(), verifyToken()
│       ├── otp.ts
│       ├── password.ts            # hashPassword(), comparePassword()
│       ├── recurrence.service.ts  # Lógica de recurrencia de gastos
│       └── response.ts            # successResponse(), errorResponse()
├── types/
│   └── services/            # Tipos TypeScript para servicios
│       ├── wallet.types.ts
│       ├── expense.types.ts
│       ├── expense-category.types.ts
│       └── scheduled-expense.types.ts
└── validators/              # Schemas Zod por dominio REST
    ├── auth.validator.ts, activity.validator.ts, ...
    └── schemas/             # Schemas Zod para módulo wallet/finanzas
        ├── wallet.schemas.ts
        ├── expense.schemas.ts
        ├── expense-category.schemas.ts
        ├── scheduled-expense.schemas.ts
        └── shopping.schemas.ts

tests/
├── setup.ts
├── helpers/mocks.ts
└── unit/
    ├── controllers/auth.controller.test.ts
    ├── graphql/
    │   ├── error-handler.test.ts
    │   ├── validation.test.ts
    │   └── resolvers/  (expense, expense-category, wallet)
    ├── middleware/auth.test.ts
    ├── services/  (expense, expense-category, wallet)
    ├── shared/    (balance-strategies, custom-validators, error-handler)
    └── validators/unique-name-validation.test.ts

migrations/   # Archivos SQL numerados (001…016)
scripts/      # tsx scripts: migrate.ts, rollback.ts, seed.ts, etc.
docs/         # Documentación técnica extensa
```

---

## 3. Dos APIs en paralelo

**Política:** las funcionalidades **nuevas** se implementan en **GraphQL** (`src/graphql/modules/` + servicios en `src/services/`). No se añaden rutas REST nuevas salvo decisión explícita; ver `AGENTS.md`.

### REST API — `/api/*`

Patrón: `routes/ → controllers/ → (services/ o DB directo)`

Dominios REST (legado / compatibles): `auth`, `activity`, `course`, `habit`, `learning`, `routine`, `shopping`, `sleep`, `todo`, `wallet`, `health`, `docs`

**Formato de respuesta estándar:**

```typescript
// Éxito
{ status: true, data: T, message: string, meta: { env: string } }

// Error
{ status: false, errors: string[], env: string }
```

### GraphQL API — `/graphql`

Apollo Server 5, integrado con Express vía `@as-integrations/express4`.  
GraphiQL IDE: `http://localhost:8080/graphiql` (solo en desarrollo).

**Módulos GraphQL** (cada uno tiene `*.schema.ts` + `*.resolvers.ts`):
| Módulo | Descripción |
|---|---|
| `common` | `health` query, custom scalars (DateTime, Decimal, UUID) |
| `wallet` | CRUD de wallets, transferencias, operaciones masivas |
| `expense` | Gastos individuales, filtros por fecha/categoría/wallet |
| `expense-category` | Categorías de ingreso/gasto, sistema y usuario |
| `scheduled-expense` | Gastos programados recurrentes |
| `budget` | Presupuestos por categoría y período |
| `frequency` | Catálogo de frecuencias (diario, semanal, etc.) |
| `period` | Períodos de presupuesto |

El GraphQL tiene **más funcionalidades que REST**, especialmente en el módulo wallet (auto-scheduling, pay/cancel, bulk operations, cálculo de streaks en habits).

---

## 4. Base de datos (Drizzle ORM)

- **Schema único**: `src/shared/database/schema.ts`
- **Dialect**: PostgreSQL
- **Config**: `drizzle.config.ts` → usa `DATABASE_URL`
- **IDs**: UUID v7 (`uuidv7` package + función PostgreSQL en `migrations/016_add_uuid_v7_function.sql`)
- **Migraciones**: SQL manual en `migrations/` → correr con `npm run migrate`

**Uso del cliente:**

```typescript
import { getDb } from '../shared/database/drizzle';
const db = getDb();
// db.query.walletWallets.findMany({ where: ... })
// db.insert(walletWallets).values(...).returning()
```

**Importar tablas del schema:**

```typescript
import {
  walletWallets,
  walletExpenses,
  walletExpenseCategories,
  walletBudgets,
  walletFrequencies,
  walletPeriods,
  walletScheduledExpenses,
} from '../shared/database/schema';
```

---

## 5. Autenticación

- JWT en header: `Authorization: Bearer <token>`
- Middleware: `src/shared/middleware/auth.ts` → `authenticateToken`
- Utilidades: `src/shared/utils/jwt.ts` (`signToken`, `verifyToken`)
- El contexto GraphQL recibe el `userId` del JWT (`src/graphql/server.ts` → `getGraphQLContext`)

**Endpoints REST de auth** (`POST /api/auth/`):

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- Recuperacion de contrasena via OTP implementada en `src/controllers/auth.controller.ts`

---

## 6. Patrones de código

### Servicios

```typescript
export const walletService = {
  async getWallets(userId: number): Promise<Wallet[]> {
    const db = getDb();
    return db.query.walletWallets.findMany({
      where: eq(walletWallets.userId, userId),
    });
  },
};
```

### Validación Zod en controllers

```typescript
import { validateRequest } from '../shared/middleware/validate';
import { createWalletSchema } from '../validators/schemas/wallet.schemas';
router.post('/', authenticateToken, validateRequest(createWalletSchema), createWallet);
```

### Errores de negocio

```typescript
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';
throw new NotFoundError('Wallet not found');
throw new ForbiddenError('No tienes permiso');
throw new BadRequestError('Nombre duplicado');
```

### Helper `checkRecordExists`

```typescript
import { checkRecordExists } from '../shared/utils/db-validators';
const record = await checkRecordExists({
  table: walletWallets,
  idValue: id,
  scopeField: walletWallets.userId,
  scopeValue: userId,
  notFoundMessage: 'Wallet not found',
  forbiddenMessage: 'Access denied',
});
```

### Respuestas REST

```typescript
import { successResponse, errorResponse } from '../shared/utils/response';
res.json(successResponse(data, 'Wallet created'));
```

### Resolvers GraphQL

```typescript
export const walletResolvers = {
  Query: {
    wallets: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const { userId } = context;
      return walletService.getWallets(userId);
    },
  },
  Mutation: {
    createWallet: async (
      _: unknown,
      { input }: { input: CreateWalletInput },
      context: GraphQLContext
    ) => {
      return walletService.createWallet(input, context.userId);
    },
  },
};
```

### Async handler REST

```typescript
import { asyncHandler } from '../shared/utils/async-handler';
export const getWallet = asyncHandler(async (req, res) => {
  const data = await walletService.getWalletById(req.params.id, req.user!.id);
  res.json(successResponse(data));
});
```

---

## 7. Tests

- **Framework**: Jest + ts-jest
- **Setup**: `tests/setup.ts` (mocks globales de DB y Redis)
- **Mocks helpers**: `tests/helpers/mocks.ts`
- **Cobertura mínima**: 70% (branches, functions, lines, statements)
- **Tests excluidos de cobertura**: `routes/`, `controllers/` (excepto auth), `server.ts`, `app.ts`
- **Path aliases en tests**: `@/` → `src/`, `@shared/` → `src/shared/`

Correr tests:

```bash
npm test                  # todos
npm run test:watch        # modo watch
npm run test:coverage     # con cobertura
```

---

## 8. Scripts de desarrollo

```bash
npm run dev               # tsx watch src/server.ts (hot reload)
npm run build             # tsc → dist/
npm run migrate           # tsx scripts/migrate.ts
npm run migrate:create    # crear nueva migración SQL
npm run migrate:rollback  # revertir migración
npm run seed              # tsx scripts/seed.ts
npm run docker:up         # docker compose up -d
npm run docker:logs       # logs en tiempo real
```

---

## 9. Variables de entorno requeridas

| Variable             | Descripción                   |
| -------------------- | ----------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string  |
| `REDIS_URL`          | Redis connection string       |
| `JWT_SECRET`         | Secreto para firmar JWT       |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens   |
| `PORT`               | Puerto HTTP (default: 8080)   |
| `NODE_ENV`           | `development` \| `production` |

---

## 10. Docker / Cloud Run

- `docker-compose.yml` levanta: **postgres:17**, **redis:7**, **adminer** (puerto 8081), **app** (puerto 8080)
- La app espera a que DB y Redis estén listos (healthchecks)
- Graceful shutdown en `SIGTERM` / `SIGINT`: cierra Apollo, HTTP server, DB pool, Redis
- En Cloud Run: variable `K_SERVICE` indica que está en ambiente gestionado

---

## 11. Alias de rutas TypeScript

```
@/         → src/
@shared/   → src/shared/
@routes/   → src/routes/
@controllers/ → src/controllers/
```

---

## 12. Convenciones importantes

1. **IDs son UUID v7** (no enteros autoincrement) en todos los modelos desde migración `013`.
2. **Nombres únicos por usuario**: validados a nivel de servicio con `BadRequestError`, no a nivel DB unique constraint.
3. **Balance de wallets**: lógica en `src/shared/utils/balance-strategies.ts` (Strategy Pattern).
4. **Recurrencia de gastos**: `src/shared/utils/recurrence.service.ts`.
5. **El schema de DB** es la fuente de verdad — nunca usar tablas literales, siempre importar desde `src/shared/database/schema.ts`.
6. **Zod primero**: toda entrada externa se valida con Zod antes de llegar al servicio.
7. **Sin ORM en migraciones**: las migraciones son SQL puro en `migrations/`.
8. **GraphQL context** siempre tiene `{ userId: number, req: Request }`.
