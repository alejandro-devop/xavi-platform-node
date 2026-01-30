# Cloud Run Deployment Roadmap

## Overview

This document provides a **step-by-step implementation plan** for building and deploying Xavier API on Google Cloud Run. Follow this roadmap sequentially for successful project delivery.

**Total Duration**: 8-10 weeks (1 developer) or 5-6 weeks (2 developers)

---

## Pre-Implementation Setup (Week 1)

### 1.1 Google Cloud Platform Setup

**Tasks**:

- [ ] Create GCP project (`xavi-platform`)
- [ ] Enable required APIs:
  ```bash
  gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    secretmanager.googleapis.com \
    cloudtasks.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com
  ```
- [ ] Set up billing account and alerts
- [ ] Create service accounts:
  - `xavi-api-dev@project.iam`
  - `xavi-api-staging@project.iam`
  - `xavi-api-prod@project.iam`
- [ ] Configure IAM roles

**Deliverables**: GCP project configured, APIs enabled, service accounts created

---

### 1.2 Infrastructure Provisioning

**Tasks**:

- [ ] Set up Terraform workspace
- [ ] Create VPC network and subnets
- [ ] Provision Cloud SQL PostgreSQL instances:
  - Dev: `db-f1-micro` (10GB)
  - Staging: `db-f1-micro` (10GB)
  - Prod: `db-custom-2-4096` (20GB, HA)
- [ ] Provision Memorystore Redis instances:
  - Dev: 1GB Basic
  - Staging: 1GB Basic
  - Prod: 2GB Standard HA
- [ ] Set up VPC Access Connector
- [ ] Create Secret Manager secrets

**Deliverables**: Infrastructure running, connection strings available

---

### 1.3 Local Development Environment

**Tasks**:

- [ ] Initialize Node.js project
  ```bash
  npm init -y
  npm install express pg ioredis jsonwebtoken bcryptjs zod pino
  npm install -D typescript @types/node @types/express tsx
  ```
- [ ] Set up Docker Compose for local development
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Create `.env` files for each environment
- [ ] Set up Git repository and branches (main, staging, develop)

**Deliverables**: Project initialized, local dev environment working

---

## Phase 1: Foundation (Week 2)

### 2.1 Core Infrastructure Code

**Tasks**:

- [ ] Implement `src/shared/database/pool.ts` (PostgreSQL connection)
- [ ] Implement `src/shared/redis/client.ts` (Redis connection)
- [ ] Implement `src/shared/logger/index.ts` (Cloud Logging integration)
- [ ] Implement `src/shared/config/index.ts` (service initialization)
- [ ] Write unit tests for shared modules

**Files to Create**:

- `src/shared/database/pool.ts`
- `src/shared/redis/client.ts`
- `src/shared/logger/index.ts`
- `src/shared/config/index.ts`
- `tests/unit/database.test.ts`
- `tests/unit/redis.test.ts`

**Acceptance Criteria**:

- ✅ Database pool connects to Cloud SQL via Unix socket
- ✅ Redis client connects to Memorystore
- ✅ Logs are structured JSON format
- ✅ Services gracefully initialize and shutdown

---

### 2.2 Middleware and Error Handling

**Tasks**:

- [ ] Implement JWT utilities (`src/shared/utils/jwt.ts`)
- [ ] Implement auth middleware (`src/shared/middleware/auth.ts`)
- [ ] Implement error handler (`src/shared/middleware/error-handler.ts`)
- [ ] Implement request logger (`src/shared/middleware/request-logger.ts`)
- [ ] Implement validation middleware (`src/shared/middleware/validate.ts`)
- [ ] Create custom error classes (`src/shared/errors/index.ts`)

**Files to Create**:

- `src/shared/utils/jwt.ts`
- `src/shared/utils/password.ts`
- `src/shared/middleware/auth.ts`
- `src/shared/middleware/error-handler.ts`
- `src/shared/middleware/request-logger.ts`
- `src/shared/middleware/validate.ts`
- `src/shared/errors/index.ts`
- `tests/unit/middleware.test.ts`

**Acceptance Criteria**:

- ✅ JWT tokens can be generated and verified
- ✅ Auth middleware extracts user from token
- ✅ Errors are caught and formatted correctly
- ✅ All requests are logged

---

### 2.3 Server Skeleton

**Tasks**:

- [ ] Implement `src/server.ts` (main entry point)
- [ ] Implement `src/app.ts` (Express configuration)
- [ ] Implement `src/routes/index.ts` (route aggregation)
- [ ] Implement `src/routes/health.ts` (health checks)
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml

**Files to Create**:

- `src/server.ts`
- `src/app.ts`
- `src/routes/index.ts`
- `src/routes/health.ts`
- `Dockerfile`
- `Dockerfile.dev`
- `docker-compose.yml`
- `.dockerignore`

**Acceptance Criteria**:

- ✅ Server starts on port 8080
- ✅ `/health` returns 200
- ✅ `/ready` checks DB and Redis connectivity
- ✅ Graceful shutdown on SIGTERM
- ✅ Docker container builds successfully
- ✅ Docker Compose starts all services

---

## Phase 2: Authentication Module (Week 3)

### 3.1 Database Migrations

**Tasks**:

- [ ] Create migration system (`scripts/migrate.ts`)
- [ ] Create `users` table migration
- [ ] Create `personal_access_tokens` table migration
- [ ] Create `refresh_tokens` table migration
- [ ] Run migrations on dev database
- [ ] Seed test data

**Files to Create**:

- `scripts/migrate.ts`
- `scripts/create-migration.ts`
- `migrations/001_create_users.sql`
- `migrations/002_create_tokens.sql`
- `migrations/003_create_refresh_tokens.sql`
- `scripts/seed.ts`

**Acceptance Criteria**:

- ✅ Migrations run successfully
- ✅ Database schema matches DATA_MODEL.md
- ✅ Test data can be seeded

---

### 3.2 Auth Routes and Controllers

**Tasks**:

- [ ] Implement validation schemas (`src/shared/validators/auth-schemas.ts`)
- [ ] Implement auth controller (`src/controllers/auth/index.ts`)
  - Register
  - Login
  - Verify email
  - Resend verification
  - Refresh token
  - Verify token
- [ ] Implement auth routes (`src/routes/auth.ts`)
- [ ] Write integration tests

**Files to Create**:

- `src/shared/validators/auth-schemas.ts`
- `src/controllers/auth/index.ts`
- `src/routes/auth.ts`
- `tests/integration/auth.test.ts`

**Acceptance Criteria**:

- ✅ POST /auth/register creates user
- ✅ POST /auth/login returns tokens
- ✅ GET /auth/verify/:code verifies email
- ✅ POST /auth/refresh generates new tokens
- ✅ All endpoints match API_CONTRACTS.md
- ✅ Integration tests pass

---

### 3.3 Email Queue Setup (Optional)

**Tasks**:

- [ ] Create Cloud Tasks queue
- [ ] Implement email worker Cloud Run service
- [ ] Implement queue utilities (`src/shared/queue/tasks.ts`)
- [ ] Configure SendGrid API
- [ ] Create email templates

**Files to Create**:

- `src/workers/email/index.ts`
- `src/workers/email/templates/verification.html`
- `src/shared/queue/tasks.ts`
- `terraform/cloud-tasks.tf`

**Acceptance Criteria**:

- ✅ Verification emails are queued on registration
- ✅ Email worker processes queue messages
- ✅ Emails are sent via SendGrid

---

## Phase 3: Activity Module (Week 4)

### 4.1 Database Migrations

**Tasks**:

- [ ] Create `activity_categories` table migration
- [ ] Create `activities` table migration
- [ ] Create `activity_followups` table migration
- [ ] Run migrations
- [ ] Seed test data

**Files to Create**:

- `migrations/004_create_activity_tables.sql`

---

### 4.2 Activity Routes and Controllers

**Tasks**:

- [ ] Implement validation schemas
- [ ] Implement activity controller
  - Categories CRUD
  - Activities CRUD
  - Followups CRUD
  - Day followups query
- [ ] Implement activity routes
- [ ] Write integration tests

**Files to Create**:

- `src/shared/validators/activity-schemas.ts`
- `src/controllers/activity/categories.ts`
- `src/controllers/activity/activities.ts`
- `src/controllers/activity/followups.ts`
- `src/routes/activity.ts`
- `tests/integration/activity.test.ts`

**Acceptance Criteria**:

- ✅ All 15 activity endpoints work
- ✅ Owner checks prevent unauthorized access
- ✅ Business logic matches BEHAVIOR_SPEC.md
- ✅ Tests pass

---

## Phase 4: Remaining Modules (Weeks 5-7)

### Parallel Implementation

Implement these modules following the same pattern as Activity:

**Week 5: Habit + Todo**

- [ ] Habit module (categories, habits, followups, goals)
- [ ] Todo module (categories, lists, todos, frequencies)

**Week 6: Wallet + Shopping**

- [ ] Wallet module (categories, wallets, expenses, budgets)
- [ ] Shopping module (categories, lists, items)

**Week 7: Learning + Misc**

- [ ] Learning module (categories, resources, tags, programming topics)
- [ ] Course module (courses, followups)
- [ ] Routine module (routines, activities, details)
- [ ] Sleep module (sleep tracker)

**For Each Module**:

1. Create migrations
2. Implement validation schemas
3. Implement controllers
4. Implement routes
5. Write tests
6. Verify against API_CONTRACTS.md and BEHAVIOR_SPEC.md

---

## Phase 5: Testing & Optimization (Week 8)

### 5.1 Comprehensive Testing

**Tasks**:

- [ ] Write missing unit tests (target: 80% coverage)
- [ ] Write E2E tests for critical flows
- [ ] Performance testing (load tests)
- [ ] Security testing (OWASP checks)
- [ ] Test all error scenarios

**Tools**:

- Jest for unit/integration tests
- Supertest for API tests
- Artillery for load testing
- OWASP ZAP for security scanning

**Acceptance Criteria**:

- ✅ 80%+ code coverage
- ✅ All critical paths tested
- ✅ Load test: 100 RPS without errors
- ✅ No critical security vulnerabilities

---

### 5.2 Performance Optimization

**Tasks**:

- [ ] Optimize database queries (add indexes)
- [ ] Implement caching for read-heavy endpoints
- [ ] Reduce Docker image size
- [ ] Optimize connection pool settings
- [ ] Add query logging for slow queries

**Acceptance Criteria**:

- ✅ p95 latency < 500ms
- ✅ Docker image < 200MB
- ✅ Database connections stable under load

---

## Phase 6: Deployment (Weeks 9-10)

### 6.1 CI/CD Pipeline Setup

**Tasks**:

- [ ] Create `cloudbuild.yaml` or GitHub Actions workflow
- [ ] Configure automated testing on PR
- [ ] Set up automated deployment to dev on merge to `develop`
- [ ] Set up automated deployment to staging on merge to `staging`
- [ ] Configure manual approval for production deployment
- [ ] Set up container vulnerability scanning

**Files to Create**:

- `cloudbuild.yaml` or `.github/workflows/deploy.yml`
- `.github/workflows/test.yml`

**Acceptance Criteria**:

- ✅ Tests run automatically on PR
- ✅ Dev deploys automatically
- ✅ Staging deploys automatically
- ✅ Production requires approval

---

### 6.2 Production Deployment

**Tasks**:

- [ ] Apply Terraform for production environment
- [ ] Run database migrations on production
- [ ] Deploy Cloud Run service to production
- [ ] Configure custom domain and SSL
- [ ] Set up Cloud Monitoring dashboards
- [ ] Set up alerting (error rate, latency, downtime)
- [ ] Create runbook for common issues

**Deliverables**:

- Production service running at `api.xavi.app`
- Monitoring dashboards configured
- Alerting enabled
- Documentation updated

**Acceptance Criteria**:

- ✅ Service accessible via HTTPS
- ✅ All endpoints responding correctly
- ✅ Monitoring shows healthy metrics
- ✅ Alerts configured and tested

---

### 6.3 Migration from Laravel

**Tasks**:

- [ ] Export data from Laravel databases
- [ ] Transform data to new schema
- [ ] Import data to Cloud SQL
- [ ] Verify data integrity
- [ ] Run parallel (Laravel + Cloud Run) for 1 week
- [ ] Gradually shift traffic (0% → 10% → 50% → 100%)
- [ ] Decommission Laravel services

**Acceptance Criteria**:

- ✅ Zero data loss
- ✅ All users can authenticate
- ✅ All features work identically
- ✅ No increase in error rate

---

## Post-Launch (Week 11+)

### Monitoring & Maintenance

**Tasks**:

- [ ] Monitor error rates and latency
- [ ] Respond to alerts
- [ ] Fix bugs reported by users
- [ ] Optimize based on real usage patterns
- [ ] Plan future enhancements

---

## Resource Requirements

### Development Team

**Minimum Viable**:

- 1 Full-stack Developer (Node.js + GCP) - 10 weeks

**Recommended**:

- 1 Backend Developer (Node.js) - 6 weeks
- 1 DevOps Engineer (GCP + Terraform) - 4 weeks (part-time)
- 0.5 QA Engineer (testing) - 2 weeks

**Ideal**:

- 2 Backend Developers - 5 weeks
- 1 DevOps Engineer - 3 weeks
- 1 QA Engineer - 2 weeks

---

### Skills Required

**Must Have**:

- Node.js & TypeScript
- Express.js
- PostgreSQL
- REST API design
- Docker
- Google Cloud Platform (Cloud Run, Cloud SQL)

**Nice to Have**:

- Terraform
- Redis
- CI/CD (Cloud Build / GitHub Actions)
- Load testing
- Security best practices

---

## Cost Breakdown

### Development Costs (One-time)

Assuming $75/hour developer rate:

| Role              | Hours   | Cost        |
| ----------------- | ------- | ----------- |
| Backend Developer | 320     | $24,000     |
| DevOps Engineer   | 80      | $6,000      |
| QA Engineer       | 40      | $3,000      |
| **Total**         | **440** | **$33,000** |

### Infrastructure Costs (Monthly)

**Development Environment**:

- Cloud Run (0 instances): $0
- Cloud SQL (db-f1-micro): $7.67
- Redis (1GB Basic): $40
- VPC Connector: $11
- **Total Dev**: ~$60/month

**Production Environment (100K requests/month)**:

- Cloud Run: ~$1.50
- Cloud SQL (db-custom-2-4096): $80
- Redis (2GB HA): $90
- VPC Connector: $11
- Cloud Tasks: $0 (free tier)
- Cloud Logging: $1
- **Total Prod**: ~$185/month

**Scaling (1M requests/month)**:

- Cloud Run: ~$15
- Cloud SQL (db-custom-4-8192): $160
- Redis: $90
- Other: $15
- **Total**: ~$280/month

---

## Success Metrics

### Functional

- ✅ All 150+ endpoints migrated
- ✅ All features working identically
- ✅ Zero data loss in migration

### Performance

- ✅ p50 latency < 200ms
- ✅ p95 latency < 500ms
- ✅ p99 latency < 1s
- ✅ Error rate < 0.1%

### Reliability

- ✅ 99.9% uptime
- ✅ Zero critical security vulnerabilities
- ✅ Automated backups working

### Development

- ✅ 80%+ test coverage
- ✅ All endpoints documented
- ✅ CI/CD pipeline functional

---

## Risk Mitigation

### Technical Risks

**Risk**: Database connection pool exhaustion  
**Mitigation**: Monitor connection usage, tune pool settings, implement circuit breaker

**Risk**: Cold starts impacting latency  
**Mitigation**: Set min instances to 1 in production

**Risk**: Redis connection failures  
**Mitigation**: Implement fallback to DB queries, alert on Redis errors

**Risk**: Data migration issues  
**Mitigation**: Run migration scripts multiple times on test data, verify integrity

### Project Risks

**Risk**: Scope creep  
**Mitigation**: Strict adherence to API_CONTRACTS.md, no new features

**Risk**: Team capacity  
**Mitigation**: Hire contractors if needed, reduce scope to MVP

**Risk**: Cloud costs exceeding budget  
**Mitigation**: Set up budget alerts, monitor spending daily

---

## Checklist Summary

### Pre-Launch Checklist

- [ ] All endpoints implemented and tested
- [ ] Database migrations run successfully
- [ ] Security audit passed
- [ ] Load testing completed
- [ ] Monitoring and alerting configured
- [ ] Documentation complete
- [ ] CI/CD pipeline working
- [ ] Backup and recovery tested
- [ ] Runbook created
- [ ] Team trained on operations

### Launch Day Checklist

- [ ] Backup current Laravel database
- [ ] Run final data migration
- [ ] Deploy to production
- [ ] Smoke test all critical endpoints
- [ ] Enable monitoring alerts
- [ ] Gradually shift traffic
- [ ] Monitor error rates and latency
- [ ] Be ready to rollback

---

## Quick Reference

### Key Commands

```bash
# Local development
npm run dev

# Build Docker image
docker build -t gcr.io/PROJECT_ID/xavi-api .

# Push to GCR
docker push gcr.io/PROJECT_ID/xavi-api

# Deploy to Cloud Run
gcloud run deploy xavi-api \
  --image gcr.io/PROJECT_ID/xavi-api \
  --region us-central1 \
  --platform managed

# Run migrations
npm run migrate

# Run tests
npm test

# Apply Terraform
cd terraform
terraform apply
```

### Important Links

- [CLOUD_RUN_ARCHITECTURE.md](./CLOUD_RUN_ARCHITECTURE.md) - Architecture details
- [CLOUD_RUN_IMPLEMENTATION.md](./CLOUD_RUN_IMPLEMENTATION.md) - Code examples
- [API_CONTRACTS.md](./API_CONTRACTS.md) - Endpoint specifications
- [DATA_MODEL.md](./DATA_MODEL.md) - Database schema
- [BEHAVIOR_SPEC.md](./BEHAVIOR_SPEC.md) - Business logic

---

**Document Version**: 1.0  
**Last Updated**: January 30, 2026  
**Estimated Completion**: March 30, 2026 (10 weeks from now)
