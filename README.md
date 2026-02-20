# Xavi Platform - Node.js (Cloud Run)

> Complete personal productivity and finance management platform rebuilt in Node.js containerized architecture for Google Cloud Run

## 🎯 Project Status

**Phase**: Architecture & Documentation Complete ✅  
**Implementation**: Ready to Start 🚀  
**Original System**: Laravel/PHP → **Target**: Node.js/TypeScript on Google Cloud Run  
**Deployment**: Docker containers, fully managed serverless

---

## 📚 Documentation

All comprehensive documentation is available in [`docs/architecture/`](./docs/architecture/):

### 🌟 Start Here (Cloud Run Implementation)

- **[README.md](./docs/architecture/README.md)** - Navigation guide for all stakeholders
- **[CLOUD_RUN_ARCHITECTURE.md](./docs/architecture/CLOUD_RUN_ARCHITECTURE.md)** ⭐ - Complete Cloud Run design
- **[CLOUD_RUN_ROADMAP.md](./docs/architecture/CLOUD_RUN_ROADMAP.md)** ⭐ - 10-week implementation plan
- **[CLOUD_RUN_IMPLEMENTATION.md](./docs/architecture/CLOUD_RUN_IMPLEMENTATION.md)** ⭐ - Code examples & patterns
- **[MASTER_SPEC.md](./docs/architecture/MASTER_SPEC.md)** - Complete overview, timeline, costs
- **[AI_READING_GUIDE.md](./docs/architecture/AI_READING_GUIDE.md)** - How AI should read docs (with examples)

### 🔥 NEW: GraphQL Implementation (Advanced Features)

- **[GRAPHQL_OVERVIEW.md](./docs/architecture/GRAPHQL_OVERVIEW.md)** ⭐ - **START HERE** for GraphQL
  - 15+ exclusive features not in REST API
  - Wallet module: auto-scheduling, pay/cancel, bulk operations
  - Habits: auto-streak calculation, archiving
  - Complete differences analysis
- **[GRAPHQL_SCHEMA_COMPLETE.md](./docs/architecture/GRAPHQL_SCHEMA_COMPLETE.md)** - All 101 operations (22 queries + 79 mutations)
- **[GRAPHQL_IMPLEMENTATION_NODE.md](./docs/architecture/GRAPHQL_IMPLEMENTATION_NODE_PART1.md)** - Node.js implementation guide

**⚠️ IMPORTANT**: The GraphQL API has significantly more features than REST, especially in Wallet module. See GRAPHQL_OVERVIEW.md for details.

#### 🚀 GraphiQL IDE (Interactive Documentation)

**Explore the API with GraphiQL:**

- **URL**: `http://localhost:8080/graphiql` (development only)
- **Features**:
  - 📚 Full schema documentation and type explorer
  - ✨ Intelligent autocomplete (Ctrl+Space)
  - 🔍 Query history and favorites
  - 🔐 Custom headers for authentication
  - 🎨 Syntax highlighting and validation
  - ⚡ Real-time error detection

**Quick Start:**

```bash
# Start the server
npm run dev

# Visit http://localhost:8080/graphiql in your browser
# Try the default query or explore the schema using the "Docs" panel
```

**For authenticated queries**, add your JWT token in the Headers panel:

```json
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

### 📊 System Analysis (Current Laravel System)

- **[STEP1_PROJECT_IDENTIFICATION.md](./docs/architecture/STEP1_PROJECT_IDENTIFICATION.md)** - 2 Laravel projects identified
- **[SYSTEM_MAP.md](./docs/architecture/SYSTEM_MAP.md)** - Architecture, 54 tables, integrations
- **[API_CONTRACTS.md](./docs/architecture/API_CONTRACTS.md)** - 150+ endpoints documented
- **[DATA_MODEL.md](./docs/architecture/DATA_MODEL.md)** - Complete PostgreSQL schema
- **[BEHAVIOR_SPEC.md](./docs/architecture/BEHAVIOR_SPEC.md)** - 15 use cases, business rules

### 🎯 Target Architecture

- **[CLOUD_RUN_ARCHITECTURE.md](./docs/architecture/CLOUD_RUN_ARCHITECTURE.md)** ⭐ - Recommended containerized approach
- **[TARGET_ARCHITECTURE.md](./docs/architecture/TARGET_ARCHITECTURE.md)** - Alternative multi-function serverless
- **[ROUTING_AND_FUNCTIONS.md](./docs/architecture/ROUTING_AND_FUNCTIONS.md)** - API routing details
- **[IMPLEMENTATION_BLUEPRINT_PART1.md](./docs/architecture/IMPLEMENTATION_BLUEPRINT_PART1.md)** - Foundation setup

---

## 🚀 Quick Start

### For Developers (Cloud Run - RECOMMENDED)

**Implementation Path:**

1. 🌟 **[MASTER_SPEC.md](./docs/architecture/MASTER_SPEC.md)** - START HERE (overview, decisions)
2. 🏗️ **[CLOUD_RUN_ARCHITECTURE.md](./docs/architecture/CLOUD_RUN_ARCHITECTURE.md)** - Architecture & infrastructure ⭐
3. 📅 **[CLOUD_RUN_ROADMAP.md](./docs/architecture/CLOUD_RUN_ROADMAP.md)** - Week-by-week plan ⭐
4. 💻 **[CLOUD_RUN_IMPLEMENTATION.md](./docs/architecture/CLOUD_RUN_IMPLEMENTATION.md)** - Code examples ⭐
5. 🗄️ **[DATA_MODEL.md](./docs/architecture/DATA_MODEL.md)** - Database schema (54 tables)
6. 📡 **[API_CONTRACTS.md](./docs/architecture/API_CONTRACTS.md)** - 150+ endpoints (request/response)
7. 🎭 **[BEHAVIOR_SPEC.md](./docs/architecture/BEHAVIOR_SPEC.md)** - Business logic (15 use cases)

### For AI Code Generators (GitHub Copilot, ChatGPT, Claude)

📖 **[READ THIS FIRST: AI Reading Guide](./docs/architecture/AI_READING_GUIDE.md)** - Complete strategy with examples, gotchas, and workflow

**Quick Reading Order:**

1. 🌟 **[MASTER_SPEC.md](./docs/architecture/MASTER_SPEC.md)** - START HERE (overview, decisions, roadmap)
2. 🏗️ **[CLOUD_RUN_ARCHITECTURE.md](./docs/architecture/CLOUD_RUN_ARCHITECTURE.md)** - How to build (containerized patterns) ⭐
3. 🗄️ **[DATA_MODEL.md](./docs/architecture/DATA_MODEL.md)** - Database schema (54 tables)
4. 📡 **[API_CONTRACTS.md](./docs/architecture/API_CONTRACTS.md)** - 150+ endpoints (request/response)
5. 🎭 **[BEHAVIOR_SPEC.md](./docs/architecture/BEHAVIOR_SPEC.md)** - Business logic (15 use cases)
6. 🔀 **[ROUTING_AND_FUNCTIONS.md](./docs/architecture/ROUTING_AND_FUNCTIONS.md)** - Routing & middleware
7. 📚 Reference as needed: SYSTEM_MAP, STEP1, IMPLEMENTATION_BLUEPRINT

**Why this order?** Context → Architecture → Data → APIs → Logic → Implementation

### For Human Developers

1. **Read** [MASTER_SPEC.md](./docs/architecture/MASTER_SPEC.md) - Complete overview
2. **Study** [TARGET_ARCHITECTURE.md](./docs/architecture/TARGET_ARCHITECTURE.md) - Serverless design
3. **Follow** 12-week implementation roadmap
4. **Reference** API_CONTRACTS.md + DATA_MODEL.md during coding

### For Architects

1. [SYSTEM_MAP.md](./docs/architecture/SYSTEM_MAP.md) - Current system
2. [TARGET_ARCHITECTURE.md](./docs/architecture/TARGET_ARCHITECTURE.md) - Proposed solution
3. [MASTER_SPEC.md](./docs/architecture/MASTER_SPEC.md) - Complete plan

### For Product/Project Managers

- **Timeline**: 12 weeks (1 dev) or 8 weeks (2 devs)
- **Cost**: ~$28-50/month for 100K requests
- **Success Criteria**: In MASTER_SPEC.md

---

## ✨ Features

- ✅ **Authentication** - Email/password, JWT, refresh tokens
- ✅ **Activity Tracking** - Time tracking with categories
- ✅ **Habit Tracking** - Streaks, goals, follow-ups
- ✅ **Todo Management** - Lists, subtasks, recurrence
- ✅ **Wallet/Finance** - Expenses, budgets, scheduled payments
- ✅ **Shopping Lists** - Items with cost tracking
- ✅ **Routines** - Daily routine templates
- ✅ **Learning** - Resource management
- ✅ **Programming Topics** - Technology tracking
- ✅ **Courses** - Progress tracking
- ✅ **Sleep Tracking** - Duration and quality

---

## 🏗️ Architecture

### Current (Laravel/PHP)

- 2 services: xavier-auth + xavier-api
- PHP 8.1 + Laravel 10
- MySQL (2 databases)
- Redis (session caching)

### Target (Node.js Serverless)

- 10 serverless functions (domain-based)
- Node.js 18 + TypeScript 5
- PostgreSQL (managed: RDS/Cloud SQL)
- Redis (managed cache)
- API Gateway
- SQS/Cloud Tasks (queue)
- Terraform (IaC)

---

## 📈 Key Stats

<<<<<<< HEAD
| Metric | Value |
|--------|-------|
| **REST Endpoints** | 150+ |
| **GraphQL Operations** | 101 (22 queries + 79 mutations) ⭐ |
| **Total API Operations** | 250+ |
| **Database Tables** | 54 |
| **Use Cases** | 15 |
| **Functions** | 10 REST + 1 GraphQL |
| **Domains** | 10 |
| **Documentation** | ~300 KB (incl. GraphQL) |
=======
| Metric | Value |
| ------------------- | ------- |
| **API Endpoints** | 150+ |
| **Database Tables** | 54 |
| **Use Cases** | 15 |
| **Functions** | 10 |
| **Domains** | 10 |
| **Documentation** | ~175 KB |

> > > > > > > a834dea8371bf902dcee9a2baa50127553c0e6ae

---

## 🛠️ Tech Stack

### Backend

- Node.js 18 (LTS)
- TypeScript 5
- PostgreSQL
- Redis
- AWS Lambda / Google Cloud Functions

### Key Libraries

<<<<<<< HEAD

- `@apollo/server` - GraphQL server ⭐
- `graphql` - GraphQL core ⭐
- # `dataloader` - N+1 query prevention ⭐

> > > > > > > a834dea8371bf902dcee9a2baa50127553c0e6ae

- `pg` - PostgreSQL client
- `ioredis` - Redis client
- `jsonwebtoken` - JWT auth
- `zod` - Validation
- `pino` - Logging
- `esbuild` - Bundling
- `pino` - Logging
- `esbuild` - Bundling

### Infrastructure

- Terraform (IaC)
- GitHub Actions (CI/CD)
- Docker (local dev)

---

## 📅 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- Repository setup
- Shared modules (config, logger, database)
- Local dev environment
- Database migrations

### Phase 2: Auth Function (Week 3)

- Registration, login, verification
- Token management
- Email queue

### Phase 3: Core Functions (Week 4-6)

- Activity, Habit, Todo functions
- Business logic implementation

### Phase 4: Finance (Week 7-8)

- Wallet function
- Balance consistency
- Budget tracking

### Phase 5: Remaining (Week 9-10)

- Shopping, Routine, Learning, Course, Sleep

### Phase 6: Production (Week 11-12)

- Infrastructure setup
- Testing, security audit
- Deployment, monitoring

---

## ✅ Success Criteria

### Functional

- ✅ All 150+ endpoints migrated
- ✅ Business logic preserved
- ✅ Zero data loss

### Non-Functional

- ✅ p95 latency < 500ms
- ✅ Error rate < 0.1%
- ✅ 99.9% uptime

### Quality

- ✅ 80%+ test coverage
- ✅ Zero critical vulnerabilities
- ✅ Complete documentation

---

## 🤝 Contributing

This project is in the architecture/planning phase. Implementation will begin soon.

---

## 📝 License

[Add your license here]

---

## 📞 Contact

For questions or clarifications, refer to the "Open Questions" section in:

- [MASTER_SPEC.md](./docs/architecture/MASTER_SPEC.md)
- [BEHAVIOR_SPEC.md](./docs/architecture/BEHAVIOR_SPEC.md)

---

**Generated**: January 30, 2026  
**Status**: Architecture Complete, Ready for Implementation  
**Next**: Begin Phase 1 - Foundation
