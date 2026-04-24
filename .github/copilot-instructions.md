# Xavi Platform — Project Instructions

Personal productivity & personal finance API. Node.js/TypeScript migrated from Laravel, deployed on Google Cloud Run.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥18, TypeScript 5.3 (ES2022, CommonJS) |
| Web | Express 4 + Apollo Server 5 (GraphQL) |
| Database | PostgreSQL 17 via Drizzle ORM + pg pool |
| Cache | Redis 7 via ioredis |
| Validation | Zod 3 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Logging | Pino + pino-pretty |
| Tests | Jest 29 + ts-jest, threshold 70% |
| Deploy | Docker + Google Cloud Run, port 8080 |

## Directory Map

```
src/
├── app.ts                    # Express app setup (middleware, routes)
├── server.ts                 # Bootstrap: HTTP + Apollo + DB + Redis
├── controllers/              # REST controllers, one per domain
├── routes/                   # Express routes, one per domain
├── services/                 # Business logic (wallet domain only today)
├── graphql/
│   ├── server.ts             # ApolloServer + context
│   ├── schema.ts             # Merges all typeDefs
│   ├── resolvers.ts          # Merges all resolvers
│   ├── modules/              # Feature modules: *.schema.ts + *.resolvers.ts
│   └── utils/                # withErrorHandling, withValidatedResolver
├── shared/
│   ├── database/schema.ts    # *** Single source of truth for DB schema ***
│   ├── database/drizzle.ts   # getDb() singleton
│   ├── errors/index.ts       # AppError, NotFoundError, ForbiddenError, BadRequestError, ValidationError
│   ├── middleware/auth.ts    # authenticateToken (JWT → req.user)
│   ├── utils/response.ts     # successResponse(), errorResponse()
│   ├── utils/db-validators.ts# checkRecordExists()
│   ├── utils/async-handler.ts# asyncHandler() for Express
│   └── utils/custom-validators.ts # Custom Zod validators (unique names, etc.)
├── types/services/           # TypeScript interfaces for service inputs/outputs
└── validators/
    ├── *.validator.ts        # Zod schemas for REST (body/params wrapped)
    └── schemas/              # Zod schemas for GraphQL (flat objects)
tests/
├── helpers/mocks.ts          # mockDb, createMockWallet(), createMockCategory(), resetAllMocks()
└── unit/                     # Mirrors src/ structure
migrations/                   # Sequential SQL files: 001_…sql, 002_…sql
```

## Naming Conventions

| Target | Convention | Example |
|---|---|---|
| Files | kebab-case | `expense-category.service.ts` |
| Classes | PascalCase | `WalletService`, `NotFoundError` |
| Functions/variables | camelCase | `getWalletById`, `userId` |
| DB columns | snake_case | `user_id`, `is_main`, `created_at` |
| GraphQL types | PascalCase | `Wallet`, `ExpenseCategory` |
| GraphQL operations | camelCase | `walletAdd`, `expenseCategoryRemove` |
| Service exports | camelCase singleton | `export const walletService = { ... }` |

## Key Patterns (apply everywhere)

### Error Classes
Always import from `@shared/errors`:
```typescript
throw new NotFoundError('Wallet not found');
throw new ForbiddenError('Access denied');
throw new BadRequestError('Invalid input');
```

### REST Response Format
```typescript
// Success: { status: true, data: T, message: string, meta: { env: string } }
res.json(successResponse(data, 'Wallet created'));
// Error: { status: false, errors: string[], env: string }
```

### Path Aliases
- `@/` → `src/`
- `@shared/` → `src/shared/`

## Critical Gotchas

- **Drizzle DECIMAL fields return strings** — always convert: `parseFloat(wallet.balance)`
- **UUIDs are v7** (time-sortable) — generated via `generateUuidV7()` from `@shared/database/uuid`
- **Budget balance = available funds** — decreases on expense, increases on credit/reversal
- **GraphQL nullable inputs**: Zod use `.nullable().optional()` when both `null` and `undefined` are valid
- **DB schema is the only schema** — never define table shapes elsewhere, always import from `@shared/database/schema`

## Build & Test Commands

```bash
npm run dev              # Hot reload dev server
npm run build            # tsc → dist/
npm test                 # All tests
npm run test:coverage    # With coverage report
npm run migrate          # Run pending migrations
npm run migrate:create   # Scaffold new SQL migration
```

## Docs
- `docs/` — Extended technical documentation
- `AI_CONTEXT.md` — Legacy context file (superseded by these instructions)
- See `docs/VALIDATION_GUIDE.md`, `docs/ERROR_HANDLING.md`, `docs/MIGRATIONS_GUIDE.md` for details
