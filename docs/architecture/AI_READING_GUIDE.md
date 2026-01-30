# AI Implementation Guide - Reading Order & Strategy

> Optimized reading strategy for AI code generators (GitHub Copilot, ChatGPT, Claude, etc.)

## 🎯 Reading Strategy for AI

### Why This Order Matters

IAs need to build mental models progressively:
1. **Context first** - Understand what we're building and why
2. **Architecture second** - Learn how to structure the solution
3. **Data third** - Grasp the domain model
4. **Interfaces fourth** - Know what APIs to implement
5. **Business logic fifth** - Understand the rules
6. **Implementation sixth** - See the patterns to follow

---

## 📖 Recommended Reading Order

### Phase 1: Big Picture (READ FIRST)

#### 1. MASTER_SPEC.md ⭐ MANDATORY START
**Time**: 15-20 minutes  
**Read completely**: Yes  

**Key Sections**:
- Executive Summary (what we're building)
- Features Overview (10 domains)
- Migration Architecture (diagrams)
- Key Technical Decisions (why serverless, why PostgreSQL)
- Implementation Roadmap (12 weeks)
- Open Questions (things to clarify)

**Why critical**: Provides complete context before diving into details. Prevents implementing wrong patterns.

**What you'll learn**:
- This is a personal productivity system (not enterprise/B2B)
- 150+ endpoints across 10 domains
- Migrating from Laravel to Node.js serverless
- Target: 10 domain functions, not 150 route functions
- Use PostgreSQL, not DynamoDB
- Use raw SQL, not ORM
- Budget: ~$28/month for 100K requests

---

### Phase 2: System Design (READ SECOND)

#### 2. TARGET_ARCHITECTURE.md ⭐ CRITICAL
**Time**: 30-40 minutes  
**Read completely**: Yes, multiple times  

**Key Sections**:
- Architecture Diagram (how functions connect)
- Function Boundaries (10 domain functions explained)
- Database Strategy (PostgreSQL + PgBouncer)
- Authentication Strategy (JWT + Redis)
- Queue Strategy (email processing)
- Secrets Management
- Cost Optimization
- Observability (logs, metrics, traces)

**Why critical**: This is your implementation blueprint. Every decision is justified here.

**What you'll learn**:
- How to structure the repository
- How to design each function
- How to handle database connections (connection pooling!)
- How to implement JWT auth with Redis caching
- How to set up email queue
- How to bundle functions (esbuild)
- How to log (structured JSON with pino)
- How to validate (Zod schemas)

**Code patterns provided**:
- Database connection pool
- Auth middleware
- Error handling
- Logger setup
- Config management

---

### Phase 3: Data Layer (READ THIRD)

#### 3. DATA_MODEL.md ⭐ ESSENTIAL
**Time**: 40-60 minutes  
**Read sections as needed**: Reference during implementation  

**Structure**:
- 2 databases → 1 PostgreSQL (merge strategy)
- 54 tables organized by domain
- Complete SQL schemas with constraints
- Entity relationships (ER diagrams)
- Indexes strategy
- Business rules per table

**How to use**:
1. Skim all domains first (10 minutes)
2. Deep dive into each domain when implementing that function
3. Use as reference for migrations
4. Copy SQL schemas for migration scripts

**Key tables to understand early**:
- `users` (links to auth service)
- `activity_categories` → `activities` → `activity_follow_ups`
- `habits` → `habit_follow_ups` (streak calculation)
- `wallets` → `wallet_expenses` → `wallet_budgets` (balance consistency)
- `to_dos` → `todo_sub_tasks` (nested structure)

**Critical patterns**:
- UUID primary keys (not auto-increment)
- user_id foreign key on almost everything
- Cascade deletes (user deletion removes all data)
- Timestamps on all tables (created_at, updated_at)
- No soft deletes (hard deletes only)

---

### Phase 4: API Layer (READ FOURTH)

#### 4. API_CONTRACTS.md ⭐ REFERENCE
**Time**: 60+ minutes  
**Read sections as needed**: Don't read all at once  

**Structure**:
- Auth endpoints (7 routes)
- 10 domain modules (150+ routes total)
- Request schemas (JSON)
- Response schemas (JSON)
- Error responses
- Common patterns

**How to use**:
1. Skim structure (10 minutes)
2. When implementing a function, read that domain's endpoints
3. Copy request/response schemas
4. Use for Zod validation schemas
5. Reference during testing

**Example workflow** (implementing Activity function):
1. Go to "Activities Module" section
2. Read all 15 activity endpoints
3. Note: categories, activities, follow-ups
4. Copy request schemas → convert to Zod
5. Copy response schemas → TypeScript types
6. Implement handlers
7. Test against documented responses

**Common patterns**:
- Standard response: `{status: true, data: {...}}`
- Error response: `{status: false, message: "...", errors: [...]}`
- Auth header: `Authorization: Bearer {token}`
- Owner middleware on update/delete
- 200 for success, 401 for auth errors, 404 for not found, 400 for validation

---

### Phase 5: Business Rules (READ FIFTH)

#### 5. BEHAVIOR_SPEC.md ⭐ CRITICAL FOR LOGIC
**Time**: 45-60 minutes  
**Read sections as needed**: Reference when implementing complex logic  

**Structure**:
- 15 use cases with detailed flows
- Business rules and validations
- State machines (habits, budgets, todos)
- Edge cases
- Idempotency requirements
- Data consistency rules

**When to read**:
- **Before implementing auth**: Read UC-1, UC-2, UC-3 (registration, login, refresh)
- **Before implementing habits**: Read UC-5 (streak calculation - COMPLEX!)
- **Before implementing wallet**: Read UC-7, UC-8, UC-9 (balance updates, scheduled expenses, budgets)
- **Before implementing todos**: Read UC-6 (subtasks, recurrence)

**Critical sections**:
- **UC-5: Habit Tracking and Streak Calculation**
  - Streak logic pseudocode provided
  - 4 tracking modes: counter, timer, incremental, decremental
  - Goal achievement rules
  - Max streak calculation
  
- **UC-7: Wallet Balance Management**
  - Balance consistency formula: `balance = initial_balance + SUM(debit - credit)`
  - MUST use database transactions
  - Revert old balance, apply new balance on update
  - Budget balance updates too
  
- **UC-6: To-Do Management**
  - Subtasks independent completion
  - Frequency-based recurrence (mechanism unclear - needs decision)

**Edge cases documented**:
- Expired tokens
- Negative wallet balances (allowed)
- Multiple follow-ups per day
- Concurrent balance updates (use transactions!)
- Missing/invalid OTPs

---

### Phase 6: Implementation Patterns (READ SIXTH)

#### 6. ROUTING_AND_FUNCTIONS.md
**Time**: 30-40 minutes  
**Read completely**: Yes  

**Contains**:
- API Gateway configuration
- 10 function internal routers (code examples)
- Middleware chain (auth → owner → handler)
- Shared router implementation
- Error handling patterns

**What you'll get**:
- Complete router code (copy-paste ready)
- How to structure each function's index.ts
- How to chain middlewares
- How to extract route params
- How to handle errors consistently

**Use this to**:
1. Scaffold each function
2. Set up internal routing
3. Apply auth middleware
4. Apply owner middleware
5. Handle errors uniformly

---

### Phase 7: Reference Docs (AS NEEDED)

#### 7. SYSTEM_MAP.md
**When**: Understanding current Laravel system  
**Sections**: Authentication flow, database overview, limitations

#### 8. STEP1_PROJECT_IDENTIFICATION.md
**When**: Need context on Laravel projects  
**Sections**: Technologies, dependencies, entry points

#### 9. IMPLEMENTATION_BLUEPRINT_PART1.md
**When**: Setting up repository  
**Sections**: Folder structure, package.json, tsconfig.json

#### 10. COMPLETION_SUMMARY.md
**When**: Want overview of what was delivered  
**Sections**: Statistics, checklist, recommendations

---

## 🎓 Reading Tips for AI

### 1. Progressive Detail
- Read MASTER_SPEC fully first (context)
- Read TARGET_ARCHITECTURE fully second (how to build)
- Skim DATA_MODEL (understand structure)
- Reference API_CONTRACTS per function (copy schemas)
- Reference BEHAVIOR_SPEC when logic is complex

### 2. Don't Read Everything Sequentially
- You don't need to memorize 150 endpoints
- You don't need to memorize 54 tables
- Read **just in time**: when implementing that feature

### 3. Focus on Patterns, Not Details
- Learn the **pattern** for CRUD endpoints (create, list, update, delete)
- Learn the **pattern** for owner validation
- Learn the **pattern** for balance updates
- Apply patterns across domains

### 4. Code Examples Over Prose
- TARGET_ARCHITECTURE has code examples → copy them
- ROUTING_AND_FUNCTIONS has router code → copy it
- Adapt, don't reinvent

### 5. Track Open Questions
- See "Open Questions" in MASTER_SPEC and BEHAVIOR_SPEC
- Flag uncertainties (e.g., scheduled expense generation)
- Make reasonable assumptions, document them

---

## 🚀 Implementation Workflow Example

### Example: Implementing Activity Function

**Step 1**: Read MASTER_SPEC (if not done)
- Understand: This is personal productivity app
- Note: Activity tracking is 1 of 10 domains

**Step 2**: Review TARGET_ARCHITECTURE
- Find: "Activity Function" boundary
- Endpoints: 15+ for categories, activities, follow-ups
- Shared logic: owner validation, date parsing

**Step 3**: Check DATA_MODEL
- Tables: `activity_categories`, `activities`, `activity_follow_ups`
- Relationships: category → activity → follow-ups
- Fields: UUIDs, user_id, timestamps

**Step 4**: API_CONTRACTS
- Section: "Activities Module"
- Copy all request/response schemas
- Note auth requirements

**Step 5**: BEHAVIOR_SPEC
- UC-4: Activity Time Tracking
- Rules: follow-ups can span days, no overlap validation
- Edge case: activity deleted → cascade delete follow-ups

**Step 6**: ROUTING_AND_FUNCTIONS
- Copy activity function router code
- Adapt for 15 endpoints
- Add auth middleware

**Step 7**: Implement
- Create `src/functions/activity/index.ts`
- Create handlers folder
- Create validators (Zod)
- Write database queries
- Test

---

## 📊 Cheat Sheet: Quick Reference

| Need to... | Read this | Section |
|------------|-----------|---------|
| Understand project | MASTER_SPEC | Executive Summary |
| Design function | TARGET_ARCHITECTURE | Function Boundaries |
| Create migration | DATA_MODEL | Specific domain tables |
| Implement endpoint | API_CONTRACTS | Specific endpoint |
| Complex logic | BEHAVIOR_SPEC | Specific use case |
| Set up router | ROUTING_AND_FUNCTIONS | Function router |
| Error handling | TARGET_ARCHITECTURE | Error Model |
| Database queries | DATA_MODEL + TARGET_ARCHITECTURE | Database Adapter |
| JWT validation | TARGET_ARCHITECTURE | Auth Middleware |
| Logging | TARGET_ARCHITECTURE | Logger Module |
| Validation | TARGET_ARCHITECTURE | Validation Strategy |

---

## ⚠️ Critical Gotchas for AI

### 1. Database Connections
**Problem**: Serverless functions create many connections  
**Solution**: Use connection pooling (PgBouncer) - see TARGET_ARCHITECTURE  
**Code**: `getDbPool()` max 2 connections per function instance

### 2. Wallet Balance Updates
**Problem**: Race conditions on concurrent updates  
**Solution**: Use database transactions - see BEHAVIOR_SPEC UC-7  
**Code**: Wrap in `transaction()` helper

### 3. Habit Streak Calculation
**Problem**: Complex logic with edge cases  
**Solution**: Follow pseudocode in BEHAVIOR_SPEC UC-5  
**Rule**: Streak resets on missed day, increments on goal met

### 4. JWT Validation
**Problem**: Every request validates token (slow if DB query)  
**Solution**: Use Redis cache - see TARGET_ARCHITECTURE  
**Code**: Check Redis first, fallback to DB

### 5. Owner Validation
**Problem**: Users accessing other users' data  
**Solution**: Owner middleware on all update/delete routes  
**Code**: `ownerMiddleware('resource')` - see ROUTING_AND_FUNCTIONS

### 6. UUID Primary Keys
**Problem**: Different from auto-increment  
**Solution**: Use `uuid` package to generate  
**Code**: `import { v4 as uuidv4 } from 'uuid'`

### 7. Error Responses
**Problem**: Inconsistent error format  
**Solution**: Use AppError classes - see TARGET_ARCHITECTURE  
**Code**: `throw new ValidationError('message', errors)`

---

## 🎯 Success Checklist

Before starting implementation, ensure you've:

- ✅ Read MASTER_SPEC completely
- ✅ Read TARGET_ARCHITECTURE completely
- ✅ Understood the 10 function boundaries
- ✅ Skimmed all 10 domains in DATA_MODEL
- ✅ Reviewed shared module specs (config, logger, database, auth)
- ✅ Understood JWT + Redis authentication flow
- ✅ Understood database transaction requirement for balance updates
- ✅ Understood habit streak calculation logic
- ✅ Located code examples to copy (router, middleware, database)

You're ready to implement! 🚀

---

**Pro Tip for AI**: Implement in this order for fastest progress:
1. Shared modules (foundation)
2. Auth function (critical path)
3. Activity function (simple CRUD - learning)
4. Habit function (complex logic - streak calculation)
5. Wallet function (critical logic - balance consistency)
6. Todo, Shopping, Routine, Learning, Course, Sleep (standard CRUD)

Start with simple, progress to complex. 📈
