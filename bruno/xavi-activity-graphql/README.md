# Xavi Activity GraphQL (Bruno)

Colección importable para probar actividades, categorías y follow-ups.

**Endpoint:** `POST {{baseUrl}}/graphql`  
**Auth:** `Authorization: Bearer {{token}}`

## Contenido

- **queries/** — `Activities`, `Activity`, `ActivityCategories`, `ActivityFollowUps`, `ActivityDayFollowUps`
- **mutations/** — CRUD actividad, categorías, follow-ups

## Colección monorepo (recomendada en Bruno 3.3)

Usa **`bruno/xavi-api`** (OpenCollection). Las peticiones GraphQL van con `body.type: json` y payload `{ "query", "variables" }` porque Bruno **no envía body** si usas `http` + `body.type: graphql` en YAML.

```bash
node scripts/generate-bruno-collection.mjs
```

Salida: `../bruno/xavi-api/graphql/Activities/` (18 requests). Ambiente **production**: `https://xavi-api-2772744525.us-central1.run.app`
