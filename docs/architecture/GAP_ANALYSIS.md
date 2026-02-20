# 📊 Gap Analysis: Current State vs GraphQL Requirements

**Date**: January 30, 2026  
**Project**: Xavier Platform Node.js Migration  
**Purpose**: Identify what exists vs what's needed for full GraphQL implementation

---

## 🎯 Executive Summary

**Current Implementation**: Basic wallet system with accounts and transactions (REST-style)  
**Target Implementation**: Advanced wallet system with scheduled expenses, budgets, and automation (GraphQL-style from PHP version)

**Gap Level**: 🔴 **HIGH** - Significant database schema changes required

---

## 📋 Database Tables Comparison

### ✅ Tables That EXIST (Current)

| Table                 | Columns                                                                                     | Status      | Notes                     |
| --------------------- | ------------------------------------------------------------------------------------------- | ----------- | ------------------------- |
| `wallet_accounts`     | id, user_id, name, type, currency, initial_balance, current_balance, color, icon, is_active | ✅ Complete | Bank/cash accounts system |
| `wallet_categories`   | id, user_id, name, type, color, icon, is_system                                             | ✅ Complete | Income/expense categories |
| `wallet_transactions` | id, user_id, account_id, category_id, type, amount, description, transaction_date, notes    | ✅ Complete | Transaction records       |

**Total Existing**: 3 tables

---

### ❌ Tables That DON'T EXIST (Required for GraphQL)

| Table                       | Purpose                                      | Priority    | Features Blocked            |
| --------------------------- | -------------------------------------------- | ----------- | --------------------------- |
| `wallet_wallets`            | Main wallet entity (different from accounts) | 🔴 CRITICAL | All wallet operations       |
| `wallet_expenses`           | Individual expenses (debit/credit)           | 🔴 CRITICAL | Expense tracking            |
| `wallet_scheduled_expenses` | Scheduled/recurring expenses                 | 🔴 CRITICAL | Auto-generation, Pay/Cancel |
| `wallet_budgets`            | Budget management                            | 🟡 HIGH     | Budget tracking             |
| `wallet_budget_follow_ups`  | Budget closure tracking                      | 🟢 MEDIUM   | Budget history              |
| `wallet_periods`            | Time periods for budgets                     | 🟢 MEDIUM   | Period-based budgets        |
| `wallet_frequencies`        | Recurrence patterns (Daily/Weekly/Monthly)   | 🔴 CRITICAL | Auto-generation             |

**Total Missing**: 7 tables

---

## 🔍 Detailed Comparison

### 1. Wallet Concept Mismatch

#### Current System (wallet_accounts)

```sql
CREATE TABLE wallet_accounts (
  id SERIAL,
  user_id INTEGER,
  name VARCHAR(255),
  type VARCHAR(50),  -- bank, cash, credit_card, etc.
  currency VARCHAR(3),
  initial_balance DECIMAL(15,2),
  current_balance DECIMAL(15,2)
);
```

**Purpose**: Represents bank accounts/payment methods  
**Transactions**: Records money movement between accounts

#### Required System (wallet_wallets)

```sql
-- NOT EXISTS - NEED TO CREATE
CREATE TABLE wallet_wallets (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR(255),
  icon VARCHAR(50),
  initial_balance DECIMAL(15,2),
  balance DECIMAL(15,2),  -- Updated by expenses
  is_main BOOLEAN
);
```

**Purpose**: Logical money containers (not tied to bank accounts)  
**Expenses**: Records spending/income directly

**Key Difference**:

- Current: Account-centric (like banking app)
- Required: Expense-centric (like budgeting app)

---

### 2. Expense Tracking System

#### Current System (wallet_transactions)

```sql
CREATE TABLE wallet_transactions (
  id SERIAL,
  account_id INTEGER,  -- FK to wallet_accounts
  category_id INTEGER,
  type VARCHAR(50),    -- income, expense, transfer
  amount DECIMAL(15,2),
  transaction_date TIMESTAMP
);
```

**Model**: Transfer money between accounts  
**Balance**: Tracked at account level

#### Required System (wallet_expenses)

```sql
-- NOT EXISTS - NEED TO CREATE
CREATE TABLE wallet_expenses (
  id UUID PRIMARY KEY,
  wallet_id UUID,      -- FK to wallet_wallets
  category_id UUID,
  budget_id UUID,      -- Optional FK to wallet_budgets
  date DATE,
  description VARCHAR(255),
  debit DECIMAL(15,2),
  credit DECIMAL(15,2),
  is_income BOOLEAN,
  is_outcome BOOLEAN
);
```

**Model**: Direct expense recording  
**Balance**: Calculated as `balance += debit - credit`

**Key Difference**:

- Current: Double-entry bookkeeping (account transfers)
- Required: Single-entry (direct expense logging)

---

### 3. Scheduled Expenses (Auto-Generation Feature)

#### Current System

❌ **DOES NOT EXIST**

#### Required System

```sql
-- NOT EXISTS - NEED TO CREATE
CREATE TABLE wallet_scheduled_expenses (
  id UUID PRIMARY KEY,
  wallet_id UUID,
  category_id UUID,
  budget_id UUID,
  frequency_id UUID,   -- FK to wallet_frequencies

  description VARCHAR(255),
  amount DECIMAL(15,2),
  date DATE,

  -- Auto-generation fields (NEW)
  parent_id UUID,      -- Self-referential FK

  -- Payment tracking (NEW)
  is_paid BOOLEAN DEFAULT FALSE,
  paid_date TIMESTAMP,
  expense_id UUID,     -- FK to wallet_expenses

  is_income BOOLEAN,
  is_outcome BOOLEAN
);
```

**Features Enabled**:

1. ⭐ Auto-generate recurring expenses (parent/child relationship)
2. ⭐ Mark scheduled expense as paid (creates actual expense)
3. ⭐ Cancel payment (reverses expense creation)
4. ⭐ Cascade deletion (delete parent → delete all children)

**Current State**: ❌ Cannot implement ANY of these features

---

### 4. Budget Management

#### Current System

❌ **DOES NOT EXIST**

#### Required System

```sql
-- NOT EXISTS - NEED TO CREATE
CREATE TABLE wallet_budgets (
  id UUID PRIMARY KEY,
  wallet_id UUID,
  frequency_id UUID,
  name VARCHAR(255),
  description TEXT,
  icon VARCHAR(50),
  amount DECIMAL(15,2),
  balance DECIMAL(15,2),  -- Decrements as expenses are added
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN
);
```

**Features Enabled**:

1. Budget tracking per category
2. Link expenses to budgets
3. Bulk apply budget to multiple expenses ⭐
4. Budget balance auto-update

**Current State**: ❌ No budget functionality at all

---

### 5. Frequencies (Recurrence Patterns)

#### Current System

❌ **DOES NOT EXIST**

#### Required System

```sql
-- NOT EXISTS - NEED TO CREATE
CREATE TABLE wallet_frequencies (
  id UUID PRIMARY KEY,
  user_id UUID,
  name VARCHAR(255),
  description TEXT,
  frequency_type VARCHAR(50)  -- Daily, Weekly, Monthly, Yearly
);
```

**Purpose**: Define recurrence patterns for scheduled expenses  
**Used By**: Auto-generation algorithm

**Example**:

- "Monthly" → Generates 11 child expenses (Feb-Dec)
- "Weekly" → Generates ~50 child expenses (rest of year)

**Current State**: ❌ Cannot define recurrence patterns

---

## 🎨 GraphQL Schema Impact

### Operations That WORK With Current DB

✅ **Basic Operations (3)**:

- `wallets` query (can map from wallet_accounts)
- `walletAdd` mutation (can map to wallet_accounts)
- `walletCategories` query (wallet_categories exists)

### Operations That DON'T WORK (98 operations)

❌ **Expenses Module** (19 operations blocked):

- All expense CRUD
- Expense filtering
- Date range queries

❌ **Scheduled Expenses Module** (22 operations blocked):

- Scheduled expense CRUD
- ⭐ Auto-generation with frequency
- ⭐ `walletPayScheduled`
- ⭐ `walletCancelScheduled`
- Parent-child relationship queries

❌ **Budget Module** (19 operations blocked):

- Budget CRUD
- Budget follow-ups
- ⭐ `applyBudgetToExpenses` (bulk)
- Budget balance tracking

❌ **Advanced Operations** (5 blocked):

- ⭐ `walletCleanSlate`
- Period management
- Frequency management

---

## 🚧 Migration Strategy

### Phase 1: Core Schema (REQUIRED)

**Time Estimate**: 4-6 hours  
**Priority**: 🔴 CRITICAL

**New Tables**:

1. `wallet_wallets` (main wallet entity)
2. `wallet_expenses` (expense tracking)
3. `wallet_frequencies` (recurrence patterns)
4. `wallet_scheduled_expenses` (with parent_id, is_paid, paid_date, expense_id)

**Side Effects**:

- Need to map existing wallet_accounts → wallet_wallets
- Need to migrate wallet_transactions → wallet_expenses
- Data migration script required

**Risks**:

- Breaking existing REST endpoints
- Data loss if migration not tested

**Recommendation**: Create parallel tables, migrate data, update REST controllers gradually

---

### Phase 2: Budget System

**Time Estimate**: 2-3 hours  
**Priority**: 🟡 HIGH

**New Tables**:

1. `wallet_budgets`
2. `wallet_budget_follow_ups`
3. `wallet_periods`

**Dependencies**: Requires Phase 1 complete

---

### Phase 3: Advanced Features

**Time Estimate**: 6-8 hours  
**Priority**: 🟢 MEDIUM

**Features**:

1. Auto-generation algorithm
2. Pay/Cancel scheduled
3. Bulk operations
4. Clean slate
5. Cascade deletion

**Dependencies**: Requires Phase 1 & 2 complete

---

## 📊 Effort Estimation

| Phase       | Tables   | GraphQL Ops | REST Impact | Time   | Risk   |
| ----------- | -------- | ----------- | ----------- | ------ | ------ |
| **Phase 1** | 4 tables | +40 ops     | 🔴 Breaking | 4-6h   | HIGH   |
| **Phase 2** | 3 tables | +30 ops     | 🟢 Additive | 2-3h   | LOW    |
| **Phase 3** | 0 tables | +28 ops     | 🟢 Additive | 6-8h   | MEDIUM |
| **Total**   | 7 tables | +98 ops     | Mixed       | 12-17h | MEDIUM |

---

## 🎯 Recommendations

### Option A: Full Migration (Recommended for long-term)

**Timeline**: 12-17 hours  
**Pros**:

- Complete feature parity with PHP version
- Clean architecture
- All 15 advanced features

**Cons**:

- Requires breaking changes
- Need data migration
- Testing complex

**Steps**:

1. Create new tables (Phase 1)
2. Write data migration script
3. Update REST controllers to use new tables
4. Implement GraphQL resolvers
5. Test extensively
6. Deploy with migration

---

### Option B: Hybrid Approach (Recommended for safety)

**Timeline**: Split into 3 deployments  
**Pros**:

- Gradual rollout
- Test each phase
- Rollback easier

**Cons**:

- Longer calendar time
- Temporary inconsistencies

**Steps**:

1. **Week 1**: Phase 1 - Core schema + basic GraphQL
2. **Week 2**: Phase 2 - Budget system
3. **Week 3**: Phase 3 - Advanced features

---

### Option C: Minimal MVP (Fastest)

**Timeline**: 6-8 hours  
**Scope**: Only auto-generation + pay/cancel scheduled

**Tables Required**:

- `wallet_frequencies`
- Modify `wallet_scheduled_expenses` (add 4 columns)

**Features Enabled**:

- ⭐ Auto-generation
- ⭐ Pay scheduled
- ⭐ Cancel scheduled

**Features NOT Enabled**:

- Budgets
- Bulk operations
- Clean slate
- Full expense tracking

**Pros**:

- Minimal changes
- Can build on existing wallet_transactions
- Lower risk

**Cons**:

- Not full feature parity
- Some GraphQL ops still blocked

---

## 🔐 Data Migration Considerations

### Existing Data

You have these tables with potentially existing data:

- `wallet_accounts` → Need to map to `wallet_wallets`
- `wallet_transactions` → Need to map to `wallet_expenses`
- `wallet_categories` → Can keep as-is (compatible)

### Migration Script Required

```sql
-- Example migration
INSERT INTO wallet_wallets (id, user_id, name, balance, is_main)
SELECT
  gen_random_uuid(),
  user_id,
  name,
  current_balance,
  type = 'bank'  -- Mark first bank account as main
FROM wallet_accounts;

-- Map transactions → expenses
INSERT INTO wallet_expenses (...)
SELECT ... FROM wallet_transactions;
```

**Complexity**: MEDIUM  
**Risk**: Data loss if not tested properly

---

## 🎬 Next Steps

**Decision Required**:

1. Choose approach (A, B, or C)
2. Decide on data migration strategy
3. Set timeline expectations
4. Approve breaking changes to REST API

**Questions for User**:

1. Do you have existing production data in wallet_accounts/wallet_transactions?
2. Are REST endpoints currently being used by clients?
3. Can we afford breaking changes, or need backwards compatibility?
4. Timeline preference: Fast (6-8h) vs Complete (12-17h)?

---

**Status**: ⏸️ Awaiting user decision on approach and scope
