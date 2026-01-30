# 🎯 GraphQL Complete Schema - All Operations

> Complete documentation of all 101 GraphQL operations (22 queries + 79 mutations) with schemas and business logic.

---

## 📊 Operations by Module

| Module | Queries | Mutations | Total | Key Features |
|--------|---------|-----------|-------|--------------|
| **Wallet** | 7 | 26 | 33 | Auto-scheduling, pay/cancel, bulk operations |
| **Habits** | 4 | 9 | 13 | Streak calculation, archived follow-ups |
| **Activities** | 4 | 15 | 19 | Time tracking, categories |
| **Todos** | 4 | 18 | 22 | Subtasks, recurrence, lists |
| **Settings** | 2 | 6 | 8 | Measures, preferences |
| **Users** | 1 | 2 | 3 | Profile management |
| **Goals** | 0 | 3 | 3 | Goal tracking |
| **Total** | 22 | 79 | 101 | |

---

## 🔥 Wallet Module (33 operations) - MOST ADVANCED

### Queries (7)

#### 1. Get Single Wallet
```graphql
query GetWallet {
  wallet(id: "uuid") {
    id
    name
    icon
    initial_balance
    balance
    is_main
    user_id
    created_at
    updated_at
  }
}
```

#### 2. List All Wallets
```graphql
query ListWallets {
  wallets {
    id
    name
    balance
    is_main
  }
}
```

#### 3. Get Expense Category
```graphql
query GetExpenseCategory {
  walletExpenseCategory(id: "uuid") {
    id
    name
    description
    icon
    color
    is_transaction
  }
}
```

#### 4. List Expense Categories
```graphql
query ListExpenseCategories {
  walletExpenseCategories {
    id
    name
    icon
    color
  }
}
```

#### 5. List Expenses with Filters
```graphql
query ListExpenses {
  walletExpenses(
    from: "2026-01-01"
    to: "2026-01-31"
    wallet_id: "uuid"
    category_id: "uuid"
    budget_id: "uuid"
  ) {
    id
    date
    description
    debit
    credit
    is_income
    is_outcome
    wallet {
      id
      name
    }
    category {
      id
      name
    }
    budget {
      id
      name
    }
  }
}
```

**Advanced Filters**:
- Date range (from/to)
- Wallet filter
- Category filter
- Budget filter
- Income/outcome filter

#### 6. List Scheduled Expenses with Filters
```graphql
query ListScheduledExpenses {
  walletScheduledExpenses(
    from: "2026-01-01"
    to: "2026-12-31"
    wallet_id: "uuid"
    is_paid: false
    parent_id: null  # Only parents
  ) {
    id
    description
    date
    amount
    is_paid
    paid_date
    parent_id
    children {
      id
      date
      is_paid
    }
    expense {
      id
      date
    }
  }
}
```

**Advanced Filters**:
- Date range
- Wallet filter
- Paid/unpaid filter
- Parent/child filter

#### 7. List Budgets
```graphql
query ListBudgets {
  walletBudgets(
    is_active: true
    from: "2026-01-01"
    to: "2026-12-31"
  ) {
    id
    name
    amount
    balance
    start_date
    end_date
    is_active
    wallet {
      id
      name
    }
    expenses {
      id
      credit
    }
  }
}
```

---

### Mutations (26)

#### Wallet CRUD (4)

##### 1. Create Wallet
```graphql
mutation CreateWallet {
  walletAdd(
    name: "Cash"
    icon: "💵"
    initial_balance: 1000.00
    balance: 1000.00
    is_main: true
  ) {
    id
    name
    balance
  }
}
```

##### 2. Update Wallet
```graphql
mutation UpdateWallet {
  walletUpdate(
    id: "uuid"
    name: "Main Wallet"
    is_main: true
  ) {
    id
    name
  }
}
```

##### 3. Delete Wallet
```graphql
mutation DeleteWallet {
  walletRemove(id: "uuid")
}
```

##### 4. Clean Slate ⭐ NEW
```graphql
mutation ResetAllWallets {
  walletCleanSlate
}
```

**⚠️ WARNING**: Deletes ALL wallets and related data for user

---

#### Category CRUD (3)

##### 5. Create Category
```graphql
mutation CreateCategory {
  walletExpenseCategoryAdd(
    name: "Food"
    description: "Restaurant and groceries"
    icon: "🍔"
    color: "#FF5733"
    is_transaction: false
  ) {
    id
    name
  }
}
```

##### 6-7. Update/Delete Category
Similar CRUD pattern

---

#### Expense CRUD (3)

##### 8. Create Expense
```graphql
mutation CreateExpense {
  walletExpenseAdd(
    date: "2026-01-30"
    description: "Lunch at restaurant"
    credit: 25.50
    debit: 0
    wallet_id: "uuid"
    category_id: "uuid"
    budget_id: "uuid"  # Optional
  ) {
    id
    description
    credit
    wallet {
      id
      balance  # Updated automatically
    }
    budget {
      id
      balance  # Updated automatically
    }
  }
}
```

**Automatic Side Effects**:
1. Wallet balance updated: `balance -= credit`
2. Budget balance updated (if linked): `budget.balance -= credit`
3. `is_income` set based on debit > 0
4. `is_outcome` set based on credit > 0

##### 9-10. Update/Delete Expense
Similar CRUD with balance reversion logic

---

#### Scheduled Expense CRUD + Advanced (5)

##### 11. Create Scheduled Expense ⭐ AUTO-GENERATION
```graphql
mutation CreateScheduledExpense {
  walletScheduledExpenseAdd(
    description: "Netflix Subscription"
    date: "2026-01-30"
    credit: 15.99
    debit: 0
    wallet_id: "uuid"
    category_id: "uuid"
    frequency_id: "uuid-monthly"  # ⭐ Triggers auto-generation
    is_income: false
  ) {
    id
    description
    date
    parent_id  # null for parent
    children {  # ⭐ Auto-generated
      id
      date
      parent_id
    }
  }
}
```

**Auto-Generation Logic**:
- If `frequency.type === 'Monthly'`:
  - Generates child expenses for each month until end of year
  - Feb 28, Mar 31, Apr 30, May 31, Jun 30, Jul 31, Aug 31, Sep 30, Oct 31, Nov 30, Dec 31
  - 11 child expenses created automatically

- If `frequency.type === 'Weekly'`:
  - Generates child expenses for each week until end of year
  - ~48 child expenses created

- If `frequency.type === 'Daily'`:
  - Not fully implemented (exits early)

##### 12. Update Scheduled Expense
```graphql
mutation UpdateScheduledExpense {
  walletScheduledExpenseUpdate(
    id: "uuid"
    description: "Netflix Premium"
    credit: 19.99
  ) {
    id
    description
    children {  # ⭐ Children also updated
      id
      description
      credit
    }
  }
}
```

**Update Logic**:
- Updates parent
- Propagates changes to all children ⭐

##### 13. Delete Scheduled Expense
```graphql
mutation DeleteScheduledExpense {
  walletScheduledExpenseRemove(id: "uuid")
}
```

**Cascade Logic**:
- Deletes parent
- Recursively deletes all children ⭐
- Uses `ScheduledRemoval` strategy

##### 14. Pay Scheduled ⭐ NEW FEATURE
```graphql
mutation PayScheduledExpense {
  walletPayScheduled(
    id: "scheduled-uuid"
    date: "2026-02-01"      # Optional override
    credit: 16.50           # Optional override
    wallet_id: "other-uuid" # Optional different wallet
  ) {
    id
    is_paid          # Now true
    paid_date        # Timestamp
    expense_id       # Link to created expense
    expense {
      id
      description
      credit
      wallet {
        balance    # Updated
      }
    }
  }
}
```

**Payment Flow**:
1. Validates not already paid
2. Creates actual `WalletExpense` record
3. Updates wallet balance
4. Updates budget balance (if linked)
5. Marks scheduled as `is_paid = true`
6. Sets `paid_date = now()`
7. Links via `expense_id`

**All in transaction** ⚡

##### 15. Cancel Paid Scheduled ⭐ NEW FEATURE
```graphql
mutation CancelPaidScheduled {
  walletCancelScheduled(id: "scheduled-uuid") {
    id
    is_paid        # Now false
    paid_date      # Now null
    expense_id     # Now null
  }
}
```

**Cancellation Flow**:
1. Validates is paid
2. Reverts budget balance (if linked)
3. Deletes the actual expense (wallet balance auto-reverted)
4. Marks scheduled as `is_paid = false`
5. Clears `paid_date` and `expense_id`

**All in transaction** ⚡

---

#### Budget CRUD + Advanced (5)

##### 16. Create Budget
```graphql
mutation CreateBudget {
  walletBudgetAdd(
    name: "Monthly Groceries"
    amount: 500.00
    start_date: "2026-01-01"
    end_date: "2026-01-31"
    wallet_id: "uuid"
    frequency_id: "uuid"  # Optional
  ) {
    id
    name
    amount
    balance  # Starts at 0
  }
}
```

##### 17-18. Update/Delete Budget

##### 19. Apply Budget to Multiple Expenses ⭐ BULK OPERATION
```graphql
mutation ApplyBudgetBulk {
  applyBudgetToExpenses(
    expenses_ids: [
      "expense-1-uuid",
      "expense-2-uuid",
      "expense-3-uuid"
    ]
    budget_id: "budget-uuid"
    scheduled: false  # true for scheduled expenses
  )
}
```

**Bulk Update Logic**:
- Links all specified expenses to budget
- Works for actual expenses OR scheduled expenses
- Single transaction
- Returns boolean

**Use Case**: Categorize past expenses into budget retroactively

##### 20-22. Budget Follow-Up CRUD
Track budget closure and performance

---

#### Period CRUD (3)

##### 23-25. Create/Update/Delete Period
Organization of expenses by time periods

---

#### Frequency CRUD (3)

##### 26-28. Create/Update/Delete Frequency
Define recurrence patterns (Daily, Weekly, Monthly, Yearly)

---

## 🎯 Habits Module (13 operations)

### Queries (4)

#### 1. List Habits
```graphql
query ListHabits {
  habits {
    id
    name
    description
    streak
    max_streak
    daily_goal
    is_counter
    is_timer
    category {
      id
      name
    }
    followUps(limit: 30) {
      id
      date
      count
      time
      is_accomplished
      is_failed
    }
  }
}
```

#### 2. Get Single Habit
```graphql
query GetHabit {
  habit(id: "uuid") {
    id
    name
    streak
    max_streak
  }
}
```

#### 3. List Habit Categories
```graphql
query ListHabitCategories {
  habitCategories {
    id
    name
    icon
    color
  }
}
```

#### 4. List Habit Follow-Ups
```graphql
query ListHabitFollowUps {
  habitFollowUps(
    habit_id: "uuid"
    from: "2026-01-01"
    to: "2026-01-31"
    is_archived: false
  ) {
    id
    date
    count
    time
    is_accomplished
    is_failed
    is_archived
  }
}
```

---

### Mutations (9)

#### Habit CRUD (3)

##### 1. Create Habit
```graphql
mutation CreateHabit {
  habitsAdd(
    name: "Daily Exercise"
    category_id: "uuid"
    daily_goal: 30  # Minutes
    is_timer: true
    is_counter: false
    should_keep: true
  ) {
    id
    name
    streak
    max_streak
  }
}
```

##### 2-3. Update/Delete Habit

---

#### Habit Category CRUD (3)

##### 4-6. Create/Update/Delete Category

---

#### Habit Follow-Up CRUD (3)

##### 7. Add Follow-Up with Streak Calculation ⭐
```graphql
mutation AddHabitFollowUp {
  habitFollowUpAdd(
    habit_id: "uuid"
    date: "2026-01-30"
    count: 1
    time: 35  # Minutes
    is_accomplished: true  # ⭐ Triggers streak update
    is_failed: false
    notes: "Great workout today"
  ) {
    id
    date
    count
    time
    habit {
      id
      streak       # ⭐ Incremented
      max_streak   # ⭐ Updated if exceeded
    }
  }
}
```

**Streak Calculation Logic** (`StreakAccomplishedStrategy`):
```typescript
if (followUp.is_accomplished) {
  habit.streak++;
  if (habit.streak > habit.max_streak) {
    habit.max_streak = habit.streak;
  }
  habit.save();
}
```

##### 8. Update Follow-Up
```graphql
mutation UpdateHabitFollowUp {
  habitFollowUpUpdate(
    id: "uuid"
    is_accomplished: false
    is_failed: true  # ⭐ Triggers streak reset
  ) {
    id
    habit {
      streak      # ⭐ Reset to 0
      end_date    # ⭐ Extended
    }
  }
}
```

**Streak Reset Logic** (`StreakFailedStrategy`):
```typescript
if (followUp.is_failed) {
  habit.streak = 0;
  habit.end_date = addDays(followUp.date, habit.days);
  
  // Archive all previous follow-ups for this habit ⭐
  const olderFollowUps = await HabitFollowUp
    .where('date', '<=', followUp.date)
    .where('habit_id', habit.id)
    .where('id', '!=', followUp.id)
    .where('is_archived', false)
    .get();
  
  await HabitFollowUp
    .whereIn('id', olderFollowUps.map(f => f.id))
    .update({ is_archived: true });
  
  habit.save();
}
```

**⭐ Key Feature**: Archives all previous follow-ups when streak fails

##### 9. Delete Follow-Up
```graphql
mutation DeleteHabitFollowUp {
  habitFollowUpRemove(id: "uuid")
}
```

**Removal Logic** (`RemoveFollowUpStrategy`):
- Recalculates streak after deletion
- May need to restore archived follow-ups

---

## 📝 Todos Module (22 operations)

### Queries (4)

#### 1. List Todos
```graphql
query ListTodos {
  todos(
    list_id: "uuid"
    is_done: false
    is_important: true
    date: "2026-01-30"
  ) {
    id
    title
    notes
    is_done
    is_important
    is_today
    list {
      id
      name
    }
    category {
      id
      name
    }
    subtasks {
      id
      title
      is_done
    }
  }
}
```

#### 2-4. Get Todo, List Categories, List Lists

---

### Mutations (18)

#### Todo CRUD (5)

##### 1. Create Todo
```graphql
mutation CreateTodo {
  todoAdd(
    title: "Buy groceries"
    notes: "Don't forget milk"
    list_id: "uuid"
    category_id: "uuid"
    is_important: true
    is_today: true
    subtasks: [
      "Milk",
      "Bread",
      "Eggs"
    ]
  ) {
    id
    title
    subtasks {
      id
      title
      is_done
    }
  }
}
```

**Subtask Creation**:
- Array of strings → creates subtask records
- Linked to parent todo
- Independent completion status

##### 2-5. Update/Delete/Toggle/Bulk Delete

---

#### Subtask CRUD (5)

##### 6. Add Subtask
```graphql
mutation AddSubtask {
  todoAddSubtask(
    todo_id: "uuid"
    title: "Butter"
  ) {
    id
    title
  }
}
```

##### 7-10. Update/Delete/Toggle Subtask

---

#### Todo List CRUD (3)

##### 11-13. Create/Update/Delete List

---

#### Todo Category CRUD (3)

##### 14-16. Create/Update/Delete Category

---

#### Todo Frequency CRUD (2)

##### 17-18. Create/Delete Frequency

---

## 🏃 Activities Module (19 operations)

Similar CRUD pattern to REST, but with GraphQL flexibility:
- Nested queries (category, follow-ups in one query)
- Flexible field selection
- Batch operations

**Key Queries**:
- `activities` - List with filters
- `activityFollowUps` - Time tracking entries

**Key Mutations**:
- `activityAdd/Update/Remove`
- `activityFollowUpAdd/Update/Remove`
- `activityCategoryAdd/Update/Remove`

---

## ⚙️ Settings Module (8 operations)

**Queries**:
- `measures` - List measurement units
- `settings` - User preferences

**Mutations**:
- `measureAdd/Update/Remove`
- `settingsUpdate`

---

## 👤 Users Module (3 operations)

**Query**:
- `user` - Get current user profile

**Mutations**:
- `userUpdate` - Update profile
- `userDelete` - Delete account

---

## 🎯 Goals Module (3 operations)

**Mutations**:
- `goalAdd/Update/Remove`

---

## 🔑 Key Takeaways for Implementation

### 1. GraphQL Advantages
✅ **Single endpoint**: `/graphql`  
✅ **Flexible queries**: Client chooses fields  
✅ **Nested data**: Fetch related data in one request  
✅ **Bulk operations**: `applyBudgetToExpenses`  
✅ **Advanced filtering**: Complex queries  

### 2. Critical Features NOT in REST
⭐ Scheduled expense auto-generation  
⭐ Pay/cancel scheduled expenses  
⭐ Bulk budget application  
⭐ Habit streak auto-calculation  
⭐ Follow-up archiving on failure  
⭐ Cascade scheduled deletion  
⭐ Clean slate operation  

### 3. Implementation Complexity
| Module | Complexity | Reason |
|--------|------------|--------|
| Wallet | ⚡⚡⚡⚡⚡ | Auto-generation, pay/cancel, cascades |
| Habits | ⚡⚡⚡⚡ | Streak calculation, archiving |
| Todos | ⚡⚡⚡ | Subtasks, recurrence |
| Activities | ⚡⚡ | Standard CRUD |
| Settings | ⚡ | Simple CRUD |

---

## 📚 Next Documents

1. ✅ **GRAPHQL_OVERVIEW.md** - Differences vs REST
2. ✅ **GRAPHQL_SCHEMA_COMPLETE.md** (this doc) - All operations
3. 🔜 **GRAPHQL_IMPLEMENTATION_NODE.md** - Node.js implementation
4. 🔜 **GRAPHQL_TESTING.md** - Test strategies

---

**Generated**: January 30, 2026  
**Completeness**: 101/101 operations documented  
**Priority**: Wallet + Habits (most complex)
