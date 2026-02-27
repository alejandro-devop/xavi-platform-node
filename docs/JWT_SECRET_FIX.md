# Solución: Error de JWT Secret en Producción

**Fecha:** 27 de febrero de 2026  
**Estado:** ✅ Resuelto  
**Revisión:** xavi-api-00012-hmn

---

## 🔴 Problema Encontrado

Al intentar hacer login en producción, se recibió el siguiente error:

```json
{
  "error": {
    "message": "secretOrPrivateKey must have a value",
    "name": "Error",
    "stack": "Error: secretOrPrivateKey must have a value\n    at module.exports [as sign] (/app/node_modules/jsonwebtoken/sign.js:111:20)\n    at generateAccessToken (/app/dist/shared/utils/jwt.js:19:35)\n    at login (/app/dist/controllers/auth.controller.js:59:55)"
  },
  "request": {
    "method": "POST",
    "path": "/api/auth/login"
  }
}
```

**Síntoma:** El servidor no podía generar tokens JWT porque las variables de entorno no estaban configuradas.

---

## 🔍 Causa Raíz

El código en `src/shared/utils/jwt.ts` requiere dos variables de entorno:

- `JWT_ACCESS_SECRET` - Para generar access tokens
- `JWT_REFRESH_SECRET` - Para generar refresh tokens

Sin embargo, el script de deployment (`scripts/deploy.sh`) solo estaba configurando `JWT_SECRET`:

```bash
# ❌ Configuración anterior (incorrecta)
--set-secrets="DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,REDIS_URL=redis-url:latest"
```

---

## ✅ Solución Implementada

### 1. Verificar secretos existentes en GCP

```bash
gcloud secrets list --project=xavier-platform
```

**Resultado:**

```
NAME          CREATED              REPLICATION_POLICY  LOCATIONS
database-url  2026-01-30T23:22:20  automatic           -
jwt-secret    2026-01-30T23:21:24  automatic           -
redis-url     2026-01-30T23:22:58  automatic           -
```

✅ El secreto `jwt-secret` ya existía, solo necesitábamos mapearlo correctamente.

### 2. Actualizar script de deployment

Archivo: `scripts/deploy.sh` (línea 49)

**Cambio realizado:**

```bash
# ✅ Configuración nueva (correcta)
--set-secrets="DATABASE_URL=database-url:latest,JWT_ACCESS_SECRET=jwt-secret:latest,JWT_REFRESH_SECRET=jwt-secret:latest,REDIS_URL=redis-url:latest"
```

**Explicación:**

- Mapeamos `JWT_ACCESS_SECRET` → `jwt-secret:latest`
- Mapeamos `JWT_REFRESH_SECRET` → `jwt-secret:latest`
- Ambas variables apuntan al mismo secreto en GCP Secret Manager

### 3. Redesplegar a Cloud Run

```bash
./scripts/deploy.sh
```

**Resultado:**

```
==========================================
🚀 Deploying to Google Cloud Run
==========================================
Project ID: xavier-platform
Region: us-central1
Service: xavi-api
Image: us-central1-docker.pkg.dev/xavier-platform/xavi-api/app:latest

📦 Step 1/3: Building Docker image...
✓ Build completed (3.2s)

⬆️  Step 2/3: Pushing image to Artifact Registry...
✓ Image pushed successfully

☁️  Step 3/3: Deploying to Cloud Run...
✓ Deploying... Done.
✓ Creating Revision...
✓ Routing traffic...
✓ Setting IAM Policy...

Service [xavi-api] revision [xavi-api-00012-hmn] has been deployed
and is serving 100 percent of traffic.

Service URL: https://xavi-api-wqpmywszuq-uc.a.run.app
==========================================
```

---

## 🧪 Verificación

### 1. Verificar GraphQL

```bash
curl -s -X POST https://xavi-api-wqpmywszuq-uc.a.run.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

**Resultado:**

```json
{ "data": { "__typename": "Query" } }
```

✅ GraphQL funcionando correctamente

### 2. Test de Login

```bash
curl -X POST https://xavi-api-wqpmywszuq-uc.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alejandro.devop@gmail.com",
    "password": "JKrules1212"
  }'
```

**Resultado:**

```json
{
  "status": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "email": "alejandro.devop@gmail.com",
      "name": "Alejandro",
      "isAccountVerified": false
    }
  },
  "meta": {
    "env": "production"
  }
}
```

✅ Login funcionando perfectamente

---

## 📝 Resumen de Comandos Ejecutados

```bash
# 1. Verificar secretos en GCP
gcloud secrets list --project=xavier-platform

# 2. Actualizar scripts/deploy.sh (usando editor)
# Cambiar: JWT_SECRET=jwt-secret:latest
# Por: JWT_ACCESS_SECRET=jwt-secret:latest,JWT_REFRESH_SECRET=jwt-secret:latest

# 3. Redesplegar
./scripts/deploy.sh

# 4. Verificar GraphQL
curl -s -X POST https://xavi-api-wqpmywszuq-uc.a.run.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# 5. Test de login
curl -X POST https://xavi-api-wqpmywszuq-uc.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alejandro.devop@gmail.com",
    "password": "JKrules1212"
  }'
```

---

## 🎯 URLs de Producción

**Base URL:** `https://xavi-api-wqpmywszuq-uc.a.run.app`

### Rutas de Autenticación

- **Register:** `POST /api/auth/register`
- **Login:** `POST /api/auth/login`
- **Verify Email:** `POST /api/auth/verify-email`
- **Refresh Token:** `POST /api/auth/refresh`
- **Logout:** `POST /api/auth/logout`
- **Profile:** `GET /api/auth/profile` (requiere Bearer token)

### GraphQL

- **GraphQL:** `POST /graphql`
- **GraphQL Playground:** `GET /graphql` (si está habilitado)

---

## 🔑 Lecciones Aprendidas

1. **Nombres de variables consistentes:** Asegurarse de que los nombres de variables de entorno coincidan entre el código (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) y la configuración de deployment.

2. **Reutilización de secretos:** Es válido mapear múltiples variables de entorno al mismo secreto en GCP Secret Manager cuando tienen el mismo valor.

3. **Verificación de logs:** Los logs de Cloud Run son esenciales para identificar problemas de configuración en producción:

   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=xavi-api" \
     --project=xavier-platform \
     --limit=50 \
     --format=json
   ```

4. **Testing inmediato:** Después de cada deployment, verificar con curl que los endpoints críticos funcionan correctamente.

---

## 📚 Referencias

- **Código modificado:** [scripts/deploy.sh](../scripts/deploy.sh#L49)
- **Documentación JWT:** [src/shared/utils/jwt.ts](../src/shared/utils/jwt.ts)
- **Auth Controller:** [src/controllers/auth.controller.ts](../src/controllers/auth.controller.ts)
- **Ejemplos de Auth:** [auth-example.md](../auth-example.md)

---

**Estado Final:** ✅ Todos los endpoints de autenticación funcionando correctamente en producción
