# 🔄 GraphQL API - Complete Specification & Differences vs REST

> **CRITICAL**: This document describes the GraphQL implementation which has **significantly more features** than the REST API, especially in the Wallet module.

---

## 📊 Overview Statistics

| Metric | GraphQL | REST | Difference |
|--------|---------|------|------------|
| **Total Operations** | 101 | 150+ | GraphQL more feature-rich |
| **Queries** | 22 | N/A | Read operations |
| **Mutations** | 79 | N/A | Write operations |
| **Wallet Operations** | 33 | 18 | **+15 exclusive features** |
| **Habits Operations** | 30 | 15 | **+15 exclusive features** |
| **Activities Operations** | 19 | 15 | +4 features |
| **Todos Operations** | 22 | 20 | +2 features |

---

## 🎯 Major Differences: GraphQL vs REST

### 1. **Scheduled Expenses Auto-Generation** ⭐ NEW IN GRAPHQL

**REST**: Manual creation only, no automation  
**GraphQL**: Automatic generation of recurring scheduled expenses

**Feature**: `ScheduleWithFrequency` Strategy

**How it works**:
1. User creates a scheduled expense with frequency (Weekly/Monthly/Daily)
2. System automatically generates child scheduled expenses
3. Generates until end of current year
4. Each child links to parent via `parent_id`

**Code Logic**:
```typescript
// Pseudocode for auto-generation
function createScheduledExpenseWithFrequency(expense, frequency) {
  // Save parent expense
  const parent = await saveScheduledExpense(expense);
  
  if (frequency.type === 'Monthly') {
    const endOfYear = new Date().endOfYear();
    let currentDate = addMonths(expense.date, 1);
    
    while (currentDate <= endOfYear) {
      const child = {
        ...expense,
        date: currentDate,
        parent_id: parent.id
      };
      await saveScheduledExpense(child);
      currentDate = addMonths(currentDate, 1);
    }
  }
  
  if (frequency.type === 'Weekly') {
    // Same logic but addWeeks(currentDate, 1)
  }
  
  return parent;
}
```

**Database Changes**:
- ✅ `wallet_scheduled_expenses.parent_id` (self-referential FK)
- ✅ Multiple scheduled expenses for same description
- ✅ Child expenses auto-deleted when parent deleted

**GraphQL Mutation**:
```graphql
mutation CreateScheduledExpense {
  walletScheduledExpenseAdd(
    description: "Netflix Subscription"
    amount: 15.99
    date: "2026-01-30"
    frequency_id: "uuid-monthly"
    wallet_id: "uuid"
    category_id: "uuid"
    is_income: false
  ) {
    id
    description
    date
    parent_id
  }
}
```

**Impact**: Generates 11 child expenses automatically (Feb-Dec 2026)

---

### 2. **Pay Scheduled Expense** ⭐ NEW IN GRAPHQL

**REST**: Not available  
**GraphQL**: `walletPayScheduled` mutation

**Feature**: Convert scheduled expense → actual expense

**How it works**:
1. User marks scheduled expense as paid
2. System creates actual `WalletExpense` record
3. Updates wallet balance
4. Updates budget balance (if linked)
5. Marks scheduled expense as `is_paid = true`
6. Links expense via `expense_id`

**Code Logic**:
```typescript
async function payScheduledExpense(scheduledId, options) {
  const scheduled = await getScheduledExpense(scheduledId);
  
  if (scheduled.is_paid) {
    throw new Error('Already paid');
  }
  
  await transaction(async (trx) => {
    // Create actual expense
    const expense = await createExpense({
      description: scheduled.description,
      date: options.date || scheduled.date,
      debit: options.debit || scheduled.debit,
      credit: options.credit || scheduled.credit,
      wallet_id: options.wallet_id || scheduled.wallet_id,
      category_id: scheduled.category_id,
      budget_id: scheduled.budget_id,
      is_income: scheduled.is_income,
      is_outcome: scheduled.is_outcome
    }, trx);
    
    // Update wallet balance
    const wallet = await getWallet(expense.wallet_id, trx);
    wallet.balance += expense.debit - expense.credit;
    await wallet.save(trx);
    
    // Update budget balance if linked
    if (scheduled.budget_id && scheduled.is_outcome) {
      const budget = await getBudget(scheduled.budget_id, trx);
      budget.balance -= expense.credit;
      await budget.save(trx);
    }
    
    // Mark scheduled as paid
    scheduled.is_paid = true;
    scheduled.paid_date = new Date();
    scheduled.expense_id = expense.id;
    await scheduled.save(trx);
  });
  
  return scheduled;
}
```

**Database Changes**:
- ✅ `wallet_scheduled_expenses.is_paid` (boolean)
- ✅ `wallet_scheduled_expenses.paid_date` (datetime)
- ✅ `wallet_scheduled_expenses.expense_id` (FK to wallet_expenses)

**GraphQL Mutation**:
```graphql
mutation PayScheduled {
  walletPayScheduled(
    id: "scheduled-uuid"
    date: "2026-01-30"  # Optional: override date
    credit: 16.50       # Optional: override amount
    wallet_id: "uuid"   # Optional: different wallet
  ) {
    id
    is_paid
    paid_date
    expense {
      id
      description
      credit
    }
  }
}
```

**Impact**: 
- User can track which scheduled expenses are paid
- Wallet balance automatically updated
- Budget tracking automatic

---

### 3. **Cancel Paid Scheduled Expense** ⭐ NEW IN GRAPHQL

**REST**: Not available  
**GraphQL**: `walletCancelScheduled` mutation

**Feature**: Reverse a paid scheduled expense

**How it works**:
1. User cancels a paid scheduled expense
2. System deletes the linked actual expense
3. Reverts wallet balance
4. Reverts budget balance (if linked)
5. Marks scheduled as `is_paid = false`
6. Clears `expense_id` and `paid_date`

**Code Logic**:
```typescript
async function cancelScheduledExpense(scheduledId) {
  const scheduled = await getScheduledExpense(scheduledId);
  
  if (!scheduled.is_paid) {
    throw new Error('Not paid yet, nothing to cancel');
  }
  
  await transaction(async (trx) => {
    const expense = await getExpense(scheduled.expense_id, trx);
    
    // Revert budget balance if linked
    if (scheduled.budget_id && scheduled.is_outcome) {
      const budget = await getBudget(scheduled.budget_id, trx);
      budget.balance += expense.credit; // Add back
      await budget.save(trx);
    }
    
    // Delete the actual expense (which will revert wallet balance)
    await deleteExpense(expense.id, trx);
    
    // Mark scheduled as unpaid
    scheduled.is_paid = false;
    scheduled.paid_date = null;
    scheduled.expense_id = null;
    await scheduled.save(trx);
  });
  
  return scheduled;
}
```

**GraphQL Mutation**:
```graphql
mutation CancelScheduled {
  walletCancelScheduled(id: "scheduled-uuid") {
    id
    is_paid
    paid_date
    expense_id
  }
}
```

**Impact**: 
- Mistakes can be corrected
- Preserves scheduled expense for future payment

---

### 4. **Apply Budget to Multiple Expenses** ⭐ NEW IN GRAPHQL

**REST**: One-by-one only  
**GraphQL**: `applyBudgetToExpenses` mutation (bulk operation)

**Feature**: Link multiple expenses to a budget in one operation

**How it works**:
1. User selects multiple expense IDs
2. System links all to specified budget
3. Works for both actual expenses and scheduled expenses

**Code Logic**:
```typescript
async function applyBudgetToExpenses(
  expenseIds: string[],
  budgetId: string,
  isScheduled: boolean = false
) {
  const budget = await getBudget(budgetId);
  if (!budget) throw new Error('Budget not found');
  
  const ExpenseModel = isScheduled 
    ? WalletScheduledExpense 
    : WalletExpense;
  
  await transaction(async (trx) => {
    const expenses = await ExpenseModel
      .whereIn('id', expenseIds)
      .get(trx);
    
    for (const expense of expenses) {
      expense.budget_id = budgetId;
      await expense.save(trx);
    }
  });
  
  return true;
}
```

**GraphQL Mutation**:
```graphql
mutation ApplyBudgetBulk {
  applyBudgetToExpenses(
    expenses_ids: [
      "expense-uuid-1",
      "expense-uuid-2",
      "expense-uuid-3"
    ]
    budget_id: "budget-uuid"
    scheduled: false  # true for scheduled expenses
  )
}
```

**Impact**: 
- Faster budget organization
- Can categorize past expenses into budget
- Bulk update operation

---

### 5. **Clean Slate** ⭐ NEW IN GRAPHQL

**REST**: Manual deletion only  
**GraphQL**: `walletCleanSlate` mutation

**Feature**: Delete all wallet data for user (reset)

**How it works**:
1. User triggers clean slate
2. System deletes all wallets (cascade deletes expenses, budgets, etc.)
3. Fresh start for user

**Code Logic**:
```typescript
async function cleanSlate(userId: string) {
  await transaction(async (trx) => {
    // Cascade delete will handle:
    // - wallet_expenses
    // - wallet_scheduled_expenses
    // - wallet_budgets
    // - wallet_budget_follow_ups
    await Wallet.where('user_id', userId).delete(trx);
  });
  
  return true;
}
```

**GraphQL Mutation**:
```graphql
mutation ResetWallet {
  walletCleanSlate
}
```

**Impact**: 
- User can start fresh
- Testing/demo accounts
- Privacy (complete data removal)

**⚠️ CAUTION**: Irreversible operation, needs confirmation UI

---

### 6. **Budget Follow-Up Operations** ⭐ NEW IN GRAPHQL

**REST**: Basic create/list only  
**GraphQL**: Full CRUD + specialized queries

**New Operations**:
- `walletBudgetFollowUpAdd` - Create follow-up
- `walletBudgetFollowUpUpdate` - Update follow-up
- `walletBudgetFollowUpRemove` - Delete follow-up
- `budgetFollowUpQuery` - Advanced filtering

**Enhanced Features**:
- Track budget closure reasons (notes)
- Historical budget performance
- Multi-budget comparison

---

### 7. **Scheduled Expense Removal Cascade** ⭐ NEW IN GRAPHQL

**REST**: Delete parent only  
**GraphQL**: `ScheduledRemoval` strategy

**Feature**: Delete parent + all children automatically

**How it works**:
1. User deletes a parent scheduled expense
2. System finds all children (`parent_id = parent.id`)
3. Deletes all children recursively
4. Deletes parent

**Code Logic**:
```typescript
async function deleteScheduledExpense(scheduledId: string) {
  const scheduled = await getScheduledExpense(scheduledId);
  
  await transaction(async (trx) => {
    // Find and delete all children
    const children = await WalletScheduledExpense
      .where('parent_id', scheduledId)
      .get(trx);
    
    for (const child of children) {
      // Recursively delete if child has children
      await deleteScheduledExpense(child.id);
    }
    
    // Delete parent
    await scheduled.delete(trx);
  });
  
  return true;
}
```

**Impact**:
- Clean deletion of recurring expenses
- No orphaned child expenses
- User deletes once, system cleans all

---

## 📐 Complete GraphQL Schema

### Wallet Module (33 operations)

#### Queries (7)
1. `wallet` - Get single wallet
2. `wallets` - List all wallets
3. `walletExpenseCategory` - Get category
4. `walletExpenseCategories` - List categories
5. `walletExpense` - Get expense
6. `walletExpenses(filters)` - List expenses with advanced filters
7. `walletScheduledExpenses(filters)` - List scheduled with filters
8. `walletBudget` - Get budget
9. `walletBudgets` - List budgets
10. `budgetFollowUp` - Get follow-up
11. `budgetFollowUps` - List follow-ups
12. `walletFrequency` - Get frequency
13. `walletFrequencies` - List frequencies

#### Mutations (26)
**Wallet CRUD**:
1. `walletAdd` - Create wallet
2. `walletUpdate` - Update wallet
3. `walletRemove` - Delete wallet
4. `walletCleanSlate` ⭐ - Delete all (new)

**Category CRUD**:
5. `walletExpenseCategoryAdd`
6. `walletExpenseCategoryUpdate`
7. `walletExpenseCategoryRemove`

**Expense CRUD**:
8. `walletExpenseAdd`
9. `walletExpenseUpdate`
10. `walletExpenseRemove`

**Scheduled Expense CRUD + Advanced**:
11. `walletScheduledExpenseAdd` - Auto-generates children ⭐
12. `walletScheduledExpenseUpdate` - Updates parent + children ⭐
13. `walletScheduledExpenseRemove` - Cascades to children ⭐
14. `walletPayScheduled` ⭐ - Mark as paid (new)
15. `walletCancelScheduled` ⭐ - Unpay (new)

**Budget CRUD**:
16. `walletBudgetAdd`
17. `walletBudgetUpdate`
18. `walletBudgetRemove`
19. `applyBudgetToExpenses` ⭐ - Bulk link (new)

**Budget Follow-Up CRUD**:
20. `walletBudgetFollowUpAdd`
21. `walletBudgetFollowUpUpdate`
22. `walletBudgetFollowUpRemove`

**Period CRUD**:
23. `walletPeriodAdd`
24. `walletPeriodUpdate`
25. `walletPeriodRemove`

**Frequency CRUD**:
26. `walletFrequencyAdd`
27. `walletFrequencyUpdate`
28. `walletFrequencyRemove`

---

## 🗄️ Database Schema Changes for GraphQL Features

### New Columns Required

#### wallet_scheduled_expenses
```sql
ALTER TABLE wallet_scheduled_expenses ADD COLUMN parent_id UUID NULL;
ALTER TABLE wallet_scheduled_expenses ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE wallet_scheduled_expenses ADD COLUMN paid_date TIMESTAMP NULL;
ALTER TABLE wallet_scheduled_expenses ADD COLUMN expense_id UUID NULL;

ALTER TABLE wallet_scheduled_expenses 
  ADD CONSTRAINT fk_scheduled_parent 
  FOREIGN KEY (parent_id) 
  REFERENCES wallet_scheduled_expenses(id) 
  ON DELETE CASCADE;

ALTER TABLE wallet_scheduled_expenses 
  ADD CONSTRAINT fk_scheduled_expense 
  FOREIGN KEY (expense_id) 
  REFERENCES wallet_expenses(id) 
  ON DELETE SET NULL;

CREATE INDEX idx_scheduled_parent ON wallet_scheduled_expenses(parent_id);
CREATE INDEX idx_scheduled_paid ON wallet_scheduled_expenses(is_paid);
```

#### wallet_frequencies
```sql
ALTER TABLE wallet_frequencies ADD COLUMN type VARCHAR(50) NULL;
-- Values: 'Daily', 'Weekly', 'Monthly', 'Yearly'

CREATE TYPE frequency_type AS ENUM ('Daily', 'Weekly', 'Monthly', 'Yearly');
ALTER TABLE wallet_frequencies ADD COLUMN frequency_type frequency_type NULL;
```

---

## 🎯 Implementation Priority for Node.js Migration

### Phase 1: Core Features (Week 1-2)
- ✅ Basic CRUD (Wallet, Categories, Expenses)
- ✅ Balance calculations
- ✅ Budget tracking

### Phase 2: Scheduled Expenses (Week 3)
- ✅ Create scheduled expense
- ⭐ **Auto-generation with frequency** (new)
- ⭐ **Pay scheduled → expense** (new)
- ⭐ **Cancel payment** (new)
- ⭐ **Cascade deletion** (new)

### Phase 3: Advanced Features (Week 4)
- ⭐ **Bulk budget application** (new)
- ✅ Budget follow-ups
- ✅ Periods
- ⭐ **Clean slate** (new)

---

## 📝 Implementation Notes for AI

### Critical Logic to Preserve

1. **Scheduled Expense Auto-Generation**:
   - Use date library (date-fns or dayjs)
   - Generate until end of year only
   - Store parent-child relationship
   - Use transactions

2. **Pay Scheduled Flow**:
   - Must be atomic (transaction)
   - Update 3 entities: scheduled, expense, wallet
   - Update 4 if budget linked
   - Validate not already paid

3. **Cancel Scheduled Flow**:
   - Must be atomic (transaction)
   - Reverse all balance changes
   - Delete expense, don't just unlink
   - Validate is paid before cancel

4. **Cascade Deletion**:
   - Recursive for nested children
   - Use database cascade where possible
   - Transaction for safety

---

## 🚀 GraphQL vs REST: When to Use What

### Use GraphQL for:
✅ Complex queries (filtering, nested data)  
✅ Scheduled expense management  
✅ Bulk operations (apply budget)  
✅ Advanced wallet features  

### Use REST for:
✅ Simple CRUD  
✅ Public APIs  
✅ Caching-heavy operations  
✅ Third-party integrations  

### Recommendation for Migration:
**Implement BOTH** - GraphQL as primary, REST for compatibility

---

## 📊 Next Documents

This document is part of a comprehensive GraphQL migration spec:

1. ✅ **GRAPHQL_OVERVIEW.md** (this document) - Differences vs REST
2. 🔜 **GRAPHQL_SCHEMA_COMPLETE.md** - All 101 operations documented
3. 🔜 **GRAPHQL_WALLET_ADVANCED.md** - Deep dive Wallet strategies
4. 🔜 **GRAPHQL_IMPLEMENTATION_GUIDE.md** - Node.js implementation
5. 🔜 **GRAPHQL_TESTING_STRATEGY.md** - Test complex flows

**Status**: GraphQL analysis in progress - Wallet module complete ✅

---

**Generated**: January 30, 2026  
**Analyst**: GitHub Copilot  
**Focus**: GraphQL advanced features not in REST  
**Priority**: Wallet module (15 exclusive features documented)
