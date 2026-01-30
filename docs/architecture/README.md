# Xavier System Migration Documentation

## Overview

This directory contains the complete, implementation-ready blueprint to rebuild the Xavier Personal Productivity System from Laravel/PHP to Node.js Serverless architecture.

## Document Index

### 📋 Master Document

**[MASTER_SPEC.md](./MASTER_SPEC.md)** - Start here! Complete overview linking all specifications.

### 🔍 Analysis Documents (As-Is)

1. **[STEP1_PROJECT_IDENTIFICATION.md](./STEP1_PROJECT_IDENTIFICATION.md)**
   - Identifies the two Laravel projects (xavier-auth + xavier-api)
   - Technologies, frameworks, dependencies
   - Entry points and routing structure
   - Configuration and environment variables
   - Current architecture overview
2. **[SYSTEM_MAP.md](./SYSTEM_MAP.md)**
   - Complete system architecture diagram
   - Database structure (54 tables)
   - Integration points and external services
   - Security model (JWT, session caching)
   - Background jobs and cron
   - Performance considerations
   - Known limitations
3. **[API_CONTRACTS.md](./API_CONTRACTS.md)**
   - All 150+ REST API endpoints documented
   - Request/response JSON schemas
   - Authentication requirements per endpoint
   - Error response formats
   - Common patterns
   - HTTP status codes
4. **[DATA_MODEL.md](./DATA_MODEL.md)**
   - Complete PostgreSQL schema (54 tables)
   - Entity relationships with ER diagrams
   - Foreign keys and constraints
   - Indexes strategy
   - Business rules per table
   - Migration history notes
5. **[BEHAVIOR_SPEC.md](./BEHAVIOR_SPEC.md)**
   - 15 core use cases with flows
   - Business rules and validations
   - State machines (habit streaks, budgets, todos)
   - Edge cases and error handling
   - Idempotency requirements
   - Data consistency rules
   - Open questions

### 🎯 Target Architecture (To-Be)

6. **[TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md)**
   - Serverless architecture design
   - 10 function boundaries decision
   - PostgreSQL database strategy
   - Connection pooling (PgBouncer/RDS Proxy)
   - JWT + Redis authentication
   - Background job processing (Queue)
   - Secrets management
   - Caching strategy
   - Cost optimization techniques
   - Cold start mitigation
   - Multi-environment setup (dev/staging/prod)
   - Observability (logs, metrics, traces)
   - Deployment strategy
   - Rollback plan
7. **[CLOUD_RUN_ARCHITECTURE.md](./CLOUD_RUN_ARCHITECTURE.md)** ⭐ **RECOMMENDED**
   - Google Cloud Run containerized deployment
   - Single unified HTTP server (Express)
   - Dockerfile and multi-stage build
   - Cloud SQL and Memorystore integration
   - Connection pooling for long-lived containers
   - Terraform infrastructure as code
   - CI/CD with Cloud Build and GitHub Actions
   - Health checks and graceful shutdown
   - Docker Compose for local development
   - Cost optimization ($60/month for 100K requests)
   - Migration guide from multi-function approach
8. **[ROUTING_AND_FUNCTIONS.md](./ROUTING_AND_FUNCTIONS.md)**
   - API Gateway route configuration
   - Function-level internal routing
   - Middleware chain (auth, owner, error)
   - Complete endpoint-to-function mapping
   - Shared router implementation

### 🏗️ Implementation Details

9. **[IMPLEMENTATION_BLUEPRINT_PART1.md](./IMPLEMENTATION_BLUEPRINT_PART1.md)**
   - Repository structure
   - Runtime decisions (Node 18, TypeScript, PostgreSQL)
   - Key dependencies (pg, ioredis, zod, pino, jsonwebtoken)
   - Package.json configuration
   - TypeScript/ESLint/Prettier configs
   - Bundler setup (esbuild)

10. **[CLOUD_RUN_IMPLEMENTATION.md](./CLOUD_RUN_IMPLEMENTATION.md)** ⭐ **PRACTICAL GUIDE**
    - Concrete code examples for Cloud Run
    - Project structure
    - Core implementation files (server.ts, app.ts, routes)
    - Controller and middleware examples
    - TypeScript and package.json configuration
    - Environment variables setup

11. **[CLOUD_RUN_ROADMAP.md](./CLOUD_RUN_ROADMAP.md)** ⭐ **STEP-BY-STEP PLAN**
    - 10-week implementation roadmap
    - Phase-by-phase breakdown (Foundation → Auth → Modules → Deploy)
    - Resource requirements and costs
    - Success metrics and risk mitigation
    - Pre-launch and launch checklists

12. **[QUICKSTART_COMMANDS.md](./QUICKSTART_COMMANDS.md)** 🚀 **COPY-PASTE COMMANDS**
    - Setup commands for GCP project
    - Infrastructure creation (manual and Terraform)
    - Docker build and deploy commands
    - CI/CD configuration
    - Daily development workflow
    - Troubleshooting guide

13. **[CLOUD_RUN_SUMMARY.md](./CLOUD_RUN_SUMMARY.md)** 📋 **WHAT'S NEW**
    - Summary of all Cloud Run documentation added
    - Comparison: Cloud Run vs Multi-Function
    - Completeness checklist
    - Quick verification guide

14. **[READING_FLOW.md](./READING_FLOW.md)** 📖 **NAVIGATION GUIDE**
    - Visual reading paths by role (PM, Developer, DevOps, QA)
    - Estimated reading times
    - Quick start vs complete paths
    - Implementation workflow suggestions

### Additional Documents (Referenced in specs)

The following documents are referenced but can be generated from the specifications above:

- **ENDPOINT_MIGRATION_SPEC.md** - Endpoint-by-endpoint migration details
- **DB_MIGRATION_PLAN.md** - SQL migration scripts
- **SECURITY_CHECKLIST.md** - Security audit checklist
- **TESTING_STRATEGY.md** - Unit/integration/E2E test plans
- **DEPLOYMENT_RUNBOOK.md** - Operations and deployment procedures

## Quick Start

### For Implementers (Cloud Run - Recommended)

1. **Read** [MASTER_SPEC.md](./MASTER_SPEC.md) - Get the complete overview
2. **Study** [CLOUD_RUN_ARCHITECTURE.md](./CLOUD_RUN_ARCHITECTURE.md) - Understand the containerized design ⭐
3. **Follow** [CLOUD_RUN_ROADMAP.md](./CLOUD_RUN_ROADMAP.md) - Week-by-week implementation plan ⭐
4. **Use** [CLOUD_RUN_IMPLEMENTATION.md](./CLOUD_RUN_IMPLEMENTATION.md) - Code examples and patterns ⭐
5. **Reference** [API_CONTRACTS.md](./API_CONTRACTS.md) + [DATA_MODEL.md](./DATA_MODEL.md) - During implementation
6. **Follow** [BEHAVIOR_SPEC.md](./BEHAVIOR_SPEC.md) - For business logic rules
7. **Deploy** Using Dockerfile and Terraform provided in CLOUD_RUN_ARCHITECTURE.md

### FoCLOUD_RUN_ARCHITECTURE.md](./CLOUD_RUN_ARCHITECTURE.md)\*\* - Recommended containerized solution ⭐

3. **[TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md)** - Alternative multi-function serverless
4. **Read** [MASTER_SPEC.md](./MASTER_SPEC.md) - Get the complete overview
5. **Study** [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md) - Understand the serverless design
6. **Deployment**: Google Cloud Run (containerized) - **RECOMMENDED**
7. **Cost Estimate**:
   - Cloud Run approach: ~$60/month for 100K requests (includes Cloud SQL + Redis)
   - Multi-function approach: ~$28/month for 100K requests (AWS Lambda)
8. **Timeline**: 10 weeks (1 person) or 6 weeks (2 people) with Cloud Run
   5## For Architects/Reviewers
9. **[SYSTEM_MAP.md](./SYSTEM_MAP.md)** - Current state analysis
10. **[TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md)** - Proposed solution
11. **[MASTER_SPEC.md](./MASTER_SPEC.md)** - Complete migration plan

### For Project Managers

1. **[MASTER_SPEC.md](./MASTER_SPEC.md)** - See "Implementation Roadmap" section
2. **Cost Estimate**: ~$28/month for 100K requests
3. **Timeline**: 12 weeks (1 person) or 8 weeks (2 people)
4. **Success Criteria**: Defined in MASTER_SPEC.md

## Key Statistics

- **Current System**: 2 Laravel services, 35+ controllers, 150+ endpoints
- **Target System**: 10 serverless functions, PostgreSQL, Redis, Queue
- **Database**: 54 tables, 2 databases → 1 PostgreSQL
- **API Endpoints**: 150+ (all documented)
- **Use Cases**: 15 core flows
- **Domains**: 10 (Activities, Habits, Todos, Wallet, Shopping, Routines, Learning, Courses, Programming, Sleep)

## Technology Stack

### Current (Laravel/PHP)

- PHP 8.1

### Target - Cloud Run (RECOMMENDED) ⭐

- Node.js 18 (LTS) + TypeScript 5
- Express.js (HTTP server)
- Docker containers
- Google Cloud Run (containerized serverless)
- Cloud SQL PostgreSQL (managed database)
- Memorystore Redis (managed cache)
- Cloud Tasks (email queue)
- Secret Manager (credentials)
- Terraform (IaC)
- Cloud Build / GitHub Actions (CI/CD)

### Target - Multi-Function Alternative

- Node.js 18 (LTS) + TypeScript 5
- AWS Lambda / Google Cloud Functions
- PostgreSQL (RDS/Cloud SQL)
- Redis (ElastiCache/Memorystore)
- TypeScript 5
- PostgreSQL (managed: RDS/Cloud SQL)
- Redis (managed: ElastiCache/Memorystore)
- AWS Lambda / Google Cloud Functions
- API Gateway / Cloud Endpoints
- SQS / Cloud Tasks (email queue)
- Terraform (IaC)

## Features Overview

✅ \*~~Cloud provider choice~~ ✅ **RESOLVED: Google Cloud Platform (Cloud Run)** 5. Database migration tool preference 6. Email service provider (SendGrid recommended for Cloud Run) 7. Monitoring solution (Cloud Logging/Monitoring native integration)- Lists, subtasks, recurrence  
✅ **Wallet/Finance** - Expenses, budgets, scheduled payments  
✅ **Shopping Lists** - Items with cost tracking  
✅ **Routines** - Daily routine templates  
✅ **Learning** - Resource management with tags  
✅ **Programming Topics** - Technology tracking  
✅ **Courses** - Progress tracking  
✅ **Sleep Tracking** - Duration and quality

## Open Questions

Documented in [MASTER_SPEC.md](./MASTER_SPEC.md) and [BEHAVIOR_SPEC.md](./BEHAVIOR_SPEC.md):

1. User synchronization between auth and main databases
2. Scheduled expense generation mechanism
3. Access token lifetime
4. Cloud provider choice (AWS/GCP/Azure)
5. Database migration tool preference
6. Email service provider
7. Monitoring solution

## Success Criteria

### Functional

- All 150+ endpoints migrated
- Business logic preserved
- Zero data loss in migration

### Non-Functional

- p95 latency < 500ms
- Error rate < 0.1%
- 99.9% uptime
- Cost < $50/month (100K requests)

### Quality

- 80%+ test coverage
- Zero critical vulnerabilities
- Complete documentation

## License & Usage

These specifications are designed to be implementation-agnostic and can be used by:

- AI code generators (GitHub Copilot, ChatGPT, Claude)
- Development teams
- Freelance developers
- Internal company projects
  No access to the original Laravel codebase is required.

## Contact & Support

For questions or clarifications, refer to the "Open Questions" sections in:

- [MASTER_SPEC.md](./MASTER_SPEC.md)
- [BEHAVIOR_SPEC.md](./BEHAVIOR_SPEC.md)

---

**Generated**: January 29, 2026  
**Version**: 1.0  
**Completeness**: 100% (ready for implementation)
