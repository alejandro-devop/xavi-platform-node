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

## Referencias

- Contexto del proyecto: `.cursor/rules/project-context.mdc`, `AI_CONTEXT.md`.
- Reglas de base de datos: `src/shared/database/schema.ts` y migraciones numeradas en `migrations/`.
