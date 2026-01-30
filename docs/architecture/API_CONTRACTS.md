# API Contracts - Complete Endpoint Reference

## API Base URLs
- **Auth Service**: `{AUTH_DOMAIN}/api`
- **Main API**: `{API_DOMAIN}/api/v1`

## Authentication
All endpoints (except registration/login) require:
```
Authorization: Bearer {access_token}
```

---

# xavier-auth API Endpoints

## 1. User Registration
**Endpoint**: `POST /auth/register`  
**Auth**: None  
**Request**:
```json
{
  "name": "string (required)",
  "email": "string (required, email format, unique)",
  "password": "string (required, min:8)"
}
```
**Response** (200):
```json
{
  "status": true,
  "env": "local|production",
  "data": {
    "id": 1
  },
  "message": "User created successfully, an e-mail was sent to confirm your account"
}
```
**Side Effects**:
- Generates 6-digit OTP
- Queues verification email
- Sets `is_account_verified=false`

---

## 2. User Login
**Endpoint**: `POST /auth/login`  
**Auth**: None  
**Request**:
```json
{
  "email": "string (required, email)",
  "password": "string (required)"
}
```
**Response** (200):
```json
{
  "status": true,
  "meta": {
    "env": "local|production"
  },
  "data": {
    "message": "User logged",
    "data": {
      "id": 1,
      "name": "User Name",
      "email": "user@example.com",
      "email_verified_at": "2023-01-01T00:00:00Z",
      "is_account_verified": true
    },
    "token": "1|plain_text_access_token",
    "refresh": "2|plain_text_refresh_token"
  }
}
```
**Error** (401):
```json
{
  "status": false,
  "errors": ["User or password wrong"],
  "env": "local|production"
}
```
**Side Effects**:
- Creates Sanctum access token
- Creates refresh token
- Stores session in Redis (if enabled)

---

## 3. Verify Email
**Endpoint**: `GET /auth/verify/{code}`  
**Auth**: None  
**Parameters**:
- `code`: Base64-encoded string (format: `{6-digit-otp}{user_id}`)

**Response** (200):
```json
{
  "status": true,
  "env": "local|production",
  "message": "Account verified"
}
```
**Error** (404):
```json
{
  "status": "invalid",
  "message": "Invalid verification link"
}
```
**Side Effects**:
- Sets `is_account_verified=true`
- Clears `auth_otp`
- Marks email as verified

---

## 4. Resend Verification Email
**Endpoint**: `POST /auth/resend-verification`  
**Auth**: None  
**Request**:
```json
{
  "email": "string (required)"
}
```
**Response** (200):
```json
{
  "status": true,
  "message": "Verification email sent"
}
```
**Side Effects**:
- Generates new OTP (invalidates old)
- Queues new verification email

---

## 5. Verify Token (for external services)
**Endpoint**: `POST /auth/verify-token`  
**Auth**: None  
**Request**:
```json
{
  "token": "string (required)"
}
```
**Response** (200):
```json
{
  "status": true,
  "data": {
    "user": {
      "id": 1,
      "name": "User Name",
      "email": "user@example.com"
    }
  }
}
```
**Error** (401):
```json
{
  "status": false,
  "message": "Invalid token"
}
```

---

## 6. Refresh Access Token
**Endpoint**: `POST /auth/refresh`  
**Auth**: None (but requires refresh token)  
**Request**:
```json
{
  "refresh_token": "string (required)"
}
```
**Response** (200):
```json
{
  "status": true,
  "data": {
    "token": "new_access_token",
    "refresh": "new_refresh_token"
  }
}
```
**Side Effects**:
- Revokes old access token
- Creates new access token
- Creates new refresh token
- Updates Redis session

---

# xavier-api Endpoints (Grouped by Domain)

## Authentication (User Auth in Main API)

### 1. Register User in Main API
**Endpoint**: `POST /v1/user/register`  
**Auth**: None  
**Request**:
```json
{
  "email": "string",
  "password": "string",
  "auth_account": "integer (ID from auth service)"
}
```
**Note**: This endpoint seems redundant - user creation should happen automatically.

### 2. Login User in Main API
**Endpoint**: `POST /v1/user/login`  
**Auth**: None  
**Request/Response**: Similar to auth service

---

## Activities Module

### Activity Categories

#### 1. Create Activity Category
**Endpoint**: `POST /v1/activity-categories`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "color": "string (optional, hex color)",
  "icon": "string (optional)",
  "order_index": "integer (optional, default: 0)",
  "is_rest": "boolean (default: false)",
  "is_work": "boolean (default: false)",
  "is_learning": "boolean (default: false)",
  "is_self_care": "boolean (default: false)",
  "is_exercise": "boolean (default: false)",
  "is_driving": "boolean (default: false)",
  "is_entertainment": "boolean (default: false)",
  "is_feeding": "boolean (default: false)",
  "is_idle": "boolean (default: false)",
  "is_loving": "boolean (default: false)",
  "is_planning": "boolean (default: false)",
  "is_playing": "boolean (default: false)"
}
```
**Response** (200):
```json
{
  "status": true,
  "data": {
    "id": "uuid",
    "name": "Work",
    "color": "#FF5733",
    "icon": "briefcase",
    "is_work": true,
    "user_id": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

#### 2. List Activity Categories
**Endpoint**: `GET /v1/activity-categories`  
**Auth**: Required  
**Response** (200):
```json
{
  "status": true,
  "data": [
    {
      "id": "uuid",
      "name": "Work",
      "color": "#FF5733",
      "is_work": true,
      "user_id": 1
    }
  ]
}
```

#### 3. Update Activity Category
**Endpoint**: `PUT /v1/activity-categories/{category}`  
**Auth**: Required + Owner  
**Request**: Same as create  
**Response**: Same as create

#### 4. Delete Activity Category
**Endpoint**: `DELETE /v1/activity-categories/{category}`  
**Auth**: Required + Owner  
**Response** (200):
```json
{
  "status": true,
  "removed": true
}
```

### Activities

#### 1. Create Activity
**Endpoint**: `POST /v1/activity`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "category_id": "uuid (required)",
  "spent_time": "integer (optional, minutes, default: 0)",
  "order_index": "integer (optional)"
}
```
**Response** (200):
```json
{
  "status": true,
  "data": {
    "id": "uuid",
    "name": "Code Review",
    "description": "Review PRs",
    "category_id": "uuid",
    "spent_time": 0,
    "user_id": 1,
    "category": {
      "id": "uuid",
      "name": "Work"
    },
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

#### 2. List Activities
**Endpoint**: `GET /v1/activity`  
**Auth**: Required  
**Response**: Array of activities with category relationship

#### 3. View Activity
**Endpoint**: `GET /v1/activity/{activity}`  
**Auth**: Required + Owner  
**Response**: Single activity with category

#### 4. Update Activity
**Endpoint**: `PUT /v1/activity/{activity}`  
**Auth**: Required + Owner  
**Request**: Same as create  
**Response**: Updated activity

#### 5. Delete Activity
**Endpoint**: `DELETE /v1/activity/{activity}`  
**Auth**: Required + Owner  
**Response**: `{status: true, removed: true}`

### Activity Follow-Ups (Time Tracking)

#### 1. Create Follow-Up
**Endpoint**: `POST /v1/activity/followup`  
**Auth**: Required  
**Request**:
```json
{
  "activity_id": "uuid (required)",
  "date": "date (required, YYYY-MM-DD)",
  "start_time": "time (optional, HH:MM:SS)",
  "end_time": "time (optional, HH:MM:SS)",
  "duration": "integer (required, minutes)",
  "notes": "string (optional)"
}
```
**Response** (200):
```json
{
  "status": true,
  "data": {
    "id": "uuid",
    "activity_id": "uuid",
    "date": "2023-01-01",
    "start_time": "09:00:00",
    "end_time": "10:30:00",
    "duration": 90,
    "notes": "Productive session"
  }
}
```

#### 2. Update Follow-Up
**Endpoint**: `PUT /v1/activity/followup/{followUp}`  
**Auth**: Required + Owner  
**Request**: Same as create  
**Response**: Updated follow-up

#### 3. Delete Follow-Up
**Endpoint**: `DELETE /v1/activity/followup/{followUp}`  
**Auth**: Required + Owner

#### 4. List Follow-Ups for Activity
**Endpoint**: `GET /v1/activity/followups/{activity}`  
**Auth**: Required  
**Response**: Array of follow-ups for specific activity

#### 5. List User's Follow-Ups
**Endpoint**: `GET /v1/activity/followups`  
**Auth**: Required  
**Response**: Array of all user's follow-ups

#### 6. Get Follow-Ups by Day
**Endpoint**: `GET /v1/activity/day-followups/{date}`  
**Auth**: Required  
**Parameters**: `date` (YYYY-MM-DD)  
**Response**: Follow-ups for specific date

---

## Habits Module

### Habit Categories

#### 1. Create Habit Category
**Endpoint**: `POST /v1/habit-category`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "icon": "string (optional)",
  "color": "string (optional)"
}
```

#### 2. List Habit Categories
**Endpoint**: `GET /v1/habit-categories`  
**Auth**: Required

#### 3. Update Habit Category
**Endpoint**: `PUT /v1/habit-category/{category}`  
**Auth**: Required + Owner

#### 4. Delete Habit Category
**Endpoint**: `DELETE /v1/habit-category/{category}`  
**Auth**: Required + Owner

### Habits

#### 1. Create Habit
**Endpoint**: `POST /v1/habit`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "category": "uuid (required, habit_category_id)",
  "activity": "uuid (optional, activity_id)",
  "measure": "uuid (optional, measure_id)",
  "start_date": "date (optional)",
  "end_date": "date (optional)",
  "should_avoid": "boolean (default: false)",
  "should_keep": "boolean (default: false)",
  "is_counter": "boolean (default: false)",
  "is_timer": "boolean (default: false)",
  "is_incremental": "boolean (default: false)",
  "is_decremental": "boolean (default: false)",
  "daily_goal": "integer (default: 0)",
  "timer_goal": "integer (default: 0, minutes)",
  "times_goal": "integer (default: 0)"
}
```
**Response** (200):
```json
{
  "status": true,
  "data": {
    "id": "uuid",
    "name": "Read 30 min daily",
    "category_id": "uuid",
    "daily_goal": 30,
    "is_timer": true,
    "streak": 0,
    "max_streak": 0,
    "category": {...},
    "activity": {...},
    "measure": {...}
  }
}
```

#### 2. List Habits
**Endpoint**: `GET /v1/habits`  
**Auth**: Required  
**Response**: Array of habits with relationships (category, activity, measure, followUpsMonth)

#### 3. Update Habit
**Endpoint**: `PUT /v1/habit/{habit}`  
**Auth**: Required + Owner  
**Request**: Same as create

#### 4. Delete Habit
**Endpoint**: `DELETE /v1/habit/{habit}`  
**Auth**: Required + Owner

### Habit Follow-Ups

#### 1. Add Follow-Up
**Endpoint**: `POST /v1/follow-ups/habit/add`  
**Auth**: Required  
**Request**:
```json
{
  "habit_id": "uuid (required)",
  "date": "date (required)",
  "count": "integer (optional)",
  "time": "integer (optional, minutes)",
  "notes": "string (optional)",
  "story": "string (optional)"
}
```

#### 2. Update Follow-Up
**Endpoint**: `PUT /v1/follow-ups/habit/{followUp}`  
**Auth**: Required + Owner

#### 3. Delete Follow-Up
**Endpoint**: `DELETE /v1/follow-ups/habit/{followUp}`  
**Auth**: Required + Owner

#### 4. List Follow-Ups for Habit
**Endpoint**: `GET /v1/follow-ups/habit/list/{habit}`  
**Auth**: Required

#### 5. Get Follow-Ups in Date Range
**Endpoint**: `GET /v1/follow-ups/habit/follow-ups/{from}/{to}`  
**Auth**: Required  
**Parameters**: `from`, `to` (YYYY-MM-DD)

#### 6. Get My Day (Habit Follow-Ups)
**Endpoint**: `GET /v1/follow-ups/habit/my-day/{date}`  
**Auth**: Required  
**Parameters**: `date` (YYYY-MM-DD)

#### 7. Get My Follow-Ups Per Date Range
**Endpoint**: `GET /v1/follow-ups/habit/in-dates/{from}/{to}`  
**Auth**: Required

---

## To-Do Module

### To-Do Frequencies

#### 1. Create Frequency
**Endpoint**: `POST /v1/todo/frequency`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "days": "integer (required, recurrence in days)"
}
```

#### 2. List Frequencies
**Endpoint**: `GET /v1/todo/frequency`  
**Auth**: Required

#### 3. Update Frequency
**Endpoint**: `PUT /v1/todo/frequency/{frequency}`  
**Auth**: Required

#### 4. Delete Frequency
**Endpoint**: `DELETE /v1/todo/frequency/{frequency}`  
**Auth**: Required

### To-Do Categories

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/todo/category`
- `GET /v1/todo/category`
- `PUT /v1/todo/category/{category}`
- `DELETE /v1/todo/category/{category}`

**Auth**: Required + Owner (for update/delete)

### To-Do Lists

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/todo-list`
- `GET /v1/todo-list`
- `PUT /v1/todo-list/{list}`
- `DELETE /v1/todo-list/{list}`

### To-Dos

#### 1. Create To-Do
**Endpoint**: `POST /v1/todo`  
**Auth**: Required  
**Request**:
```json
{
  "title": "string (required)",
  "notes": "string (optional)",
  "list_id": "uuid (required)",
  "category_id": "uuid (required)",
  "frequency_id": "uuid (optional)",
  "is_done": "boolean (default: false)",
  "is_archived": "boolean (default: false)",
  "is_important": "boolean (default: false)",
  "application_date": "date (optional)",
  "sub_tasks": ["string array (optional)"]
}
```
**Response** (200):
```json
{
  "status": true,
  "data": {
    "id": "uuid",
    "title": "Buy groceries",
    "notes": "Don't forget milk",
    "is_done": false,
    "is_important": true,
    "list_id": "uuid",
    "category_id": "uuid",
    "category": {...},
    "frequency": {...},
    "list": {...},
    "subTasks": [
      {
        "id": "uuid",
        "title": "Milk",
        "is_done": false
      }
    ]
  }
}
```

#### 2. List To-Dos
**Endpoint**: `GET /v1/todo`  
**Auth**: Required  
**Response**: Array with relationships (category, frequency, list, subtasks)

#### 3. Update To-Do
**Endpoint**: `PUT /v1/todo/{todo}`  
**Auth**: Required + Owner  
**Request**: Same as create + `sub_tasks_to_remove: ["uuid"]`

#### 4. Toggle To-Do
**Endpoint**: `PATCH /v1/todo/toggle/{todo}`  
**Auth**: Required + Owner  
**Request**:
```json
{
  "is_done": "boolean (required)"
}
```

#### 5. Delete To-Do
**Endpoint**: `DELETE /v1/todo/{todo}`  
**Auth**: Required + Owner

#### 6. Bulk Delete To-Dos
**Endpoint**: `POST /v1/todo/remove-bulk`  
**Auth**: Required + Owner  
**Request**:
```json
{
  "ids": ["uuid", "uuid", ...]
}
```

### To-Do Sub-Tasks

#### 1. Add Sub-Task
**Endpoint**: `POST /v1/todo/add-subtask`  
**Auth**: Required  
**Request**:
```json
{
  "todo_id": "uuid (required)",
  "title": "string (required)"
}
```

#### 2. Update Sub-Task
**Endpoint**: `PUT /v1/todo/update-subtask/{subtask}`  
**Auth**: Required + Owner

#### 3. Toggle Sub-Task
**Endpoint**: `PATCH /v1/todo/toggle-subtask/{subTask}`  
**Auth**: Required + Owner  
**Request**:
```json
{
  "is_done": "boolean"
}
```

#### 4. Delete Sub-Task
**Endpoint**: `DELETE /v1/todo/remove-subtask/{subtask}`  
**Auth**: Required + Owner

---

## Wallet/Finance Module

### Wallet Categories

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/wallet-category`
- `GET /v1/wallet-category`
- `PUT /v1/wallet-category/{category}`
- `DELETE /v1/wallet-category/{category}`

**Auth**: Required + Owner

### Wallets

#### 1. Create Wallet
**Endpoint**: `POST /v1/wallet`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "icon": "string (optional)",
  "initial_balance": "float (default: 0)",
  "balance": "float (default: 0)",
  "is_main": "boolean (default: false)"
}
```

#### 2-4. List, Update, Delete
**Endpoints**:
- `GET /v1/wallet`
- `PUT /v1/wallet/{wallet}`
- `DELETE /v1/wallet/{wallet}`

### Wallet Expenses

#### 1. Create Expense
**Endpoint**: `POST /v1/wallet/expense`  
**Auth**: Required  
**Request**:
```json
{
  "date": "date (required)",
  "description": "string (required)",
  "debit": "float (optional, default: 0)",
  "credit": "float (optional, default: 0)",
  "wallet_id": "uuid (required)",
  "category_id": "uuid (required)",
  "budget_id": "uuid (optional)"
}
```
**Response** (200):
```json
{
  "status": true,
  "data": {
    "id": "uuid",
    "date": "2023-01-01",
    "description": "Grocery shopping",
    "debit": 0,
    "credit": 50.00,
    "is_income": false,
    "is_outcome": true,
    "wallet_id": "uuid",
    "category_id": "uuid",
    "wallet": {...},
    "category": {...}
  }
}
```
**Side Effects**:
- Updates wallet balance: `balance += debit - credit`
- Updates budget balance (if budget_id provided)

#### 2. List Expenses
**Endpoint**: `GET /v1/wallet/expense`  
**Auth**: Required

#### 3. Get Expenses in Date Range
**Endpoint**: `GET /v1/wallet/expense/{from}/{to}`  
**Auth**: Required  
**Parameters**: `from`, `to` (YYYY-MM-DD)

#### 4. Update Expense
**Endpoint**: `PUT /v1/wallet/expense/{expense}`  
**Auth**: Required  
**Side Effects**:
- Reverts old wallet balance changes
- Applies new balance changes
- Updates old and new budgets (if applicable)

#### 5. Delete Expense
**Endpoint**: `DELETE /v1/wallet/expense/{expense}`  
**Auth**: Required  
**Side Effects**:
- Reverts wallet balance
- Reverts budget balance (if applicable)

### Scheduled Expenses

#### 1. Create Scheduled Expense
**Endpoint**: `POST /v1/wallet/expense-scheduled`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "amount": "float (required)",
  "start_date": "date (required)",
  "end_date": "date (optional)",
  "frequency_id": "uuid (optional)",
  "wallet_id": "uuid (required)",
  "category_id": "uuid (required)",
  "is_income": "boolean (default: false)",
  "paid": "boolean (default: false)"
}
```

#### 2-4. List, Update, Delete
**Endpoints**:
- `GET /v1/wallet/expense-scheduled`
- `PUT /v1/wallet/expense-scheduled/update/{expense}`
- `DELETE /v1/wallet/expense-scheduled/remove/{expense}`

#### 5. Get Scheduled in Date Range
**Endpoint**: `GET /v1/wallet/expense-scheduled/{from}/{to}`  
**Auth**: Required

### Budgets

#### 1. Create Budget
**Endpoint**: `POST /v1/wallet/budget`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "icon": "string (optional)",
  "amount": "decimal (required)",
  "start_date": "date (required)",
  "end_date": "date (required)",
  "is_active": "boolean (default: true)",
  "wallet_id": "uuid (required)",
  "frequency_id": "uuid (optional)"
}
```

#### 2-4. List, Update, Delete
**Endpoints**:
- `GET /v1/wallet/budget`
- `PUT /v1/wallet/budget/{budget}`
- `DELETE /v1/wallet/budget/{budget}`

#### 5. Close Budget
**Endpoint**: `POST /v1/wallet/budget/close/{budget}`  
**Auth**: Required  
**Side Effects**:
- Creates budget follow-up record
- Marks budget as inactive (assumed)

### Wallet Periods

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/wallet/period`
- `GET /v1/wallet/period`
- `PUT /v1/wallet/period/{period}`
- `DELETE /v1/wallet/period/{period}`

### Wallet Frequencies

#### 1-4. CRUD operations  
**(Under Settings)**
**Endpoints**:
- `POST /v1/settings/wallet-frequency`
- `GET /v1/settings/wallet-frequency`
- `PUT /v1/settings/wallet-frequency/{frequency}`
- `DELETE /v1/settings/wallet-frequency/{frequency}`

---

## Shopping Module

### Shopping Categories

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/shopping/categories`
- `GET /v1/shopping/categories`
- `PUT /v1/shopping/categories/{category}`
- `DELETE /v1/shopping/categories/{category}`

### Shopping Lists

#### 1. Create Shopping List
**Endpoint**: `POST /v1/shopping/list`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "estimated_cost": "float (default: 0)",
  "cost": "float (default: 0)"
}
```

#### 2-4. List, Update, Delete
**Endpoints**:
- `GET /v1/shopping/list`
- `PUT /v1/shopping/list/{list}`
- `DELETE /v1/shopping/list/{list}`

### Shopping List Items

#### 1. Add Item to List
**Endpoint**: `POST /v1/shopping/item/{list}`  
**Auth**: Required + Owner of list  
**Request**:
```json
{
  "name": "string (required)",
  "quantity": "integer (default: 1)",
  "price": "float (optional)",
  "category_id": "uuid (optional)",
  "is_purchased": "boolean (default: false)"
}
```

#### 2. List Items
**Endpoint**: `GET /v1/shopping/item/{list}`  
**Auth**: Required + Owner of list

#### 3. Update Item
**Endpoint**: `PUT /v1/shopping/item/{item}`  
**Auth**: Required + Owner

#### 4. Delete Item
**Endpoint**: `DELETE /v1/shopping/item/{item}`  
**Auth**: Required + Owner

---

## Routines Module

### Routine Activities

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/routine/activity`
- `GET /v1/routine/activity`
- `PUT /v1/routine/activity/{activity}`
- `DELETE /v1/routine/activity/{activity}`

### Routines

#### 1. Create Routine
**Endpoint**: `POST /v1/routine`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "icon": "string (optional)",
  "is_active": "boolean (default: false)"
}
```

#### 2. List Routines
**Endpoint**: `GET /v1/routine`  
**Auth**: Required

#### 3. View Routine
**Endpoint**: `GET /v1/routine/{routine}`  
**Auth**: Required

#### 4. Update Routine
**Endpoint**: `PUT /v1/routine/{routine}`  
**Auth**: Required + Owner

#### 5. Set Active Routine
**Endpoint**: `PATCH /v1/routine/set-active/{routine}`  
**Auth**: Required  
**Side Effects**: Sets other routines as inactive (assumed)

#### 6. Delete Routine
**Endpoint**: `DELETE /v1/routine/{routine}`  
**Auth**: Required + Owner

### Routine Details (Activities in Routine)

#### 1. Add Activity to Routine
**Endpoint**: `POST /v1/routine/detail/{routine}`  
**Auth**: Required + Owner of routine  
**Request**:
```json
{
  "routine_activity_id": "uuid (required)",
  "duration": "integer (required, minutes)",
  "order_index": "integer (optional)"
}
```

#### 2. List Activities in Routine
**Endpoint**: `GET /v1/routine/detail/{routine}`  
**Auth**: Required + Owner

#### 3. Update Routine Detail
**Endpoint**: `PUT /v1/routine/detail/{detail}`  
**Auth**: Required + Owner

#### 4. Delete Routine Detail
**Endpoint**: `DELETE /v1/routine/detail/{detail}`  
**Auth**: Required + Owner

---

## Learning Module

### Learning Categories

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/learning/category`
- `GET /v1/learning/category`
- `PUT /v1/learning/category/{category}`
- `DELETE /v1/learning/category/{category}`

### Learning Resources

#### 1. Create Learning Resource
**Endpoint**: `POST /v1/learning`  
**Auth**: Required  
**Request**:
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "url": "string (optional)",
  "category_id": "uuid (required)",
  "tags": ["uuid array (optional, tag IDs)"]
}
```

#### 2-4. List, Update, Delete
**Endpoints**:
- `GET /v1/learning`
- `PUT /v1/learning/{learning}`
- `DELETE /v1/learning/{learning}`

### Tags

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/tags`
- `GET /v1/tags`
- `PUT /v1/tags/{tag}`
- `DELETE /v1/tags/{tag}`

---

## Programming Module

### Programming Languages

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/programming/language`
- `GET /v1/programming/language`
- `PUT /v1/programming/language/{language}`
- `DELETE /v1/programming/language/{language}`

### Programming Topic Types

#### 1-4. CRUD operations
**Endpoints**:
- `POST /v1/programming/topic-type`
- `GET /v1/programming/topic-type`
- `PUT /v1/programming/topic-type/{type}`
- `DELETE /v1/programming/topic-type/{type}`

### Programming Topics

#### 1. Create Topic
**Endpoint**: `POST /v1/programming/topic`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "language_id": "uuid (required)",
  "type_id": "uuid (required)"
}
```

#### 2. List Topics by Language
**Endpoint**: `GET /v1/programming/topic/{language}`  
**Auth**: Required

#### 3-4. Update, Delete
**Endpoints**:
- `PUT /v1/programming/topic/{topic}`
- `DELETE /v1/programming/topic/{topic}`

---

## Courses Module

### Courses

#### 1. Create Course
**Endpoint**: `POST /v1/courses`  
**Auth**: Required  
**Request**:
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "url": "string (optional)",
  "lessons": "integer (default: 0)",
  "completed_lessons": "integer (default: 0)",
  "percentage": "integer (default: 0)"
}
```

#### 2. List Courses
**Endpoint**: `GET /v1/courses`  
**Auth**: Required

#### 3. View Course
**Endpoint**: `GET /v1/courses/{course}`  
**Auth**: Required + Owner

#### 4. Update Course
**Endpoint**: `PUT /v1/courses/{course}`  
**Auth**: Required + Owner

#### 5. Delete Course
**Endpoint**: `DELETE /v1/courses/{course}`  
**Auth**: Required + Owner

### Course Follow-Ups

#### 1. Create Follow-Up
**Endpoint**: `POST /v1/course-followup`  
**Auth**: Required  
**Request**:
```json
{
  "course_id": "uuid (required)",
  "date": "date (required)",
  "lessons_completed": "integer (required)",
  "notes": "string (optional)"
}
```

#### 2. List Follow-Ups for Course
**Endpoint**: `GET /v1/course-followup/{course}`  
**Auth**: Required

#### 3. Update Follow-Up
**Endpoint**: `PUT /v1/course-followup/{followUp}`  
**Auth**: Required + Owner

#### 4. Delete Follow-Up
**Endpoint**: `DELETE /v1/course-followup/{followUp}`  
**Auth**: Required + Owner

---

## Sleep Tracking Module

### Sleep Tracker

#### 1. Register Sleep Entry
**Endpoint**: `POST /v1/sleep-tracker/register`  
**Auth**: Required  
**Request**:
```json
{
  "date": "date (required)",
  "hours": "integer (required)",
  "minutes": "integer (optional, default: 0)",
  "quality": "integer (optional, 1-5 scale)",
  "notes": "string (optional)"
}
```

#### 2. Get Sleep by Day
**Endpoint**: `GET /v1/sleep-tracker/by-day/{date}`  
**Auth**: Required  
**Parameters**: `date` (YYYY-MM-DD)

#### 3. Get Last Sleep Entry
**Endpoint**: `GET /v1/sleep-tracker/last`  
**Auth**: Required

---

## Settings Module

### Measures

#### 1. Create Measure
**Endpoint**: `POST /v1/settings/measure`  
**Auth**: Required  
**Request**:
```json
{
  "name": "string (required)",
  "abbreviation": "string (required)",
  "icon": "string (optional)",
  "type": "string (optional)"
}
```

#### 2. List Measures
**Endpoint**: `GET /v1/settings/measures`  
**Auth**: Required

#### 3. Update Measure
**Endpoint**: `PUT /v1/settings/measure/{measure}`  
**Auth**: Required + Owner

#### 4. Delete Measure
**Endpoint**: `DELETE /v1/settings/measure/{measure}`  
**Auth**: Required + Owner

---

## Common Response Patterns

### Success Response
```json
{
  "status": true,
  "data": { /* entity or array */ }
}
```

### Error Response
```json
{
  "status": false,
  "message": "Error message",
  "errors": ["Error 1", "Error 2"]
}
```

### Validation Error (400)
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": {
    "field_name": ["Error message"]
  }
}
```

### Unauthorized (401)
```json
{
  "status": false,
  "message": "Unauthorized"
}
```

### Token Expired (401)
```json
{
  "status": false,
  "expired": true,
  "message": "Expired token"
}
```

### Not Found (404)
```json
{
  "status": false,
  "message": "Resource not found"
}
```

---

## Summary

- **Total Endpoints**: ~150+
- **Authentication**: Bearer token (JWT via Sanctum)
- **Common Patterns**: CRUD operations with owner validation
- **UUID**: Used for all domain entity IDs
- **Timestamps**: All entities have created_at, updated_at
- **Soft Deletes**: Not implemented
- **Pagination**: Not implemented (returns all records)
- **Filtering/Search**: Not implemented
- **Sorting**: Limited (created_at DESC on some endpoints)
