# 🚀 Quick Start Commands - Cloud Run

## Inicio Rápido (5 minutos)

### 1. Setup Inicial del Proyecto

```bash
# Navegar al directorio del proyecto
cd /Users/jako/Developer/xavi-platform/xavi-platform-node

# Inicializar package.json
npm init -y

# Instalar dependencias principales
npm install express pg ioredis jsonwebtoken bcryptjs zod pino cors helmet compression uuid dotenv

# Instalar dependencias de desarrollo
npm install -D typescript @types/node @types/express @types/pg @types/bcryptjs @types/jsonwebtoken @types/cors @types/compression @types/uuid tsx tsc-alias eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser jest ts-jest @types/jest supertest @types/supertest

# Crear estructura de directorios
mkdir -p src/{routes,controllers/{auth,activity,habit,todo,wallet,shopping,routine,learning,course,sleep},shared/{database,redis,middleware,errors,logger,utils,validators,config,queue},types,workers}
mkdir -p migrations tests/{unit,integration,e2e} scripts terraform

# Crear archivos de configuración
touch src/server.ts src/app.ts
touch tsconfig.json .eslintrc.js .prettierrc .env.example .dockerignore
touch Dockerfile Dockerfile.dev docker-compose.yml
touch README.md
```

---

## 2. Google Cloud Setup

### 2.1 Instalar gcloud CLI (si no lo tienes)

```bash
# macOS
brew install --cask google-cloud-sdk

# Inicializar
gcloud init
```

### 2.2 Crear y Configurar Proyecto GCP

```bash
# Variables
export PROJECT_ID="xavi-platform"
export REGION="us-central1"

# Crear proyecto
gcloud projects create $PROJECT_ID --name="Xavier Platform"

# Seleccionar proyecto
gcloud config set project $PROJECT_ID

# Habilitar APIs necesarias
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  cloudtasks.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com

# Configurar facturación (necesario)
# Ve a: https://console.cloud.google.com/billing
```

### 2.3 Crear Service Accounts

```bash
# Service account para Cloud Run
gcloud iam service-accounts create xavi-api-dev \
  --display-name="Xavier API Dev Service Account"

gcloud iam service-accounts create xavi-api-prod \
  --display-name="Xavier API Prod Service Account"

# Asignar roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:xavi-api-dev@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:xavi-api-dev@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Infraestructura (Opción A: Manual)

### 3.1 Crear Cloud SQL PostgreSQL

```bash
# Crear instancia de Cloud SQL
gcloud sql instances create xavi-db-dev \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --network=default \
  --no-assign-ip

# Crear base de datos
gcloud sql databases create xavier_db --instance=xavi-db-dev

# Crear usuario
gcloud sql users create xavi_app \
  --instance=xavi-db-dev \
  --password=CHANGE_THIS_PASSWORD
```

### 3.2 Crear Memorystore Redis

```bash
gcloud redis instances create xavi-redis-dev \
  --size=1 \
  --region=$REGION \
  --tier=basic \
  --redis-version=redis_7_0
```

### 3.3 Crear VPC Connector

```bash
gcloud compute networks vpc-access connectors create xavi-connector \
  --region=$REGION \
  --range=10.8.0.0/28
```

### 3.4 Crear Secrets

```bash
# JWT Secret
echo -n "your-super-secret-jwt-key-change-this-in-production-minimum-64-chars" | \
  gcloud secrets create xavi-jwt-secret --data-file=-

# DB Password
echo -n "your-db-password" | \
  gcloud secrets create xavi-db-password --data-file=-

# Redis (si tiene password)
echo -n "your-redis-password" | \
  gcloud secrets create xavi-redis-password --data-file=-
```

---

## 4. Infraestructura (Opción B: Terraform - RECOMENDADO)

```bash
# Instalar Terraform
brew install terraform

# Navegar a directorio terraform
cd terraform

# Inicializar Terraform
terraform init

# Ver plan
terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="environment=dev"

# Aplicar (crear toda la infraestructura)
terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="environment=dev"

# Guardar outputs importantes
terraform output > ../terraform-outputs.txt
```

---

## 5. Desarrollo Local con Docker

### 5.1 Crear docker-compose.yml

Copia el contenido de `CLOUD_RUN_ARCHITECTURE.md` sección "Local Development with Docker Compose"

### 5.2 Iniciar Entorno Local

```bash
# Build y start
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Verificar servicios
docker-compose ps

# Acceder a la base de datos
docker-compose exec postgres psql -U postgres -d xavier_dev

# Detener todo
docker-compose down
```

---

## 6. Primeros Archivos de Código

### 6.1 package.json Scripts

Añade estos scripts a `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/server.js",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "migrate": "tsx scripts/migrate.ts"
  }
}
```

### 6.2 tsconfig.json

```bash
npx tsc --init
```

Luego copia la configuración de `CLOUD_RUN_IMPLEMENTATION.md`

### 6.3 Variables de Entorno

```bash
# Copiar ejemplo
cp .env.example .env

# Editar con tus valores
nano .env
```

---

## 7. Primera Migración de Base de Datos

### 7.1 Crear Script de Migración

```bash
cat > scripts/migrate.ts << 'EOF'
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    console.log(`✓ ${file} completed`);
  }

  await pool.end();
  console.log('All migrations completed!');
}

runMigrations().catch(console.error);
EOF
```

### 7.2 Crear Primera Migración (Users Table)

```bash
cat > migrations/001_create_users.sql << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP,
    is_account_verified BOOLEAN DEFAULT FALSE,
    auth_otp VARCHAR(6),
    last_otp_sent TIMESTAMP,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_otp ON users(auth_otp);

CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id BIGSERIAL PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    abilities TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tokens_tokenable ON personal_access_tokens(tokenable_type, tokenable_id);
CREATE INDEX idx_tokens_token ON personal_access_tokens(token);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    token_id BIGINT NOT NULL REFERENCES personal_access_tokens(id) ON DELETE CASCADE,
    plain_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
EOF
```

### 7.3 Ejecutar Migraciones

```bash
npm run migrate
```

---

## 8. Build y Deploy Primera Versión

### 8.1 Build Docker Image

```bash
# Build
docker build -t gcr.io/$PROJECT_ID/xavi-api:latest .

# Test locally
docker run -p 8080:8080 --env-file .env gcr.io/$PROJECT_ID/xavi-api:latest
```

### 8.2 Push to Google Container Registry

```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Push image
docker push gcr.io/$PROJECT_ID/xavi-api:latest
```

### 8.3 Deploy to Cloud Run

```bash
# Obtener connection name de Cloud SQL
export CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe xavi-db-dev --format="value(connectionName)")

# Deploy
gcloud run deploy xavi-api-dev \
  --image=gcr.io/$PROJECT_ID/xavi-api:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=development,CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_CONNECTION_NAME" \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --vpc-connector=xavi-connector \
  --service-account=xavi-api-dev@$PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets="DB_PASSWORD=xavi-db-password:latest,JWT_SECRET=xavi-jwt-secret:latest" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10

# Obtener URL del servicio
gcloud run services describe xavi-api-dev --region=$REGION --format="value(status.url)"
```

---

## 9. Verificar Deployment

```bash
# Obtener URL
export SERVICE_URL=$(gcloud run services describe xavi-api-dev --region=$REGION --format="value(status.url)")

# Test health endpoint
curl $SERVICE_URL/health

# Test readiness endpoint
curl $SERVICE_URL/ready

# Expected output:
# {"status":"ok","timestamp":"2026-01-30T..."}
```

---

## 10. CI/CD con Cloud Build

### 10.1 Crear cloudbuild.yaml

Copia el contenido de `CLOUD_RUN_ARCHITECTURE.md` sección "CI/CD Pipeline"

### 10.2 Configurar Trigger

```bash
# Conectar repositorio de GitHub
# Ve a: https://console.cloud.google.com/cloud-build/triggers

# O por CLI:
gcloud builds triggers create github \
  --repo-name=xavi-platform-node \
  --repo-owner=jako \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --substitutions="_REGION=$REGION,_ENV=prod"
```

---

## 11. Monitoreo y Logs

```bash
# Ver logs en tiempo real
gcloud run services logs tail xavi-api-dev --region=$REGION

# Ver logs específicos
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=xavi-api-dev" --limit=50

# Abrir Cloud Console
open "https://console.cloud.google.com/run/detail/$REGION/xavi-api-dev/metrics?project=$PROJECT_ID"
```

---

## 12. Desarrollo Diario

### Workflow típico:

```bash
# 1. Crear feature branch
git checkout -b feature/auth-module

# 2. Desarrollar localmente con hot reload
npm run dev

# 3. Test
npm test

# 4. Lint
npm run lint

# 5. Build
npm run build

# 6. Commit y push
git add .
git commit -m "feat: implement auth module"
git push origin feature/auth-module

# 7. Crear PR en GitHub
# El CI/CD ejecutará tests automáticamente

# 8. Después de merge a develop, deploy automático a dev
# Después de merge a main, deploy automático a prod (con aprobación)
```

---

## 🎯 Checklist de Inicio

- [ ] Node.js 18+ instalado
- [ ] gcloud CLI instalado y autenticado
- [ ] Docker instalado
- [ ] Proyecto GCP creado
- [ ] APIs habilitadas
- [ ] Infraestructura creada (manual o Terraform)
- [ ] Repositorio Git inicializado
- [ ] Dependencias npm instaladas
- [ ] Variables de entorno configuradas
- [ ] Primera migración ejecutada
- [ ] Docker Compose funcionando localmente
- [ ] Primer deploy a Cloud Run exitoso
- [ ] Health check respondiendo 200

---

## 📚 Próximos Pasos

1. ✅ Completar módulo de autenticación (Semana 3 del roadmap)
2. Implementar módulo de actividades (Semana 4)
3. Implementar resto de módulos (Semanas 5-7)
4. Testing completo (Semana 8)
5. Deploy a producción (Semanas 9-10)

**Sigue**: [CLOUD_RUN_ROADMAP.md](./CLOUD_RUN_ROADMAP.md) para el plan completo

---

## 🆘 Troubleshooting

### Error: "Cloud SQL connection failed"

```bash
# Verificar que el proxy esté configurado
gcloud sql instances describe xavi-db-dev

# Verificar VPC connector
gcloud compute networks vpc-access connectors describe xavi-connector --region=$REGION
```

### Error: "Permission denied"

```bash
# Dar permisos al service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:xavi-api-dev@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

### Error: "Port 8080 already in use"

```bash
# Encontrar y matar proceso
lsof -ti:8080 | xargs kill -9
```

---

**Última actualización**: 30 de Enero, 2026  
**Tiempo estimado**: ~2 horas para setup completo inicial
