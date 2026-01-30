# Step 1 — Project Identification

## Overview
This workspace contains **two Laravel-based projects** that work together to provide a comprehensive personal productivity and finance management system.

---

## Project 1: xavier-auth (Authentication Service)

### Purpose and Domain Responsibilities
- **Purpose**: Centralized authentication and authorization service
- **Domain**: User authentication, registration, token management, email verification
- **Responsibilities**:
  - User registration with email verification
  - User login with JWT token generation
  - Token refresh mechanism
  - Email-based account verification (OTP)
  - Session management (with Redis support)
  - Token validation for other services

### Runtime/Framework/Language
- **Language**: PHP 8.1+
- **Framework**: Laravel 10.x
- **Key Dependencies**:
  - `laravel/sanctum`: ^3.2 (API token authentication)
  - `guzzlehttp/guzzle`: ^7.2 (HTTP client)
  - `laravel/tinker`: ^2.8 (REPL)

### Entry Points and Routing
**Main routes** (defined in `routes/api.php`):
- `POST /api/auth/register` → User registration
- `POST /api/auth/login` → User authentication
- `GET /api/auth/verify/{code}` → Email verification
- `POST /api/auth/resend-verification` → Resend verification email
- `POST /api/auth/verify-token` → Token validation (for other services)
- `POST /api/auth/refresh` → Refresh access token

**Controllers**:
- `AuthController`: Handles registration, verification, token refresh
- `LoginController`: Handles user authentication
- `VerifyTokenController`: Validates tokens for external services

### External Dependencies
- **Database**: MySQL
- **Cache/Session**: Redis (optional but recommended)
- **Email**: SMTP (configurable mailer)
- **External Services**: 
  - Connects to `xavier-api` service (configured via `EXTERNAL_XAVIER_API_DOMAIN`)

### Configuration and Environment Variables
```env
# Application
APP_NAME=Laravel
APP_ENV=local
APP_KEY=<generated>
APP_DEBUG=true
APP_URL=http://localhost

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=jhp_auth_service_api
DB_USERNAME=root
DB_PASSWORD=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_AUTH_PREFIX='auth-sessions:'

# Mail
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_FROM_ADDRESS="hello@example.com"

# Auth Settings
GEN_VERIFICATION_EMAIL_TIMEOUT=10
GEN_TIME_ZONE='America/Bogota'
REFRESH_EXPIRATION_DATE=43200

# External Services
EXTERNAL_XAVIER_API_DOMAIN=http://jhp-xavier-api.test
```

### How It Starts
**Local Development**:
```bash
php artisan serve
# or using Laravel Sail
sail up
```

**Production**:
- Served via web server (Apache/Nginx) pointing to `public/index.php`
- Requires composer autoload optimization
- Queue workers for async email sending

### Build/Deploy Artifacts
- Composer dependencies in `vendor/`
- Compiled views cache
- Route cache
- Config cache
- Database migrations

---

## Project 2: xavier-api (Main Application API)

### Purpose and Domain Responsibilities
- **Purpose**: Personal productivity and finance management REST API
- **Domain**: Activities tracking, habits, to-dos, wallet/budget management, shopping lists, routines, learning tracking, sleep tracking
- **Responsibilities**:
  - Activity and time tracking
  - Habit tracking with follow-ups
  - To-do list management with subtasks
  - Wallet and expense management
  - Budget tracking and scheduled expenses
  - Shopping list management
  - Routine and daily planning
  - Learning resources tracking
  - Programming topics tracking
  - Course tracking with follow-ups
  - Sleep tracking

### Runtime/Framework/Language
- **Language**: PHP 8.1+
- **Framework**: Laravel 10.x
- **Key Dependencies**:
  - `laravel/sanctum`: ^3.2 (API authentication)
  - `rebing/graphql-laravel`: ^9.5 (GraphQL support)
  - `mll-lab/laravel-graphiql`: ^3.2 (GraphQL IDE)
  - `guzzlehttp/guzzle`: ^7.2 (HTTP client)

### Entry Points and Routing
**Main API prefix**: `/api/v1`

**Controller Groups** (all require authentication via middleware):

1. **Activities Module**
   - ActivityCategoryController
   - ActivitiesController
   - FollowUpsController

2. **Habits Module**
   - HabitCategoryController
   - HabitsController
   - HabitFollowUpController

3. **Todos Module**
   - TodoCategoryController
   - TodoFrequencyController
   - TodoController
   - TodoListController

4. **Wallet/Finance Module**
   - WalletController
   - WalletExpenseCategoryController
   - WalletExpenseController
   - WalletScheduledExpenseController
   - WalletBudgetController
   - WalletBudgetFollowUpController
   - WalletPeriodsController
   - WalletFrequencyController

5. **Shopping Module**
   - ShoppingCategoryController
   - ShoppingListController
   - ShoppingListItemController

6. **Routines Module**
   - RoutineController
   - RoutineActivityController
   - RoutineDetailController

7. **Learning Module**
   - LearningCategoryController
   - LearningController
   - TagController

8. **Programming Module**
   - ProgrammingLanguageController
   - ProgrammingTopicTypeController
   - ProgrammingTopicController

9. **Courses Module**
   - CoursesController
   - CoursesFollowUpController

10. **Sleep Tracking Module**
    - SleepTrackerController

11. **Settings Module**
    - MeasuresController

### External Dependencies
- **Authentication Service**: Validates tokens via HTTP call to `xavier-auth` service
- **Database**: MySQL
- **Cache**: Redis (for auth session caching)
- **External Services**: 
  - `EXTERNAL_AUTH_SERVICE_DOMAIN`: Points to xavier-auth service

### Configuration and Environment Variables
```env
# Application
APP_NAME=Laravel
APP_ENV=local
APP_KEY=<generated>
APP_DEBUG=true
APP_URL=http://jhp-xavier-api.test/

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=jhp_xavier_api
DB_USERNAME=root
DB_PASSWORD=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_AUTH_PREFIX='auth-sessions:'

# Queue
QUEUE_CONNECTION=sync

# Mail
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025

# Auth
USE_REDIS_FOR_AUTH=true
EXTERNAL_AUTH_SERVICE_DOMAIN=http://jhp-auth-service-api.test
APP_IDENTIFIER=xavi
```

### How It Starts
**Local Development**:
```bash
php artisan serve --port=8001
# or using Laravel Sail
sail up
```

**Production**:
- Served via web server (Apache/Nginx) pointing to `public/index.php`
- Requires composer autoload optimization
- Queue workers for background jobs

### Build/Deploy Artifacts
- Composer dependencies in `vendor/`
- Compiled views cache
- Route cache
- Config cache
- Database migrations
- GraphQL schema (if used)

---

## Inter-Service Communication

### Authentication Flow
1. Client registers/logs in via `xavier-auth`
2. `xavier-auth` returns JWT access token + refresh token
3. Client sends token in `Authorization: Bearer <token>` header to `xavier-api`
4. `xavier-api` validates token via:
   - **Option A** (preferred): Check Redis cache for session data
   - **Option B**: HTTP POST to `xavier-auth` `/api/auth/verify-token`
5. If valid, `xavier-api` loads user by `auth_account` ID and processes request

### User Data Synchronization
- `xavier-auth` stores complete user records with authentication data
- `xavier-api` stores minimal user records with `auth_account` (foreign key to auth service user ID)
- User registration in `xavier-auth` should trigger user creation in `xavier-api` (currently manual/unclear)

---

## Summary

| Aspect | xavier-auth | xavier-api |
|--------|-------------|------------|
| **Type** | Authentication microservice | Main application API |
| **Framework** | Laravel 10 | Laravel 10 |
| **Primary Function** | Auth & token management | Business logic & data management |
| **Database** | Separate (users, tokens, apps) | Separate (50+ domain tables) |
| **Port** | Default (8000) | 8001 or custom |
| **Dependencies** | Standalone | Depends on xavier-auth |
| **Complexity** | Low (3 controllers) | High (35+ controllers) |

Both services follow Laravel conventions and RESTful API patterns. They use UUID primary keys for most domain entities and standard Laravel authentication patterns.
