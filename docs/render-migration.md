# Migración de xavi-api: Cloud Run → Render

Runbook para levantar el servicio en Render **en paralelo** al de Cloud Run y
validarlo antes de mover el frontend. Nada de lo que hay aquí toca producción
hasta el paso de cutover.

## Estado actual (referencia)

| | Cloud Run |
|---|---|
| Recursos | 1 GB RAM / 2 CPU / `--cpu-boost` |
| Base | Neon vía `DATABASE_URL` |
| Migraciones | Cloud Run Job en CI, más el `ENTRYPOINT` en cada arranque |
| Redis | Inactivo (ver nota abajo) |
| Pipeline | `.github/workflows/deploy.yml` |

Free de Render es **512 MB / 0.1 CPU**, se duerme tras 15 min sin tráfico y
tarda ~1 min en despertar.

## Ensayo local con los límites del free tier

Se corrió la imagen de producción con `--memory=512m --cpus=0.1` contra una
Postgres desechable, con las mismas variables que usará Render. Resultados:

| Medición | Resultado |
|---|---|
| Arranque hasta primer `200` | **32 s** |
| Memoria en reposo | **77 MB de 512 MB (15 %)** |
| `/api/health` | ~3 ms |
| `/api/ready` (toca BD) | 5–120 ms |
| GraphQL `{ __typename }` | 5–380 ms (el primero paga el JIT) |
| Introspección completa del schema | 88 ms |

Lectura: **la memoria no es problema** — sobra más del 80 %. El 0.1 CPU pesa en
el arranque, no en el throughput: una vez caliente, el servicio es I/O-bound
contra Postgres y responde bien.

Dos salvedades sobre estos números:
- La Postgres del ensayo estaba en la misma red Docker, con latencia ~0. Contra
  Neon por internet hay que sumar la latencia real de red.
- 0.1 CPU en Docker Desktop sobre este Mac no es idéntico al 0.1 CPU de Render;
  es una aproximación razonable, no una medición de su hardware.

## Nota sobre Redis

Hoy Redis está muerto en producción: `src/shared/redis/client.ts` lee
`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`, pero el deploy inyecta `REDIS_URL`,
y `ENABLE_REDIS_CACHE` no se setea en Cloud Run. Todos los guards
`=== 'true'` dan false y el auth cae siempre a la base.

Por eso el blueprint lo deja explícitamente apagado. No hay nada que migrar.
Si más adelante se quiere el caché, primero hay que arreglar ese desajuste.

---

## Paso 1 — Branch de Neon para pruebas

**No apuntes el servicio de prueba a la base de producción.** Neon tiene
branching justo para esto: crea una branch desde `main`, y obtienes un
`DATABASE_URL` independiente con una copia de los datos.

Sin esto, dos riesgos reales:
- Correr migraciones desde el entorno de prueba altera el esquema que está
  sirviendo Cloud Run en vivo.
- Cualquier escritura de prueba entra a tus datos reales.

Guarda el connection string de la branch — es el `DATABASE_URL` del paso 3.

## Paso 2 — Aplicar migraciones a la branch

El blueprint arranca con `RUN_MIGRATIONS=false`, así que el contenedor **no**
migra al levantar. Se hace una vez desde local, contra la branch:

```bash
cd /Users/jako/Developer/xavi-platform/xavi-platform-node
DATABASE_URL='<connection-string-de-la-branch-neon>' NODE_ENV=production npm run migrate
```

`NODE_ENV=production` es necesario: `scripts/migrate.ts` sólo activa SSL en ese
caso, y Neon lo exige.

Si la branch se creó desde `main`, ya viene con el esquema al día y esto no
debería aplicar nada. Que salga vacío es señal de que todo está bien.

## Paso 3 — Crear el servicio en Render

Esto es tuyo: requiere tu cuenta y pegar secretos, y yo no manejo credenciales.

1. En Render: **New → Blueprint**, conecta el repo `xavi-platform-node`.
2. Render detecta `render.yaml` y propone el servicio `xavi-api`.
3. **Antes de aplicar, confirma la región.** El blueprint trae `ohio` como
   apuesta a que tu Neon está en `us-east-2`. Si vive en otra región, cámbiala:
   una región mal elegida mete latencia en cada query.
4. Render pedirá los valores marcados `sync: false`:

   | Variable | De dónde sale |
   |---|---|
   | `DATABASE_URL` | La branch de Neon del paso 1 |
   | `JWT_ACCESS_SECRET` | Secret Manager de GCP (`jwt-secret`) |
   | `JWT_REFRESH_SECRET` | Secret Manager de GCP (`jwt-secret`) |
   | `CLAUDE_API_KEY` | Secret Manager de GCP (`claude-api-key`) |
   | `EMAIL_API_KEY` | Secrets de GitHub Actions (`EMAIL_API_KEY`) |

   Ojo: en Cloud Run `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` apuntan **al
   mismo** secreto `jwt-secret`. Replícalo igual, o los tokens ya emitidos
   dejarán de validar.

5. Aplica. El primer build tarda: compila la imagen completa.

## Paso 4 — Humo, sin tocar el frontend

Con la URL que te dé Render (`https://xavi-api-XXXX.onrender.com`):

Ojo con el prefijo: las rutas se montan bajo `/api` (`app.use('/api', routes)`
en `src/app.ts`). `/health` a secas da 404.

```bash
curl -i https://<tu-servicio>.onrender.com/api/health
```

Espera `200` y `{"status":true,"data":{"status":"healthy"}}`. Recuerda que la
primera petición tras inactividad puede tardar ~1 min mientras despierta el
contenedor.

```bash
curl -i https://<tu-servicio>.onrender.com/api/ready
```

Este sí toca la base: un `200` confirma que Neon responde desde Render. Un
`503` significa que el `DATABASE_URL` o la región están mal.

GraphQL sin auth, debe responder el schema:

```bash
curl -s -X POST https://<tu-servicio>.onrender.com/graphql -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}'
```

## Paso 5 — Probar con el frontend local

Aquí se valida de verdad, sin mover producción. No hace falta tocar CORS:
`src/shared/config/cors.ts` ya permite `localhost:5173` en su lista built-in.

En el repo del frontend, crea `.env.local`:

```
VITE_API_URL=https://<tu-servicio>.onrender.com
```

Y levanta el front local. Ese `.env.local` sobreescribe `.env` y **no afecta a
Vercel**. Prueba el flujo completo: login, Mi Día, registrar un follow-up.

Cosas a mirar con atención en esta fase:
- Latencia por query, que es donde se va a notar el 0.1 CPU.
- El login: si falla, casi seguro son los JWT secrets del paso 3.
- La extracción de gastos desde imagen (`expense-extraction.service.ts`), que
  es lo más pesado y lo que más riesgo tiene de chocar con algún límite de
  duración de request de Render. **Ese límite no está documentado en su doc de
  web services y sigue sin confirmar** — esta prueba es la forma de saberlo.

## Paso 6 — Cutover (sólo cuando el paso 5 esté limpio)

1. Apunta `DATABASE_URL` del servicio de Render a la base real de Neon.
2. Cambia `VITE_API_URL` en Vercel a la URL de Render y redeploya los fronts.
   CORS no necesita cambios: ambos dominios de Vercel ya están en la built-in.
3. Deja Cloud Run corriendo unos días como rollback.
4. Cuando estés seguro: retira `.github/workflows/deploy.yml` y baja el
   servicio de Cloud Run.

**Rollback**: revertir `VITE_API_URL` a la URL de Cloud Run y redeployar. Por
eso el paso 3 no apaga nada.

---

## Cambios que trajo esta migración al repo

- `render.yaml` — blueprint del servicio.
- `scripts/docker-entrypoint.sh`:
  - `RUN_MIGRATIONS` (default `true`, comportamiento igual que antes) permite
    saltar espera de BD y migraciones al arrancar.
  - La espera de BD ahora está acotada por `DB_WAIT_RETRIES` (default 30, ~60 s)
    y aborta con exit 1. Antes el loop era infinito: un `DATABASE_URL` malo
    dejaba el contenedor colgado sin error visible. **Esto también aplica a
    Cloud Run**, que pasa de esperar para siempre a fallar de forma visible.

## Verificado localmente

- La imagen construye (`docker build`).
- Las 66 migraciones aplican limpio ejecutando `npm run migrate` desde la imagen.
- El contenedor arranca con `PORT` inyectado y `RUN_MIGRATIONS=false`, dentro de
  512 MB y 0.1 CPU.
- `/api/health` y `/api/ready` responden 200; `/graphql` responde.
- `RUN_MIGRATIONS=false` salta migraciones; con BD inalcanzable el entrypoint
  aborta con exit 1 en vez de colgarse.

## Pendientes conocidos

- El límite de duración de request de Render sigue sin confirmar.
- El Dockerfile usa `node:18-alpine`; Node 18 ya está fuera de soporte. No
  bloquea la migración, pero conviene subirlo.
- Precios de Starter/Standard sin verificar contra la página de precios de
  Render.
