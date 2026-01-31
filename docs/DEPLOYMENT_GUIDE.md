# 🚀 Guía de Despliegue a Google Cloud Platform

## Prerrequisitos

- Cuenta de Google Cloud Platform activa
- `gcloud` CLI instalado ([Instalar aquí](https://cloud.google.com/sdk/docs/install))
- Proyecto de GCP creado
- Facturación habilitada en el proyecto

## Paso 1: Configuración Inicial de GCP

### 1.1 Autenticarse en gcloud

```bash
gcloud auth login
```

### 1.2 Configurar el proyecto

```bash
# Listar proyectos disponibles
gcloud projects list

# Establecer el proyecto activo (reemplaza PROJECT_ID con tu proyecto)
gcloud config set project PROJECT_ID

# Verificar configuración
gcloud config list
```

### 1.3 Habilitar APIs necesarias

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

**Nota:** No necesitamos `sqladmin` ni `redis` porque usaremos servicios externos (Neon + Upstash).

## Paso 2: Configurar Base de Datos con Neon (PostgreSQL Serverless)

### 2.1 Crear proyecto en Neon

1. Ve a [https://neon.tech](https://neon.tech)
2. Crea una cuenta (ya lo hiciste ✅)
3. Crea un nuevo proyecto:
   - **Name:** Xavier API
   - **Region:** AWS East 2 (Ohio) - seleccionado ✅
   - **Postgres version:** 15 (default)

### 2.2 Crear base de datos

1. En el dashboard de Neon, ve a la sección **Databases**
2. Click en **New Database**
3. Nombre: `xavi_db`
4. Click en **Create**

### 2.3 Obtener la Connection String

1. En el dashboard, ve a **Connection Details**
2. Copia la **Connection string** completa
3. Debería verse así:
   ```
   postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/xavi_db?sslmode=require
   ```
4. **Guarda esta URL** - la necesitarás en el Paso 4

## Paso 3: Configurar Redis con Upstash (Serverless)

### 3.1 Crear cuenta en Upstash

1. Ve a [https://upstash.com/](https://upstash.com/)
2. Crea una cuenta gratuita (GitHub/Google)
3. Verifica tu email

### 3.2 Crear Redis database

1. Click en **Create Database**
2. Configuración:
   - **Name:** xavi-redis
   - **Region:** AWS East 2 (us-east-2) - misma que Neon
   - **Type:** Regional (más barato)
3. Click en **Create**

### 3.3 Obtener la Connection String

1. En el dashboard del database creado
2. Copia el **UPSTASH_REDIS_REST_URL** (formato REST)
3. O usa **Redis URL** (formato: `redis://...`)
4. **Guarda esta URL** - la necesitarás en el Paso 4

## Paso 4: Configurar Secret Manager

### 4.1 Crear secretos

```bash
# JWT Secret (genera uno aleatorio seguro)
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret --data-file=-

# Database URL - usa la Connection String de Neon (Paso 2.3)
echo -n "postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/xavi_db?sslmode=require" | \
  gcloud secrets create database-url --data-file=-

# Redis URL - usa la URL de Upstash (Paso 3.3)
echo -n "redis://default:xxxxx@us2-xxxxx.upstash.io:6379" | \
  gcloud secrets create redis-url --data-file=-
```

**Importante:** Reemplaza las URLs con tus valores reales de Neon y Upstash.

### 4.2 Verificar secretos creados

```bash
gcloud secrets list
```

## Paso 5: Construir y Subir la Imagen Docker

### 5.1 Crear repositorio en Artifact Registry

```bash
gcloud artifacts repositories create xavi-api \
  --repository-format=docker \
  --location=us-central1 \
  --description="Xavier API Docker images"
```

### 5.2 Configurar Docker para usar Artifact Registry

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 5.3 Construir y subir la imagen

```bash
# Desde el directorio raíz del proyecto
# Reemplaza PROJECT_ID con tu proyecto

# Construir
docker build -t us-central1-docker.pkg.dev/PROJECT_ID/xavi-api/app:latest .

# Subir
docker push us-central1-docker.pkg.dev/PROJECT_ID/xavi-api/app:latest
```

## Paso 6: Desplegar a Cloud Run

### 6.1 Crear Service Account para Cloud Run

```bash
# Crear service account
gcloud iam service-accounts create xavi-api-sa \
  --display-name="Xavier API Service Account"

# Dar permisos para Secret Manager
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:xavi-api-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Nota:** No necesitamos permisos de Cloud SQL porque usamos Neon (externo).

### 6.2 Desplegar a Cloud Run

```bash
gcloud run deploy xavi-api \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/xavi-api/app:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --service-account=xavi-api-sa@PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets="DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,REDIS_URL=redis-url:latest" \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0
```

**Cambios vs Cloud SQL:**

- ❌ Removimos `--add-cloudsql-instances` (no se necesita)
- ✅ La app se conecta directamente a Neon vía internet

### 6.3 Obtener la URL del servicio

```bash
gcloud run services describe xavi-api \
  --platform=managed \
  --region=us-central1 \
  --format="value(status.url)"
```

## Paso 7: Ejecutar Migraciones en Producción

### 7.1 Ejecutar migraciones desde local

```bash
# Establecer la DATABASE_URL de Neon (desde el Paso 2.3)
export DATABASE_URL="postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/xavi_db?sslmode=require"

# Ejecutar migraciones
npm run migrate
```

**¡Mucho más simple!** No necesitas Cloud SQL Proxy - te conectas directamente a Neon.

### 7.2 Alternativa: Ejecutar migraciones desde Cloud Run Job (opcional)

```bash
# Crear un Cloud Run Job para migraciones
gcloud run jobs create xavi-migrate \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/xavi-api/app:latest \
  --region=us-central1 \
  --service-account=xavi-api-sa@PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --command="npm" \
  --args="run,migrate"

# Ejecutar el job
gcloud run jobs execute xavi-migrate --region=us-central1
```

## Paso 8: Verificar el Despliegue

### 8.1 Probar health check

```bash
# Reemplaza YOUR_CLOUD_RUN_URL con la URL obtenida
curl https://YOUR_CLOUD_RUN_URL/api/health
```

Deberías recibir:

```json
{
  "status": true,
  "data": {
    "status": "healthy"
  }
}
```

### 8.2 Ver documentación

```bash
# Abrir en navegador
open https://YOUR_CLOUD_RUN_URL/api/docs
```

### 8.3 Ver logs

```bash
gcloud run services logs read xavi-api \
  --platform=managed \
  --region=us-central1 \
  --limit=50
```

## Paso 9: Configurar Dominio Personalizado (Opcional)

### 9.1 Mapear dominio

```bash
# Si tienes un dominio verificado en Google
gcloud run domain-mappings create \
  --service=xavi-api \
  --domain=api.tudominio.com \
  --region=us-central1
```

### 9.2 Configurar DNS

Añade los registros DNS que te proporcione el comando anterior.

## Paso 10: Configurar CI/CD con GitHub Actions (Opcional)

Crear archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

env:
  PROJECT_ID: YOUR_PROJECT_ID
  SERVICE_NAME: xavi-api
  REGION: us-central1

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - id: 'auth'
        uses: 'google-github-actions/auth@v1'
        with:
          credentials_json: '${{ secrets.GCP_CREDENTIALS }}'

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Build and Push
        run: |
          gcloud builds submit --tag us-central1-docker.pkg.dev/$PROJECT_ID/xavi-api/app:$GITHUB_SHA

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy $SERVICE_NAME \
            --image us-central1-docker.pkg.dev/$PROJECT_ID/xavi-api/app:$GITHUB_SHA \
            --region $REGION \
            --platform managed
```

## Comandos Útiles

### Ver logs en tiempo real

```bash
gcloud run services logs tail xavi-api --region=us-central1
```

### Actualizar variables de entorno

```bash
gcloud run services update xavi-api \
  --region=us-central1 \
  --set-env-vars="NEW_VAR=value"
```

### Escalar instancias

```bash
gcloud run services update xavi-api \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=20
```

### Ver métricas

```bash
# Abrir en la consola
gcloud run services describe xavi-api \
  --region=us-central1 \
  --format="value(status.url)"
```

### Eliminar recursos (cleanup)

```bash
# Eliminar servicio de Cloud Run
gcloud run services delete xavi-api --region=us-central1

# Eliminar secretos
gcloud secrets delete jwt-secret
gcloud secrets delete database-url
gcloud secrets delete redis-url

# Eliminar repositorio de imágenes
gcloud artifacts repositories delete xavi-api --location=us-central1
```

**Recursos externos (desde sus consolas):**

- **Neon:** Eliminar proyecto desde [console.neon.tech](https://console.neon.tech)
- **Upstash:** Eliminar database desde [console.upstash.com](https://console.upstash.com)

## Costos Estimados (configuración serverless)

- **Cloud Run**: ~$0 (free tier: 2M requests + 360K GB-segundos/mes)
- **Neon PostgreSQL**: ~$0 (free tier: 0.5GB storage + compute on-demand)
- **Upstash Redis**: ~$0 (free tier: 10K requests/día)
- **Artifact Registry**: ~$0.50/mes (almacenamiento de imágenes)
- **Secret Manager**: ~$0.06 por 10K accesos

**Total estimado con free tiers**: ~$0-2/mes 🎉

**Cuando superes free tiers:**

- Neon: ~$19/mes (plan Launch)
- Upstash: ~$10/mes (plan Pay as you go)
- Cloud Run: $0.40 por millón de requests adicionales

**Total estimado en producción moderada**: ~$10-30/mes

## Troubleshooting

### Error: "Database connection failed"

- Verificar que la DATABASE_URL de Neon es correcta
- Verificar que incluye `?sslmode=require` al final
- Probar conexión desde local: `psql "$DATABASE_URL"`
- Verificar en Neon Console que el proyecto está activo

### Error: "Redis connection failed"

- Verificar la REDIS_URL de Upstash
- Verificar que el database está activo en Upstash Console
- Probar con `redis-cli -u "$REDIS_URL" PING`

### Error: "Secret not found"

- Verificar que los secretos existen: `gcloud secrets list`
- Verificar permisos del service account

### Error: "Out of memory"

- Aumentar memoria: `--memory=1Gi`
- Revisar logs para memory leaks

### Logs no aparecen

- Verificar que la app escribe a stdout/stderr
- Usar el logger de la app (Pino ya está configurado)

## Próximos Pasos

1. ✅ Configurar backups automáticos (Neon los hace automáticamente)
2. ✅ Configurar alertas de monitoreo en GCP
3. ✅ Implementar rate limiting con Upstash Redis
4. ✅ Configurar dominio personalizado
5. ✅ Implementar CI/CD con GitHub Actions

## Recursos Útiles

**Neon:**

- Dashboard: https://console.neon.tech
- Docs: https://neon.tech/docs
- Branching: https://neon.tech/docs/guides/branching

**Upstash:**

- Dashboard: https://console.upstash.com
- Docs: https://docs.upstash.com
- Rate limiting: https://docs.upstash.com/redis/features/ratelimiting

**Google Cloud:**

- Cloud Run docs: https://cloud.google.com/run/docs
- Logs: `gcloud run services logs read xavi-api`
- Estado de servicios: https://status.cloud.google.com/
