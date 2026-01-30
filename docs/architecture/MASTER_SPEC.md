# MASTER SPECIFICATION

## Executive Summary

This document provides a complete, implementation-ready blueprint to rebuild the **Xavier Personal Productivity System** from Laravel/PHP to **Node.js Serverless Architecture**.

**Current System**: 2 Laravel services (xavier-auth + xavier-api) with 150+ REST endpoints  
**Target System (Recommended)**: Single containerized service on Google Cloud Run + PostgreSQL + Redis  
**Alternative**: 10 serverless functions + PostgreSQL + Redis + Queue

---

## Project Overview

### What is Xavier?

Xavier is a comprehensive personal productivity and finance management platform consisting of:

1. **Activity Tracking**: Time tracking with categories and follow-ups
2. **Habit Tracking**: Daily habits with streak calculation and goals
3. **Todo Management**: Tasks with subtasks, lists, categories, and recurrence
4. **Wallet/Finance**: Multi-wallet expense tracking, budgets, scheduled expenses
5. **Shopping Lists**: Item management with cost tracking
6. **Routines**: Daily routine templates with timed activities
7. **Learning**: Resource management with tags and categories
8. **Programming**: Technology topic tracking by language
9. **Courses**: Online course progress tracking
10. **Sleep Tracking**: Sleep duration and quality logging

---

## Documentation Index

All specifications are in `/xavier-api/outputs/instruments/`:

### Core Documents

1. **STEP1_PROJECT_IDENTIFICATION.md**
   - Two Laravel projects analyzed
   - Technologies, dependencies, entry points
   - Current architecture overview

2. **SYSTEM_MAP.md**
   - Complete system architecture
   - Database schema overview
   - Integration points
   - Security model
   - Background jobs

3. **API_CONTRACTS.md**
   - All 150+ endpoints documented
   - Request/response schemas
   - Authentication requirements
   - Error responses

4. **DATA_MODEL.md**
   - Complete PostgreSQL schema
   - 54 tables with relationships
   - Indexes and constraints
   - Business rules

5. **BEHAVIOR_SPEC.md**
   - 15 core use cases
   - Business rules and validations
   - State machines
   - Edge cases and invariants

6. **CLOUD_RUN_ARCHITECTURE.md** ⭐ **RECOMMENDED**
   - Google Cloud Run container deployment
   - Single unified HTTP server architecture
   - Dockerfile and infrastructure
   - Database and Redis connection strategies
   - CI/CD pipelines
   - Cost optimization (~$60/month)

7. **TARGET_ARCHITECTURE.md** (Alternative)
   - Multi-function serverless design
   - 10 function boundaries
   - Database strategy (PostgreSQL + PgBouncer)
   - Auth strategy (JWT + Redis)
   - Queue processing
   - Cost optimization (~$28/month AWS)
   - Observability

8. **ROUTING_AND_FUNCTIONS.md**
   - API Gateway configuration
   - Function-level routing
   - Middleware chain
   - Internal routers

9. **IMPLEMENTATION_BLUEPRINT_PART1.md**
   - Repository structure
   - Runtime decisions
   - Key dependencies
   - Shared module specifications

10. **CLOUD_RUN_IMPLEMENTATION.md** ⭐ **PRACTICAL GUIDE**
    - Concrete code examples for Cloud Run
    - Project structure
    - Core implementation files
    - Controller and middleware examples
    - TypeScript configuration

---

## Features Overview

### User Management & Auth

- Email/password registration
- Email verification (6-digit OTP)
- JWT access tokens (1h expiration)
- Refresh tokens (30 day expiration)
- Redis session caching
- Multi-device support

### Activity Tracking

- Customizable categories (work, rest, learning, etc.)
- Time tracking with start/end times
- Follow-ups can span multiple days
- Total time accumulation
- User-owned data

### Habit Tracking

- 4 tracking modes: counter, timer, incremental, decremental
- Daily goals (quantity, time, repetitions)
- Streak calculation (current and max)
- Habit types: keep (positive) or avoid (negative)
- Custom measurement units
- Daily follow-up logging
- Story/journal entries

### Todo Management

- Nested lists and categories
- Subtasks with independent completion
- Recurring tasks (via frequencies)
- Importance flags
- "Today" and "This Week" filters
- Bulk operations

### Wallet & Finance

- Multiple wallets per user
- Income and expense tracking
- Double-entry accounting (debit/credit)
- Budget tracking with date ranges
- Scheduled recurring expenses
- Balance consistency guarantees
- Budget closure with follow-ups
- Period-based organization

### Shopping

- Multiple shopping lists
- Item categorization
- Quantity and price tracking
- Purchase status
- Estimated vs actual cost comparison

### Routines

- Reusable activity templates
- Timed sequences
- Active routine designation
- Order management

### Learning

- Resource categorization
- Multi-tag support
- Programming language organization
- Topic types (framework, library, concept, tool)

### Courses

- Lesson progress tracking
- Daily follow-ups
- Percentage calculation

### Sleep Tracking

- Hours and minutes
- Quality rating (1-5 scale)
- One entry per day constraint

---

## Migration Architecture

### Current State (Laravel/PHP)

```
┌──────────────┐         ┌──────────────┐
│ xavier-auth  │◄────────┤  Client App  │
│   (Port 8000)│         └──────────────┘
│              │                │
│ - Register   │                │
│ - Login      │                │
│ - Verify     │                ▼
│ - Tokens     │         ┌──────────────┐
└──────────────┘         │ xavier-api   │
       │                 │  (Port 8001) │
       │                 │              │
       │  HTTP           │ - 150+ API   │
       │  Token          │   endpoints  │
       │  Validation     │              │
       └────────────────►│              │
                         └──────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
              ┌─────▼──────┐         ┌─────▼──────┐
              │Auth DB     │         │Main DB     │
              │(MySQL)     │         │(MySQL)     │
              │            │         │            │
              │4 tables    │         │50+ tables  │
              └────────────┘         └────────────┘
```

### Target State (Serverless/Node.js)

```
┌──────────────┐
│  Client App  │
└──────┬───────┘
       │
       │ HTTPS + JWT
       │
       ▼
┌──────────────────────┐
│  API Gateway         │
│  (Route by path)     │
└──────┬───────────────┘
       │
       │  Invoke Functions
       │
    ┌──┴────────────────────────────────────┐
    │                                       │
┌───▼──────┐  ┌──────────┐  ┌──────────┐  │
│ auth     │  │ activity │  │ habit    │  │
│ function │  │ function │  │ function │  │
└───┬──────┘  └────┬─────┘  └────┬─────┘  │
    │              │              │        │
    │  ┌───────────┴──────────────┴───┐   │
    │  │   9 more domain functions    │   │
    │  └───────────┬──────────────────┘   │
    │              │                       │
    └──────────────┼───────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐   ┌────▼─────┐  ┌────▼────┐
│PostgreSQL   │ Redis    │  │ Queue   │
│(RDS/Cloud   │(Session) │  │(Email)  │
│SQL)        │          │  │         │
│            │          │  │         │
│54 tables   │          │  │         │
└────────────┘  └──────────┘  └─────────┘
```

---

## Key Technical Decisions

### Why Serverless?

- **Auto-scaling**: Handle traffic spikes without provisioning
- **Cost-effective**: Pay only for actual invocations
- **Reduced ops**: No server management
- **Fast iteration**: Deploy individual functions

### Why PostgreSQL over MySQL?

- Native UUID types
- Better JSON support (JSONB)
- Superior connection pooling (PgBouncer)
- Better Node.js ecosystem

### Why Domain Functions over Route Functions?

- Shared warm instances (fewer cold starts)
- Code reuse within domain
- Manageable count (10 vs 150+)
- Clear boundaries

### Why No ORM?

- Raw SQL for performance
- Full control over queries
- Avoid N+1 query issues
- Smaller bundle sizes

### Why Zod for Validation?

- TypeScript-first
- Runtime type checking
- Clear error messages
- Composable schemas

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Set up repository structure
- [ ] Implement shared modules (config, logger, errors, database)
- [ ] Set up local dev environment (Docker Compose)
- [ ] Create PostgreSQL migration scripts
- [ ] Set up CI/CD pipeline (GitHub Actions)

### Phase 2: Auth Function (Week 3)

- [ ] Implement registration endpoint
- [ ] Implement login endpoint
- [ ] Implement email verification
- [ ] Implement token refresh
- [ ] Set up email queue and worker
- [ ] Write unit tests
- [ ] Deploy to dev environment

### Phase 3: Core Functions (Week 4-6)

- [ ] Implement Activity function
- [ ] Implement Habit function (with streak logic)
- [ ] Implement Todo function
- [ ] Write integration tests
- [ ] Deploy to staging

### Phase 4: Finance Functions (Week 7-8)

- [ ] Implement Wallet function
- [ ] Wallet balance transaction logic
- [ ] Budget tracking
- [ ] Scheduled expenses
- [ ] Test balance consistency

### Phase 5: Remaining Functions (Week 9-10)

- [ ] Implement Shopping function
- [ ] Implement Routine function
- [ ] Implement Learning function
- [ ] Implement Course function
- [ ] Implement Sleep function

### Phase 6: Production Deployment (Week 11-12)

- [ ] Set up production infrastructure (Terraform)
- [ ] Performance testing
- [ ] Security audit
- [ ] Observability setup (logs, metrics, traces)
- [ ] Gradual traffic shift (0% → 10% → 50% → 100%)
- [ ] Monitor error rates and latency
- [ ] Decommission old Laravel services

---

## Testing Strategy

### Unit Tests

- All handler functions
- Business logic (streak calculation, balance updates)
- Validators
- Utilities

**Coverage Target**: 80%+

### Integration Tests

- Database operations
- Redis caching
- Queue publishing
- Auth middleware

### End-to-End Tests

- Complete user flows (register → verify → login → create data)
- Multi-step operations (create expense → check wallet balance)
- Error scenarios (expired token, invalid input)

**Tool**: Jest + Supertest

---

## Deployment Strategy

### Environments

- **Dev**: Auto-deploy on push to `develop`
- **Staging**: Auto-deploy on push to `staging`
- **Production**: Manual approval + deploy on merge to `main`

### Rollback Plan

1. Monitor error rate post-deployment
2. If error rate > 1%, auto-rollback to previous version
3. Manual rollback command available
4. Traffic shift allows gradual migration

### Infrastructure as Code

- **Tool**: Terraform
- **Modules**: Functions, database, Redis, queue, API Gateway, secrets, monitoring
- **State**: Remote (S3/GCS)

---

## Security Checklist

- [ ] JWT tokens signed with strong secret (256-bit)
- [ ] Passwords hashed with bcrypt (10+ rounds)
- [ ] SQL injection prevention (parameterized queries)
- [ ] Input validation on all endpoints
- [ ] CORS configured for known origins
- [ ] HTTPS only (enforced at API Gateway)
- [ ] Secrets stored in Secrets Manager (never in code)
- [ ] Rate limiting on auth endpoints
- [ ] Token expiration enforced
- [ ] Owner validation on resource access
- [ ] Database connections encrypted (SSL/TLS)
- [ ] Audit logging for sensitive operations

---

## Observability

### Logging

- **Format**: Structured JSON (pino)
- **Fields**: timestamp, level, message, traceId, userId, duration, error
- **Destination**: CloudWatch Logs / Cloud Logging
- **Retention**: 30 days

### Metrics

- Request count (by function, endpoint, status code)
- Request duration (p50, p95, p99)
- Error rate
- Cold start count & duration
- Database connection pool usage
- Redis hit rate

### Tracing

- **Tool**: OpenTelemetry / AWS X-Ray
- **Propagation**: X-Trace-Id header
- **Spans**: Function execution, DB queries, Redis calls, queue publish

### Alerts

- Error rate > 1% (5 min window) → Page on-call
- p95 latency > 2s → Slack notification
- Database connection errors → Page on-call
- Redis unavailable → Slack notification

---

## Cost Estimate

### AWS Example (100K requests/month)

| Service                      | Usage                           | Cost/Month  |
| ---------------------------- | ------------------------------- | ----------- |
| Lambda (10 functions)        | 100K invocations @ 512MB, 500ms | $0.44       |
| API Gateway                  | 100K requests                   | $0.35       |
| RDS PostgreSQL (t3.micro)    | 24/7 uptime                     | $15.00      |
| ElastiCache Redis (t3.micro) | 24/7 uptime                     | $12.00      |
| SQS                          | 100K messages                   | $0.04       |
| CloudWatch Logs              | 1GB ingestion                   | $0.50       |
| **Total**                    |                                 | **~$28.50** |

**Scaling**: Linear with requests until ~500K/month, then DB may need upgrade.

---

## Open Questions

1. **Cloud Provider**: AWS, GCP, or Azure? (Impacts Terraform modules)
2. **Database Migration Tool**: Flyway, Knex Migrate, or Prisma Migrate?
3. **Email Service**: SendGrid, AWS SES, or Postmark?
4. **Monitoring**: Datadog, New Relic, or native cloud?
5. **User Sync**: How to sync users between auth DB and main DB? (Trigger function on registration?)
6. **Scheduled Expense Generation**: Cron job or on-demand?
7. **Token Lifetime**: What's acceptable for access tokens? (Current: unclear)
8. **Multi-Currency**: Future requirement? (Not in current system)
9. **Soft Deletes**: Should we implement for audit trail? (Not in current system)
10. **API Versioning**: Future plans for v2? (URL prefix only for now)

---

## Success Criteria

### Functional

- [ ] All 150+ endpoints migrated
- [ ] All business logic preserved (especially streak calculation, balance updates)
- [ ] Data migration completed without loss
- [ ] Authentication works identically
- [ ] Email verification works

### Non-Functional

- [ ] p95 latency < 500ms (improvement over Laravel)
- [ ] Error rate < 0.1%
- [ ] 99.9% uptime
- [ ] Cost < $50/month for 100K requests
- [ ] Cold start < 1s for 90% of requests

### Quality

- [ ] 80%+ test coverage
- [ ] Zero critical security vulnerabilities
- [ ] All endpoints documented
- [ ] Runbooks for common issues
- [ ] Monitoring dashboards created

---

## Team Recommendations

### Minimum Viable Team

- **1 Backend Developer** (Node.js, TypeScript, serverless)
- **1 DevOps Engineer** (Terraform, CI/CD, cloud)
- **0.5 QA Engineer** (Testing automation)

### Skills Required

- Node.js & TypeScript proficiency
- SQL & database design
- Serverless architecture patterns
- Cloud platform (AWS/GCP/Azure)
- Infrastructure as Code (Terraform)
- CI/CD pipelines
- Testing frameworks (Jest)

### Timeline

- **Minimum**: 12 weeks (1 person full-time)
- **Recommended**: 8 weeks (2 people)
- **Aggressive**: 6 weeks (3 people)

---

## Conclusion

This specification provides **everything needed** to rebuild Xavier in Node.js serverless:

✅ Complete understanding of current system  
✅ Detailed target architecture  
✅ All API contracts documented  
✅ Full database schema  
✅ Business rules and edge cases  
✅ Implementation blueprint  
✅ Testing and deployment strategy  
✅ Cost estimates and success criteria

**Next Step**: Begin implementation starting with Phase 1 (Foundation).

An AI or development team can use these documents to implement the system end-to-end without needing the original Laravel codebase.

---

## Document Revision History

| Version | Date       | Author         | Changes                        |
| ------- | ---------- | -------------- | ------------------------------ |
| 1.0     | 2026-01-29 | GitHub Copilot | Initial complete specification |

---

**END OF MASTER SPECIFICATION**
