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
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Paso 2: Crear Cloud SQL (PostgreSQL)

### 2.1 Crear instancia de PostgreSQL

```bash
# Crear instancia (esto toma ~10 minutos)
gcloud sql instances create xavi-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=CHANGE_THIS_PASSWORD \
  --storage-type=SSD \
  --storage-size=10GB

# Verificar que se creó
gcloud sql instances list
```

### 2.2 Crear base de datos

```bash
gcloud sql databases create xavi_db \
  --instance=xavi-postgres
```

### 2.3 Obtener el connection name

```bash
# Guardar este valor, lo necesitarás más adelante
gcloud sql instances describe xavi-postgres \
  --format="value(connectionName)"
```

Resultado será algo como: `PROJECT_ID:us-central1:xavi-postgres`

## Paso 3: Configurar Redis (Opción A - Memorystore o Opción B - Upstash)

### Opción A: Google Cloud Memorystore (Recomendado para producción)

```bash
# Crear instancia de Redis
gcloud redis instances create xavi-redis \
  --size=1 \
  --region=us-central1 \
  --tier=basic

# Obtener la IP del Redis
gcloud redis instances describe xavi-redis \
  --region=us-central1 \
  --format="value(host)"
```

### Opción B: Upstash (Más económico, serverless)

1. Ir a [https://upstash.com/](https://upstash.com/)
2. Crear cuenta gratuita
3. Crear Redis database
4. Copiar la URL de conexión (formato: `redis://...`)

## Paso 4: Configurar Secret Manager

### 4.1 Crear secretos

```bash
# JWT Secret (genera uno aleatorio)
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret --data-file=-

# Database URL (reemplaza con tus valores)
echo -n "postgresql://postgres:YOUR_PASSWORD@/xavi_db?host=/cloudsql/PROJECT_ID:us-central1:xavi-postgres" | \
  gcloud secrets create database-url --data-file=-

# Redis URL
# Si usas Memorystore:
echo -n "redis://REDIS_IP:6379" | \
  gcloud secrets create redis-url --data-file=-

# Si usas Upstash:
echo -n "YOUR_UPSTASH_REDIS_URL" | \
  gcloud secrets create redis-url --data-file=-
```

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

# Dar permisos para Cloud SQL
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:xavi-api-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Dar permisos para Secret Manager
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:xavi-api-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 6.2 Desplegar a Cloud Run

```bash
gcloud run deploy xavi-api \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/xavi-api/app:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --service-account=xavi-api-sa@PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances=PROJECT_ID:us-central1:xavi-postgres \
  --set-secrets="DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,REDIS_URL=redis-url:latest" \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0
```

### 6.3 Obtener la URL del servicio

```bash
gcloud run services describe xavi-api \
  --platform=managed \
  --region=us-central1 \
  --format="value(status.url)"
```

## Paso 7: Ejecutar Migraciones en Producción

### 7.1 Conectarse a Cloud SQL vía Cloud SQL Proxy (local)

```bash
# Descargar Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Ejecutar proxy en una terminal
./cloud-sql-proxy PROJECT_ID:us-central1:xavi-postgres
```

### 7.2 En otra terminal, ejecutar migraciones

```bash
# Establecer variables de entorno
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/xavi_db"

# Ejecutar migraciones
npm run migrate
```

### Alternativa: Ejecutar migraciones desde Cloud Run

```bash
# Crear un Cloud Run Job para migraciones
gcloud run jobs create xavi-migrate \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/xavi-api/app:latest \
  --region=us-central1 \
  --service-account=xavi-api-sa@PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances=PROJECT_ID:us-central1:xavi-postgres \
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
# Eliminar servicio
gcloud run services delete xavi-api --region=us-central1

# Eliminar Cloud SQL
gcloud sql instances delete xavi-postgres

# Eliminar Redis
gcloud redis instances delete xavi-redis --region=us-central1

# Eliminar secretos
gcloud secrets delete jwt-secret
gcloud secrets delete database-url
gcloud secrets delete redis-url
```

## Costos Estimados (región us-central1)

- **Cloud Run**: ~$0 (free tier cubre hasta 2M requests/mes)
- **Cloud SQL (db-f1-micro)**: ~$8-15/mes
- **Redis Memorystore (basic 1GB)**: ~$35/mes
- **Redis Upstash (free tier)**: $0 hasta 10K requests/día
- **Artifact Registry**: $0.10/GB/mes
- **Secret Manager**: $0.06 por 10K accesos

**Total estimado**: $15-50/mes (dependiendo de Redis)

## Troubleshooting

### Error: "Cloud SQL connection failed"

- Verificar que el service account tiene rol `roles/cloudsql.client`
- Verificar que la instancia de Cloud SQL está en running
- Verificar el connection name en la DATABASE_URL

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

1. ✅ Configurar backups automáticos de Cloud SQL
2. ✅ Configurar alertas de monitoreo
3. ✅ Implementar rate limiting con Redis
4. ✅ Configurar Cloud Armor para WAF
5. ✅ Implementar health checks personalizados

## Soporte

Si encuentras problemas, revisa:

- Documentación oficial: https://cloud.google.com/run/docs
- Logs de Cloud Run: `gcloud run services logs read xavi-api`
- Estado de servicios: https://status.cloud.google.com/
