# Guía para agentes (Cursor / automatización)

## API nueva: usar GraphQL, no REST

- **No añadas rutas Express nuevas** (`src/routes/*.ts`, `src/controllers/*`) para funcionalidad nueva salvo corrección de bugs o requisito explícito del equipo.
- **Implementa dominios nuevos en GraphQL**: `src/graphql/modules/<dominio>/` (schema `.schema.ts` + `*.resolvers.ts`), registra en `src/graphql/schema.ts` y `src/graphql/resolvers.ts`.
- Coloca la lógica de negocio reutilizable en **`src/services/`** (pool SQL o Drizzle según el dominio) y llámala desde los resolvers GraphQL; el REST legado puede delegar en el mismo servicio hasta que se retire.
- Valida argumentos de GraphQL con Zod en **`src/validators/schemas/`** y `withValidatedResolver` / `withAsyncValidatedResolver` como en wallet / expense.

## Shopping / listas de compra

- Esquema SDL y resolvers: `src/graphql/modules/shopping/`.
- Servicio compartido: `src/services/shopping.service.ts`.
- Documentación de operaciones para clientes (Bruno, etc.): `docs/graphql/shopping-bruno.md`.
- **Colección Bruno importable:** `bruno/xavi-shopping-graphql/`.

## Habit tracker

- Esquema SDL y resolvers: `src/graphql/modules/habit/`.
- Servicios: `src/services/habit.service.ts`, `habit-category.service.ts`, `habit-measure.service.ts`, `habit-streak.ts`.
- Migración Fase 2: `migrations/024_habit_legacy_phase2.sql`.
- Documentación: `docs/graphql/habit-bruno.md`.
- **Colección Bruno importable:** `bruno/xavi-habit-graphql/`.

## Routines

- Esquema SDL y resolvers: `src/graphql/modules/routine/`.
- Servicio: `src/services/routine.service.ts`.
- Documentación: `docs/graphql/routine-bruno.md`.
- **Colección Bruno:** `bruno/xavi-routine-graphql/`.

## Activities

- Esquema SDL y resolvers: `src/graphql/modules/activity/`.
- Servicios: `src/services/activity.service.ts`, `activity-category.service.ts`, `activity-follow-up.service.ts`.
- Migración categorías + follow-ups: `migrations/025_activity_categories_and_followups.sql`.
- Documentación: `docs/graphql/activity-bruno.md`.
- **Colección Bruno:** `bruno/xavi-activity-graphql/`.

## Todos

- Esquema SDL y resolvers: `src/graphql/modules/todo/`.
- Servicio: `src/services/todo.service.ts`.
- Documentación: `docs/graphql/todo-bruno.md`.
- **Colección Bruno:** `bruno/xavi-todo-graphql/`.

## Sleep

- Esquema SDL y resolvers: `src/graphql/modules/sleep/`.
- Servicio: `src/services/sleep.service.ts`.
- Documentación: `docs/graphql/sleep-bruno.md`.
- **Colección Bruno:** `bruno/xavi-sleep-graphql/`.

## Learning

- Esquema SDL y resolvers: `src/graphql/modules/learning/`.
- Servicio: `src/services/learning.service.ts`.
- Documentación: `docs/graphql/learning-bruno.md`.
- **Colección Bruno:** `bruno/xavi-learning-graphql/`.

## Learning Notes (knowledge base)

- Esquema SDL y resolvers: `src/graphql/modules/learning-note/`.
- Servicio: `src/services/learning-note.service.ts`.
- Migración FTS: `migrations/056_create_learning_notes.sql`.
- Documentación: `docs/graphql/learning-note-bruno.md`.

## Courses

- Esquema SDL y resolvers: `src/graphql/modules/course/`.
- Servicio: `src/services/course.service.ts`.
- Documentación: `docs/graphql/course-bruno.md`.
- **Colección Bruno:** `bruno/xavi-course-graphql/`.

## Colección Bruno (monorepo)

- **Ruta:** `../bruno/xavi-api/` (desde este repo: `/Users/jako/Developer/xavi-platform/bruno/xavi-api`)
- Ambientes: `development`, `production` (`baseUrl`, `email`, `password`, `token`, `refreshToken`)
- Regenerar: `node scripts/generate-bruno-collection.mjs`

## Referencias

- Contexto del proyecto: `.cursor/rules/project-context.mdc`, `AI_CONTEXT.md`.
- Reglas de base de datos: `src/shared/database/schema.ts` y migraciones numeradas en `migrations/`.
