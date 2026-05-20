# Xavi Habit GraphQL — Colección Bruno

Colección **OpenCollection YAML** para Bruno **3.0+**.

## Importar

1. Abre Bruno → **Import Collection**.
2. Selecciona **esta carpeta** (`bruno/xavi-habit-graphql/`), no uses Import OpenAPI.
3. Configura la variable de colección `token` con un JWT válido (`Authorization: Bearer …`).

## Requisitos

- API en marcha (`npm run dev` o Docker en puerto 8080).
- Migración aplicada: `npm run migrate` (incluye `024_habit_legacy_phase2.sql`).
- Usuario autenticado (mismo flujo JWT que el resto de la API).

## Variables

| Variable   | Default                 | Uso                          |
|------------|-------------------------|------------------------------|
| `baseUrl`  | `http://localhost:8080` | Host de la API               |
| `token`    | (vacío)                 | Access token JWT sin prefijo |

## Documentación

Operaciones y fragmentos: [`docs/graphql/habit-bruno.md`](../../docs/graphql/habit-bruno.md).
