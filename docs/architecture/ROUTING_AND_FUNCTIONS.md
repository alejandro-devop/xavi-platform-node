# Routing and Functions Mapping

This document maps every endpoint from the Laravel API to the serverless function architecture.

---

## API Gateway Configuration

### Base URLs
- **Auth Service**: `/auth`
- **Main API**: `/v1`

### Route Configuration

```yaml
# API Gateway Routes (AWS API Gateway / Cloud Function HTTP)
routes:
  # Auth Function
  - path: /auth/register
    method: POST
    function: auth-function
    public: true
    
  - path: /auth/login
    method: POST
    function: auth-function
    public: true
    
  - path: /auth/verify/{code}
    method: GET
    function: auth-function
    public: true
    
  - path: /auth/resend-verification
    method: POST
    function: auth-function
    public: true
    
  - path: /auth/verify-token
    method: POST
    function: auth-function
    public: true
    
  - path: /auth/refresh
    method: POST
    function: auth-function
    public: true
  
  # Activity Function
  - path: /v1/activity-categories
    methods: [POST, GET]
    function: activity-function
    auth: required
    
  - path: /v1/activity-categories/{id}
    methods: [PUT, DELETE]
    function: activity-function
    auth: required
    owner: true
    
  - path: /v1/activity
    methods: [POST, GET]
    function: activity-function
    auth: required
    
  - path: /v1/activity/{id}
    methods: [GET, PUT, DELETE]
    function: activity-function
    auth: required
    owner: true
    
  - path: /v1/activity/followup
    methods: [POST]
    function: activity-function
    auth: required
    
  - path: /v1/activity/followup/{id}
    methods: [PUT, DELETE]
    function: activity-function
    auth: required
    owner: true
    
  - path: /v1/activity/followups/{activityId}
    method: GET
    function: activity-function
    auth: required
    
  - path: /v1/activity/followups
    method: GET
    function: activity-function
    auth: required
    
  - path: /v1/activity/day-followups/{date}
    method: GET
    function: activity-function
    auth: required
```

---

## Function-Level Routing

### Auth Function Internal Router

```typescript
// src/functions/auth/index.ts
import { Router } from './router';
import * as handlers from './handlers';

const router = new Router();

router.post('/auth/register', handlers.register);
router.post('/auth/login', handlers.login);
router.get('/auth/verify/:code', handlers.verifyEmail);
router.post('/auth/resend-verification', handlers.resendVerification);
router.post('/auth/verify-token', handlers.verifyToken);
router.post('/auth/refresh', handlers.refreshToken);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

**Handler Functions**:
- `register()`: User registration + OTP generation + queue email
- `login()`: Credential validation + token generation + Redis session
- `verifyEmail()`: OTP validation + mark verified
- `resendVerification()`: Generate new OTP + queue email
- `verifyToken()`: JWT validation (for external services)
- `refreshToken()`: Token refresh + new JWT generation

---

### Activity Function Internal Router

```typescript
// src/functions/activity/index.ts
import { Router } from '../../shared/router';
import { authMiddleware, ownerMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

// Activity Categories
router.post('/v1/activity-categories', authMiddleware, handlers.createCategory);
router.get('/v1/activity-categories', authMiddleware, handlers.listCategories);
router.put('/v1/activity-categories/:id', authMiddleware, ownerMiddleware('category'), handlers.updateCategory);
router.delete('/v1/activity-categories/:id', authMiddleware, ownerMiddleware('category'), handlers.deleteCategory);

// Activities
router.post('/v1/activity', authMiddleware, handlers.createActivity);
router.get('/v1/activity', authMiddleware, handlers.listActivities);
router.get('/v1/activity/:id', authMiddleware, ownerMiddleware('activity'), handlers.getActivity);
router.put('/v1/activity/:id', authMiddleware, ownerMiddleware('activity'), handlers.updateActivity);
router.delete('/v1/activity/:id', authMiddleware, ownerMiddleware('activity'), handlers.deleteActivity);

// Follow-ups
router.post('/v1/activity/followup', authMiddleware, handlers.createFollowUp);
router.put('/v1/activity/followup/:id', authMiddleware, ownerMiddleware('followUp'), handlers.updateFollowUp);
router.delete('/v1/activity/followup/:id', authMiddleware, ownerMiddleware('followUp'), handlers.deleteFollowUp);
router.get('/v1/activity/followups/:activityId', authMiddleware, handlers.listFollowUpsByActivity);
router.get('/v1/activity/followups', authMiddleware, handlers.listUserFollowUps);
router.get('/v1/activity/day-followups/:date', authMiddleware, handlers.listFollowUpsByDay);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

### Habit Function Internal Router

```typescript
// src/functions/habit/index.ts
import { Router } from '../../shared/router';
import { authMiddleware, ownerMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

// Habit Categories
router.post('/v1/habit-category', authMiddleware, handlers.createCategory);
router.get('/v1/habit-categories', authMiddleware, handlers.listCategories);
router.put('/v1/habit-category/:id', authMiddleware, ownerMiddleware('category'), handlers.updateCategory);
router.delete('/v1/habit-category/:id', authMiddleware, ownerMiddleware('category'), handlers.deleteCategory);

// Habits
router.post('/v1/habit', authMiddleware, handlers.createHabit);
router.get('/v1/habits', authMiddleware, handlers.listHabits);
router.put('/v1/habit/:id', authMiddleware, ownerMiddleware('habit'), handlers.updateHabit);
router.delete('/v1/habit/:id', authMiddleware, ownerMiddleware('habit'), handlers.deleteHabit);

// Habit Follow-Ups
router.post('/v1/follow-ups/habit/add', authMiddleware, handlers.addFollowUp);
router.put('/v1/follow-ups/habit/:id', authMiddleware, ownerMiddleware('followUp'), handlers.updateFollowUp);
router.delete('/v1/follow-ups/habit/:id', authMiddleware, ownerMiddleware('followUp'), handlers.deleteFollowUp);
router.get('/v1/follow-ups/habit/list/:habitId', authMiddleware, handlers.listFollowUpsByHabit);
router.get('/v1/follow-ups/habit/follow-ups/:from/:to', authMiddleware, handlers.listFollowUpsInDateRange);
router.get('/v1/follow-ups/habit/my-day/:date', authMiddleware, handlers.getMyDay);
router.get('/v1/follow-ups/habit/in-dates/:from/:to', authMiddleware, handlers.getMyFollowUpsPerDate);

// Measures
router.post('/v1/settings/measure', authMiddleware, handlers.createMeasure);
router.get('/v1/settings/measures', authMiddleware, handlers.listMeasures);
router.put('/v1/settings/measure/:id', authMiddleware, ownerMiddleware('measure'), handlers.updateMeasure);
router.delete('/v1/settings/measure/:id', authMiddleware, ownerMiddleware('measure'), handlers.deleteMeasure);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

### Todo Function Internal Router

```typescript
// src/functions/todo/index.ts
import { Router } from '../../shared/router';
import { authMiddleware, ownerMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

// Todo Frequencies
router.post('/v1/todo/frequency', authMiddleware, handlers.createFrequency);
router.get('/v1/todo/frequency', authMiddleware, handlers.listFrequencies);
router.put('/v1/todo/frequency/:id', authMiddleware, handlers.updateFrequency);
router.delete('/v1/todo/frequency/:id', authMiddleware, handlers.deleteFrequency);

// Todo Categories
router.post('/v1/todo/category', authMiddleware, handlers.createCategory);
router.get('/v1/todo/category', authMiddleware, handlers.listCategories);
router.put('/v1/todo/category/:id', authMiddleware, ownerMiddleware('category'), handlers.updateCategory);
router.delete('/v1/todo/category/:id', authMiddleware, ownerMiddleware('category'), handlers.deleteCategory);

// Todo Lists
router.post('/v1/todo-list', authMiddleware, handlers.createList);
router.get('/v1/todo-list', authMiddleware, handlers.listLists);
router.put('/v1/todo-list/:id', authMiddleware, ownerMiddleware('list'), handlers.updateList);
router.delete('/v1/todo-list/:id', authMiddleware, ownerMiddleware('list'), handlers.deleteList);

// Todos
router.post('/v1/todo', authMiddleware, handlers.createTodo);
router.get('/v1/todo', authMiddleware, handlers.listTodos);
router.put('/v1/todo/:id', authMiddleware, ownerMiddleware('todo'), handlers.updateTodo);
router.patch('/v1/todo/toggle/:id', authMiddleware, ownerMiddleware('todo'), handlers.toggleTodo);
router.delete('/v1/todo/:id', authMiddleware, ownerMiddleware('todo'), handlers.deleteTodo);
router.post('/v1/todo/remove-bulk', authMiddleware, handlers.bulkDeleteTodos);

// Subtasks
router.post('/v1/todo/add-subtask', authMiddleware, handlers.addSubtask);
router.put('/v1/todo/update-subtask/:id', authMiddleware, ownerMiddleware('subtask'), handlers.updateSubtask);
router.patch('/v1/todo/toggle-subtask/:id', authMiddleware, ownerMiddleware('subtask'), handlers.toggleSubtask);
router.delete('/v1/todo/remove-subtask/:id', authMiddleware, ownerMiddleware('subtask'), handlers.deleteSubtask);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

### Wallet Function Internal Router

```typescript
// src/functions/wallet/index.ts
import { Router } from '../../shared/router';
import { authMiddleware, ownerMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

// Wallet Categories
router.post('/v1/wallet-category', authMiddleware, handlers.createCategory);
router.get('/v1/wallet-category', authMiddleware, handlers.listCategories);
router.put('/v1/wallet-category/:id', authMiddleware, ownerMiddleware('category'), handlers.updateCategory);
router.delete('/v1/wallet-category/:id', authMiddleware, ownerMiddleware('category'), handlers.deleteCategory);

// Wallets
router.post('/v1/wallet', authMiddleware, handlers.createWallet);
router.get('/v1/wallet', authMiddleware, handlers.listWallets);
router.put('/v1/wallet/:id', authMiddleware, ownerMiddleware('wallet'), handlers.updateWallet);
router.delete('/v1/wallet/:id', authMiddleware, ownerMiddleware('wallet'), handlers.deleteWallet);

// Expenses
router.post('/v1/wallet/expense', authMiddleware, handlers.createExpense);
router.get('/v1/wallet/expense', authMiddleware, handlers.listExpenses);
router.get('/v1/wallet/expense/:from/:to', authMiddleware, handlers.listExpensesInDateRange);
router.put('/v1/wallet/expense/:id', authMiddleware, handlers.updateExpense);
router.delete('/v1/wallet/expense/:id', authMiddleware, handlers.deleteExpense);

// Scheduled Expenses
router.post('/v1/wallet/expense-scheduled', authMiddleware, handlers.createScheduledExpense);
router.get('/v1/wallet/expense-scheduled', authMiddleware, handlers.listScheduledExpenses);
router.get('/v1/wallet/expense-scheduled/:from/:to', authMiddleware, handlers.listScheduledInDateRange);
router.put('/v1/wallet/expense-scheduled/update/:id', authMiddleware, handlers.updateScheduledExpense);
router.delete('/v1/wallet/expense-scheduled/remove/:id', authMiddleware, handlers.deleteScheduledExpense);

// Budgets
router.post('/v1/wallet/budget', authMiddleware, handlers.createBudget);
router.get('/v1/wallet/budget', authMiddleware, handlers.listBudgets);
router.put('/v1/wallet/budget/:id', authMiddleware, handlers.updateBudget);
router.delete('/v1/wallet/budget/:id', authMiddleware, handlers.deleteBudget);
router.post('/v1/wallet/budget/close/:id', authMiddleware, handlers.closeBudget);

// Periods
router.post('/v1/wallet/period', authMiddleware, handlers.createPeriod);
router.get('/v1/wallet/period', authMiddleware, handlers.listPeriods);
router.put('/v1/wallet/period/:id', authMiddleware, handlers.updatePeriod);
router.delete('/v1/wallet/period/:id', authMiddleware, handlers.deletePeriod);

// Frequencies
router.post('/v1/settings/wallet-frequency', authMiddleware, handlers.createFrequency);
router.get('/v1/settings/wallet-frequency', authMiddleware, handlers.listFrequencies);
router.put('/v1/settings/wallet-frequency/:id', authMiddleware, ownerMiddleware('frequency'), handlers.updateFrequency);
router.delete('/v1/settings/wallet-frequency/:id', authMiddleware, ownerMiddleware('frequency'), handlers.deleteFrequency);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

### Shopping Function Internal Router

```typescript
// src/functions/shopping/index.ts
import { Router } from '../../shared/router';
import { authMiddleware, ownerMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

// Shopping Categories
router.post('/v1/shopping/categories', authMiddleware, handlers.createCategory);
router.get('/v1/shopping/categories', authMiddleware, handlers.listCategories);
router.put('/v1/shopping/categories/:id', authMiddleware, ownerMiddleware('category'), handlers.updateCategory);
router.delete('/v1/shopping/categories/:id', authMiddleware, ownerMiddleware('category'), handlers.deleteCategory);

// Shopping Lists
router.post('/v1/shopping/list', authMiddleware, handlers.createList);
router.get('/v1/shopping/list', authMiddleware, handlers.listLists);
router.put('/v1/shopping/list/:id', authMiddleware, ownerMiddleware('list'), handlers.updateList);
router.delete('/v1/shopping/list/:id', authMiddleware, ownerMiddleware('list'), handlers.deleteList);

// Shopping List Items
router.post('/v1/shopping/item/:listId', authMiddleware, ownerMiddleware('list'), handlers.addItem);
router.get('/v1/shopping/item/:listId', authMiddleware, ownerMiddleware('list'), handlers.listItems);
router.put('/v1/shopping/item/:id', authMiddleware, ownerMiddleware('item'), handlers.updateItem);
router.delete('/v1/shopping/item/:id', authMiddleware, ownerMiddleware('item'), handlers.deleteItem);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

### Routine Function Internal Router

```typescript
// src/functions/routine/index.ts
import { Router } from '../../shared/router';
import { authMiddleware, ownerMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

// Routine Activities
router.post('/v1/routine/activity', authMiddleware, handlers.createActivity);
router.get('/v1/routine/activity', authMiddleware, handlers.listActivities);
router.put('/v1/routine/activity/:id', authMiddleware, ownerMiddleware('activity'), handlers.updateActivity);
router.delete('/v1/routine/activity/:id', authMiddleware, ownerMiddleware('activity'), handlers.deleteActivity);

// Routines
router.post('/v1/routine', authMiddleware, handlers.createRoutine);
router.get('/v1/routine', authMiddleware, handlers.listRoutines);
router.get('/v1/routine/:id', authMiddleware, handlers.viewRoutine);
router.put('/v1/routine/:id', authMiddleware, ownerMiddleware('routine'), handlers.updateRoutine);
router.patch('/v1/routine/set-active/:id', authMiddleware, handlers.setActiveRoutine);
router.delete('/v1/routine/:id', authMiddleware, ownerMiddleware('routine'), handlers.deleteRoutine);

// Routine Details
router.post('/v1/routine/detail/:routineId', authMiddleware, ownerMiddleware('routine'), handlers.addDetail);
router.get('/v1/routine/detail/:routineId', authMiddleware, ownerMiddleware('routine'), handlers.listDetails);
router.put('/v1/routine/detail/:id', authMiddleware, ownerMiddleware('routine'), handlers.updateDetail);
router.delete('/v1/routine/detail/:id', authMiddleware, ownerMiddleware('routine'), handlers.deleteDetail);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

### Learning Function Internal Router

```typescript
// src/functions/learning/index.ts
import { Router } from '../../shared/router';
import { authMiddleware, ownerMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

// Learning Categories
router.post('/v1/learning/category', authMiddleware, handlers.createCategory);
router.get('/v1/learning/category', authMiddleware, handlers.listCategories);
router.put('/v1/learning/category/:id', authMiddleware, handlers.updateCategory);
router.delete('/v1/learning/category/:id', authMiddleware, handlers.deleteCategory);

// Learning Resources
router.post('/v1/learning', authMiddleware, handlers.createLearning);
router.get('/v1/learning', authMiddleware, handlers.listLearning);
router.put('/v1/learning/:id', authMiddleware, handlers.updateLearning);
router.delete('/v1/learning/:id', authMiddleware, handlers.deleteLearning);

// Tags
router.post('/v1/tags', authMiddleware, handlers.createTag);
router.get('/v1/tags', authMiddleware, handlers.listTags);
router.put('/v1/tags/:id', authMiddleware, handlers.updateTag);
router.delete('/v1/tags/:id', authMiddleware, handlers.deleteTag);

// Programming Languages
router.post('/v1/programming/language', authMiddleware, handlers.createLanguage);
router.get('/v1/programming/language', authMiddleware, handlers.listLanguages);
router.put('/v1/programming/language/:id', authMiddleware, handlers.updateLanguage);
router.delete('/v1/programming/language/:id', authMiddleware, handlers.deleteLanguage);

// Programming Topic Types
router.post('/v1/programming/topic-type', authMiddleware, handlers.createTopicType);
router.get('/v1/programming/topic-type', authMiddleware, handlers.listTopicTypes);
router.put('/v1/programming/topic-type/:id', authMiddleware, handlers.updateTopicType);
router.delete('/v1/programming/topic-type/:id', authMiddleware, handlers.deleteTopicType);

// Programming Topics
router.post('/v1/programming/topic', authMiddleware, handlers.createTopic);
router.get('/v1/programming/topic/:languageId', authMiddleware, handlers.listTopicsByLanguage);
router.put('/v1/programming/topic/:id', authMiddleware, handlers.updateTopic);
router.delete('/v1/programming/topic/:id', authMiddleware, handlers.deleteTopic);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

### Course Function Internal Router

```typescript
// src/functions/course/index.ts
import { Router } from '../../shared/router';
import { authMiddleware, ownerMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

// Courses
router.post('/v1/courses', authMiddleware, handlers.createCourse);
router.get('/v1/courses', authMiddleware, handlers.listCourses);
router.get('/v1/courses/:id', authMiddleware, ownerMiddleware('course'), handlers.viewCourse);
router.put('/v1/courses/:id', authMiddleware, ownerMiddleware('course'), handlers.updateCourse);
router.delete('/v1/courses/:id', authMiddleware, ownerMiddleware('course'), handlers.deleteCourse);

// Course Follow-Ups
router.post('/v1/course-followup', authMiddleware, handlers.createFollowUp);
router.get('/v1/course-followup/:courseId', authMiddleware, handlers.listFollowUps);
router.put('/v1/course-followup/:id', authMiddleware, ownerMiddleware('followUp'), handlers.updateFollowUp);
router.delete('/v1/course-followup/:id', authMiddleware, ownerMiddleware('followUp'), handlers.deleteFollowUp);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

### Sleep Function Internal Router

```typescript
// src/functions/sleep/index.ts
import { Router } from '../../shared/router';
import { authMiddleware } from '../../shared/middleware';
import * as handlers from './handlers';

const router = new Router();

router.post('/v1/sleep-tracker/register', authMiddleware, handlers.registerSleep);
router.get('/v1/sleep-tracker/by-day/:date', authMiddleware, handlers.getSleepByDay);
router.get('/v1/sleep-tracker/last', authMiddleware, handlers.getLastSleep);

export async function handler(event: APIGatewayEvent) {
  return router.handle(event);
}
```

---

## Shared Router Implementation

```typescript
// src/shared/router/index.ts
type Handler = (req: Request, res: Response, params: Record<string, string>) => Promise<void>;
type Middleware = (req: Request, res: Response, next: () => void) => Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  params: string[];
  middlewares: Middleware[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  private addRoute(method: string, path: string, ...args: any[]) {
    const handler = args.pop() as Handler;
    const middlewares = args as Middleware[];
    
    const paramNames: string[] = [];
    const pattern = new RegExp(
      '^' + path.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      }) + '$'
    );
    
    this.routes.push({ method, pattern, params: paramNames, middlewares, handler });
  }

  public get(path: string, ...args: any[]) {
    this.addRoute('GET', path, ...args);
  }

  public post(path: string, ...args: any[]) {
    this.addRoute('POST', path, ...args);
  }

  public put(path: string, ...args: any[]) {
    this.addRoute('PUT', path, ...args);
  }

  public patch(path: string, ...args: any[]) {
    this.addRoute('PATCH', path, ...args);
  }

  public delete(path: string, ...args: any[]) {
    this.addRoute('DELETE', path, ...args);
  }

  public async handle(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      const match = path.match(route.pattern);
      if (!match) continue;
      
      // Extract params
      const params: Record<string, string> = {};
      route.params.forEach((name, index) => {
        params[name] = match[index + 1];
      });
      
      // Build request/response objects
      const req = this.buildRequest(event, params);
      const res = this.buildResponse();
      
      try {
        // Execute middlewares
        for (const middleware of route.middlewares) {
          let nextCalled = false;
          await middleware(req, res, () => { nextCalled = true; });
          if (!nextCalled) break; // Middleware didn't call next()
        }
        
        // Execute handler
        await route.handler(req, res, params);
        
        return res.toAPIGatewayResult();
      } catch (error) {
        return this.handleError(error);
      }
    }
    
    // No route matched
    return {
      statusCode: 404,
      body: JSON.stringify({ status: false, message: 'Not found' }),
    };
  }

  private buildRequest(event: APIGatewayEvent, params: Record<string, string>): Request {
    return {
      method: event.httpMethod,
      path: event.path,
      headers: event.headers,
      query: event.queryStringParameters || {},
      params,
      body: event.body ? JSON.parse(event.body) : {},
      user: null, // Set by auth middleware
    };
  }

  private buildResponse(): Response {
    let statusCode = 200;
    let body: any = {};
    
    return {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        body = data;
        return this;
      },
      toAPIGatewayResult(): APIGatewayProxyResult {
        return {
          statusCode,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        };
      },
    };
  }

  private handleError(error: any): APIGatewayProxyResult {
    if (error.name === 'UnauthorizedError') {
      return {
        statusCode: 401,
        body: JSON.stringify({ status: false, message: error.message }),
      };
    }
    
    if (error.name === 'ValidationError') {
      return {
        statusCode: 400,
        body: JSON.stringify({ status: false, errors: error.errors }),
      };
    }
    
    // Generic error
    console.error('Unhandled error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: false, message: 'Internal server error' }),
    };
  }
}
```

---

## Summary

- **10 serverless functions** with internal routers
- **150+ endpoints** mapped to functions
- **Shared router** handles path matching, middlewares, error handling
- **Auth middleware** validates JWT on protected routes
- **Owner middleware** validates resource ownership
- **Consistent error handling** across all functions

Next step: Detailed implementation specifications for each handler function.
