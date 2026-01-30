# Behavioral Specification

This document defines **WHAT** the system does, independent of implementation details.

---

## Core Use Cases

### UC-1: User Registration and Verification

**Actor**: Unauthenticated User

**Flow**:
1. User submits registration with name, email, password
2. System validates uniqueness of email
3. System validates password strength (min 8 characters)
4. System generates 6-digit OTP
5. System creates user record with `is_account_verified = false`
6. System sends verification email with encoded link (OTP + user_id base64)
7. User clicks verification link
8. System validates OTP and user_id match
9. System marks account as verified
10. System clears OTP

**Business Rules**:
- Email must be unique across all users
- Password must be at least 8 characters
- OTP is 6 numeric digits
- Verification link format: `base64({OTP}{user_id})`
- Unverified users can still log in (assumed, needs confirmation)
- OTP can be regenerated (invalidates previous)

**Edge Cases**:
- Invalid/expired OTP → 404 error
- Duplicate email → 400 validation error
- Already verified account trying to re-verify → should succeed gracefully

**Invariants**:
- One user per email
- OTP cleared after verification

---

### UC-2: User Authentication (Login)

**Actor**: Registered User

**Flow**:
1. User submits email and password
2. System validates credentials
3. System generates access token (JWT via Sanctum)
4. System generates refresh token
5. System stores refresh token linked to access token
6. System optionally caches session in Redis
7. System returns user data + access token + refresh token

**Business Rules**:
- Access tokens expire (configurable, default unclear)
- Refresh tokens expire after 30 days (43200 minutes)
- Multiple sessions allowed (no single-device restriction)
- Redis session includes expiration timestamp

**Edge Cases**:
- Wrong credentials → 401 error
- Account not verified → still allowed to log in (needs confirmation)
- Multiple active sessions → all remain valid

**Invariants**:
- Each access token has exactly one refresh token
- Token expiration cannot be extended (must refresh)

---

### UC-3: Token Refresh

**Actor**: Authenticated User with expired access token

**Flow**:
1. Client detects expired access token
2. Client submits refresh token
3. System validates refresh token exists and not expired
4. System revokes old access token
5. System generates new access token
6. System generates new refresh token
7. System updates Redis session (if enabled)
8. System returns new tokens

**Business Rules**:
- Old tokens immediately invalidated
- Refresh token single-use (new one generated)
- Refresh token expiration resets (30 more days)

**Edge Cases**:
- Expired refresh token → user must re-login
- Invalid refresh token → 401 error
- Refresh token used twice → second attempt fails

---

### UC-4: Activity Time Tracking

**Actor**: Authenticated User

**Flow**:
1. User creates activity with category
2. User creates follow-up for activity with date, time range, duration
3. System validates activity belongs to user
4. System stores follow-up
5. System optionally updates activity's `spent_time` accumulator

**Business Rules**:
- Activity must belong to user
- Follow-up duration can be calculated from time range OR manually entered
- Follow-ups can span multiple days (start_date, end_date)
- Users can track multiple activities per day
- No overlap validation (user can be in two activities simultaneously - unrealistic but allowed)

**Edge Cases**:
- Follow-up without time range → duration must be provided
- Negative duration → validation error (assumed)
- Date in future → allowed
- Activity deleted → all follow-ups cascade delete

**Invariants**:
- Follow-up always belongs to exactly one activity
- Activity always belongs to exactly one user

---

### UC-5: Habit Tracking and Streak Calculation

**Actor**: Authenticated User

**Flow**:
1. User creates habit with tracking mode (counter, timer, incremental, decremental)
2. User sets daily goal
3. User logs daily follow-up (count or time)
4. System checks if goal met
5. System updates streak (increment if goal met, reset if missed)
6. System updates max_streak if current exceeds it

**Business Rules**:
- **Counter mode**: Track discrete events (e.g., drink 8 glasses of water)
- **Timer mode**: Track duration (e.g., exercise 30 minutes)
- **Incremental**: Goal is to increase (e.g., push-ups count)
- **Decremental**: Goal is to decrease (e.g., cigarettes smoked)
- **Should keep**: Positive habit (exercise, reading)
- **Should avoid**: Negative habit to break (smoking, junk food)
- Streak calculation: consecutive days meeting goal
- Max streak: highest streak achieved
- Days counter: total days tracked

**Streak Logic**:
```
if (today's follow-up meets goal) {
  streak++
  if (streak > max_streak) max_streak = streak
} else if (yesterday had no follow-up) {
  streak = 0  // Missed day breaks streak
}
```

**Edge Cases**:
- Multiple follow-ups per day → sum counts/times
- Future-dated follow-up → doesn't affect current streak
- Editing past follow-up → recalculate streak (complex, likely not implemented)
- Habit with no goal → streak always 0

**Invariants**:
- `max_streak >= streak`
- `days >= streak`
- Streak resets to 0 or 1, never negative

---

### UC-6: To-Do Management with Subtasks

**Actor**: Authenticated User

**Flow**:
1. User creates to-do list
2. User creates to-do within list with title, category, optional frequency
3. User optionally adds subtasks (array of strings)
4. System creates to-do and subtask records
5. User toggles to-do or subtask completion
6. System updates `is_done` flag

**Business Rules**:
- To-do must belong to a list
- To-do can have category (nullable)
- To-do can have frequency for recurring tasks
- Subtasks inherit parent to-do's user_id (implicit)
- Marking parent as done doesn't auto-mark subtasks
- **is_important**: User-defined priority flag
- **is_today**: Quick filter for today's tasks
- **is_this_week**: Quick filter for this week's tasks
- **application_date**: Scheduled date for task

**Recurrence Logic** (unclear implementation):
- Frequency defines recurrence pattern (days interval)
- System should generate new to-do after completion (not implemented?)
- Or user manually marks recurring tasks?

**Edge Cases**:
- To-do with frequency but no application_date → unclear behavior
- Deleting list → cascades to all to-dos and subtasks
- Bulk delete → multiple to-dos deleted atomically
- Subtask without parent → prevented by FK constraint

**Invariants**:
- Subtask always belongs to exactly one to-do
- To-do always belongs to exactly one list
- Category can be null

---

### UC-7: Wallet Balance Management

**Actor**: Authenticated User

**Flow**:
1. User creates wallet with initial balance
2. User creates expense/income with debit or credit
3. System updates wallet balance:
   - `balance += debit` (income)
   - `balance -= credit` (expense)
4. If expense linked to budget, update budget balance similarly
5. System saves expense

**Business Rules**:
- **Debit > 0**: Income transaction, `is_income = true`
- **Credit > 0**: Expense transaction, `is_outcome = true`
- **Debit and Credit cannot both be > 0** (assumed, validation unclear)
- Balance can be negative (overdraft allowed)
- Wallet marked as `is_main` designates primary wallet (only one main per user - assumed)

**Balance Consistency**:
- Creating expense: `wallet.balance += debit - credit`
- Updating expense: 
  1. Revert old: `old_wallet.balance += old_credit - old_debit`
  2. Apply new: `new_wallet.balance += new_debit - new_credit`
- Deleting expense: `wallet.balance += credit - debit` (reverse transaction)

**Budget Tracking**:
- If expense has `budget_id`, also update budget balance
- Budget balance starts at 0, increases with expenses
- When `budget.balance >= budget.amount`, budget exceeded

**Edge Cases**:
- Expense without budget → only wallet affected
- Moving expense to different wallet → update both wallets
- Moving expense to different budget → update both budgets
- Negative balance → allowed

**Invariants**:
- `wallet.balance = initial_balance + SUM(debit - credit)`
- `budget.balance = SUM(expenses.debit - expenses.credit) WHERE budget_id = budget.id`

---

### UC-8: Scheduled Expenses

**Actor**: Authenticated User

**Purpose**: Define recurring expenses (rent, subscriptions, salary)

**Flow**:
1. User creates scheduled expense with amount, frequency, start/end dates
2. System stores template
3. **Automated generation** (unclear if implemented):
   - Cron job checks due scheduled expenses daily
   - Generates actual expense records in wallet_expenses
   - Marks scheduled expense as `paid = true` for that period
   - Links generated expense via `expense_id`

**Business Rules**:
- Frequency defines recurrence (daily, weekly, monthly, yearly)
- Start date: when recurrence begins
- End date: when recurrence stops (nullable = indefinite)
- `is_income`: Marks as recurring income (salary) vs expense
- `paid`: Unclear usage - likely tracks if current period generated

**Generation Logic** (assumed, not confirmed):
```
for each scheduled_expense where start_date <= today <= end_date:
  last_generated = last expense with expense_id = scheduled_expense.id
  next_due_date = last_generated.date + frequency.days
  if next_due_date == today:
    create wallet_expense from template
    link to scheduled_expense
```

**Edge Cases**:
- Frequency null → one-time scheduled expense (contradictory)
- Manual vs auto generation → unclear
- Deleting scheduled expense → doesn't delete generated expenses (assumed)
- Editing scheduled expense → doesn't retroactively update generated expenses

**Invariants**:
- Scheduled expense always belongs to wallet and category
- Generated expenses maintain audit trail via `expense_id`

---

### UC-9: Budget Tracking and Closure

**Actor**: Authenticated User

**Flow**:
1. User creates budget with amount, date range, linked wallet
2. User creates expenses linked to budget
3. System accumulates expenses in `budget.balance`
4. User monitors spending vs budget
5. When budget period ends, user closes budget
6. System creates budget follow-up with final balance and notes
7. System marks budget as inactive (assumed)

**Business Rules**:
- Budget tracks spending for specific time period (start_date to end_date)
- `amount`: Budget limit
- `balance`: Current accumulated spending
- `since`: Start tracking date (purpose unclear, differs from start_date?)
- Only active budgets count in current tracking
- Multiple budgets can overlap (e.g., monthly groceries + yearly vacation)

**Budget Alerts** (not implemented):
- Notify when 80% of budget spent
- Notify when budget exceeded

**Edge Cases**:
- Budget without expenses → balance = 0
- Budget exceeded → no automatic action (user informed only)
- Expenses added after budget closed → still update balance (assumed)
- Deleting budget → expenses remain but unlinked (SET NULL)

**Invariants**:
- `budget.balance <= budget.amount` is ideal, but not enforced
- Budget period cannot overlap for same category (not enforced, allowed)

---

### UC-10: Shopping List Management

**Actor**: Authenticated User

**Flow**:
1. User creates shopping list
2. User adds items with optional category, quantity, price
3. User marks items as purchased
4. User tracks estimated vs actual cost
5. User optionally creates wallet expense from shopping list

**Business Rules**:
- `estimated_cost`: Sum of items' estimated prices
- `cost`: Actual amount spent (manually entered)
- Items can be categorized (produce, meat, dairy, etc.)
- Items can be marked purchased individually
- Purchasing item doesn't auto-update list cost (manual)

**Cost Tracking**:
```
estimated_cost = SUM(item.price * item.quantity) WHERE is_purchased = false
cost = user_entered_total (after shopping trip)
difference = cost - estimated_cost (over/under budget)
```

**Edge Cases**:
- Item without price → estimated_cost incomplete
- Marking all items purchased → list not auto-archived
- Deleting list → cascades to all items

**Invariants**:
- Item always belongs to exactly one list
- List cost manually maintained (not auto-calculated)

---

### UC-11: Routine Execution

**Actor**: Authenticated User

**Purpose**: Define daily routines (morning routine, workout routine)

**Flow**:
1. User creates routine activities (reusable templates)
2. User creates routine (container)
3. User adds activities to routine with duration and order
4. User sets routine as active
5. User executes routine (tracking unclear - no follow-up table)

**Business Rules**:
- Routine activity: reusable template (e.g., "Meditation", "Shower")
- Routine: ordered sequence of activities
- `is_active`: Only one routine active at a time (assumed)
- `duration`: Minutes allocated for activity
- `order_index`: Defines sequence

**Execution Tracking** (missing):
- No follow-up table detected
- Unclear how user tracks routine completion
- Possible integration with activity_follow_ups?

**Edge Cases**:
- Setting routine active → others should become inactive (logic unclear)
- Routine without activities → empty routine allowed
- Activity deleted → routine detail remains (FK doesn't cascade) - **potential bug**

**Invariants**:
- Routine detail always belongs to one routine
- Routine detail references one routine activity

---

### UC-12: Learning Resource Organization

**Actor**: Authenticated User

**Flow**:
1. User creates categories (Books, Videos, Courses, Articles)
2. User creates learning resource with URL, category, tags
3. User filters/searches resources by category or tag

**Business Rules**:
- Resource can have multiple tags (many-to-many)
- Resource belongs to one category
- Tags reusable across resources
- URL optional (for physical books, printed materials)

**Edge Cases**:
- Resource without URL → offline resource
- Tag without resources → orphaned tag allowed
- Deleting category → cascades to resources

---

### UC-13: Programming Topic Tracking

**Actor**: Developer User

**Purpose**: Track technologies, frameworks, concepts being learned

**Flow**:
1. User creates programming languages (JavaScript, Python, etc.)
2. User creates topic types (Framework, Library, Concept, Tool)
3. User creates topics linked to language and type
4. User organizes learning by language

**Business Rules**:
- Topic belongs to one language
- Topic belongs to one type
- Examples:
  - Language: JavaScript, Type: Framework, Topic: React
  - Language: Python, Type: Library, Topic: NumPy

**Edge Cases**:
- Topic type "Concept" not language-specific → still requires language
- Deleting language → cascades to all topics

---

### UC-14: Course Progress Tracking

**Actor**: Authenticated User

**Flow**:
1. User creates course with total lessons count
2. User creates follow-up when completing lessons
3. System updates `completed_lessons` (manual or auto?)
4. System calculates percentage: `(completed_lessons / lessons) * 100`

**Business Rules**:
- Follow-up tracks lessons completed per day
- Course percentage auto-calculated (assumed)
- Course completion when `completed_lessons >= lessons`

**Edge Cases**:
- Lessons = 0 → percentage undefined (0%)
- Completed > lessons → over 100% allowed (shouldn't happen)
- Multiple follow-ups per day → allowed

**Invariants**:
- `completed_lessons <= lessons` (should be enforced but unclear)
- `percentage = (completed_lessons / lessons) * 100`

---

### UC-15: Sleep Tracking

**Actor**: Authenticated User

**Flow**:
1. User enters sleep data: date, hours, minutes, quality (1-5), notes
2. System stores entry
3. User views sleep history by date range
4. User analyzes sleep patterns (frontend)

**Business Rules**:
- One entry per day per user (unique constraint)
- Quality scale: 1 (poor) to 5 (excellent)
- Hours and minutes separate fields (total = hours * 60 + minutes)

**Edge Cases**:
- Duplicate entry for same date → update existing or error
- Quality null → rating optional
- Hours > 24 → allowed (long sleep, nap accumulation)

---

## Cross-Cutting Concerns

### Authorization Rules

**General Pattern**:
1. All endpoints require authentication (except register/login/verify)
2. Users can only access their own data
3. `owner` middleware validates resource belongs to user
4. No admin/moderator roles detected

**Ownership Check**:
```
if (resource.user_id != authenticated_user.id) {
  return 401 Unauthorized
}
```

---

### Validation Rules

**Common Validations**:
- Required fields: name, email, password, dates
- Email format validation
- UUID format for foreign keys
- Positive numbers for amounts, counts, durations
- Date format: YYYY-MM-DD
- Boolean flags: true/false only

**Business-Specific**:
- Password min length: 8 characters
- Email uniqueness
- Debit OR credit > 0, not both (assumed)
- Duration >= 0
- Percentage 0-100 (not enforced)

---

### State Machines

#### Habit Streak State
```
States: Active Streak | Broken Streak
Events: Complete Day (goal met) | Miss Day | Edit Past Day

Active Streak + Complete Day → streak++
Active Streak + Miss Day → Broken Streak (streak = 0)
Broken Streak + Complete Day → Active Streak (streak = 1)
```

#### Budget State
```
States: Active | Closed
Events: Create | Close | Reopen (not implemented?)

Active + Close → Closed (create follow-up)
```

#### To-Do State
```
States: Pending | Done | Archived
Events: Complete | Uncomplete | Archive | Unarchive

Pending + Complete → Done
Done + Uncomplete → Pending
Any + Archive → Archived
```

---

### Idempotency Requirements

**Critical for Financial Transactions**:
- Expense creation should be idempotent (create once, retry = error or return existing)
- Balance updates must be atomic (transaction isolation)
- Preventing duplicate expenses from retries

**Current State**: No idempotency keys detected (potential issue)

**Recommendation**: Add `idempotency_key` to expense/income operations

---

### Data Consistency Rules

1. **Wallet Balance Consistency**: Balance must match sum of transactions
2. **Budget Balance Consistency**: Balance must match sum of linked expenses
3. **Course Percentage Consistency**: Must match completed/total ratio
4. **Streak Consistency**: Streak <= max_streak
5. **Subtask Completion**: Independent of parent to-do (no auto-sync)

---

### Edge Case Handling

#### Time Zones
- All dates stored in UTC (assumed, not confirmed)
- User timezone: Colombia (America/Bogota) - env var
- Time conversion responsibility: Frontend (assumed)

#### Concurrent Updates
- No optimistic locking detected (last write wins)
- Potential race conditions on balance updates
- Recommendation: Use row-level locking or optimistic locking

#### Cascading Deletes
- User deletion → all data deleted (cascade)
- Category deletion → varies by table (cascade or set null)
- List deletion → items deleted (cascade)

#### Soft Deletes
- Not implemented
- Deleted data cannot be recovered
- Recommendation: Add soft deletes for audit trail

---

## Business Rules Summary

### Financial Rules
1. Wallet balance = initial_balance + SUM(debit - credit)
2. Budget balance = SUM(expenses where budget_id)
3. Transactions are single-currency (no multi-currency support)
4. Negative balances allowed (overdraft)
5. Scheduled expenses generate actual expenses (mechanism unclear)

### Habit Tracking Rules
1. Streak increments only on goal achievement
2. Missed day resets streak to 0
3. Max streak never decreases
4. Four tracking modes: counter, timer, incremental, decremental
5. Habits can be "keep" (positive) or "avoid" (negative)

### Task Management Rules
1. To-dos belong to lists (required)
2. Categories optional
3. Subtasks independent completion status
4. Recurring tasks via frequency (generation unclear)
5. Importance and "today" flags for filtering

### Activity Tracking Rules
1. Activities categorized by type (work, rest, learning, etc.)
2. Follow-ups track time spent
3. Can span multiple days
4. No overlap prevention (user can track multiple simultaneously)

### Shopping Rules
1. Estimated cost vs actual cost tracking
2. Item-level purchase tracking
3. Cost manually entered (not auto-calculated from items)

### Learning Rules
1. Resources tagged and categorized
2. Courses track lesson completion
3. Programming topics organized by language and type

---

## Unknown / Needs Confirmation

1. **User Sync**: How does user creation in auth DB trigger creation in main DB?
2. **Scheduled Expense Generation**: Cron job or manual?
3. **Token Expiration**: What's the access token lifetime?
4. **Redis Session Expiration**: How long do sessions last?
5. **Routine Execution Tracking**: How is routine completion tracked?
6. **Recurring To-Dos**: Automatic generation or manual?
7. **Activity Spent Time**: Auto-calculated from follow-ups or manual?
8. **Budget Auto-Close**: Do budgets auto-close at end_date?
9. **Wallet Main Flag**: Enforced as unique per user?
10. **Course Percentage**: Auto-calculated or manual?
11. **Multi-Device Sessions**: Are sessions synced across devices?
12. **Email Verification Required**: Can unverified users use the system?

---

## Summary

This system is a comprehensive **personal productivity and finance management** platform with:
- **8 major domains**: Activities, Habits, To-Dos, Wallet, Shopping, Routines, Learning, Sleep
- **User-owned data**: Strict isolation per user
- **Time-series tracking**: Follow-ups, streaks, progress
- **Financial management**: Multi-wallet, budgeting, scheduled expenses
- **Goal tracking**: Habit goals, course completion, budget limits

**Core Value Proposition**: Single platform for tracking all aspects of personal productivity, habits, time, and finances.
