import { Request, Response } from 'express';

interface EndpointDoc {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, any>;
  response: Record<string, any>;
}

interface ModuleDoc {
  name: string;
  description: string;
  endpoints: EndpointDoc[];
}

const documentation: ModuleDoc[] = [
  {
    name: 'Authentication',
    description: 'User registration, login, and session management',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/register',
        description: 'Register a new user account',
        auth: false,
        body: {
          email: 'string (required)',
          password: 'string (min 6 chars, required)',
          name: 'string (required)',
        },
        response: {
          user: { id: 1, email: 'user@example.com', name: 'John Doe' },
          token: 'jwt_token_here',
        },
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Login with email and password',
        auth: false,
        body: {
          email: 'string (required)',
          password: 'string (required)',
        },
        response: {
          user: { id: 1, email: 'user@example.com', name: 'John Doe' },
          token: 'jwt_token_here',
        },
      },
      {
        method: 'POST',
        path: '/api/auth/forgot-password',
        description: 'Request a password reset OTP code',
        auth: false,
        body: {
          email: 'string (required)',
        },
        response: {
          message: 'If an account exists with this email, a password reset code has been sent.',
        },
      },
      {
        method: 'POST',
        path: '/api/auth/reset-password',
        description: 'Reset password using email + OTP code',
        auth: false,
        body: {
          email: 'string (required)',
          code: 'string (6 digits, required)',
          password: 'string (min 8 chars, required)',
        },
        response: { message: 'Password reset successful' },
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        description: 'Logout and invalidate token',
        auth: true,
        response: { message: 'Logged out successfully' },
      },
      {
        method: 'GET',
        path: '/api/auth/me',
        description: 'Get current user profile',
        auth: true,
        response: {
          user: { id: 1, email: 'user@example.com', name: 'John Doe' },
        },
      },
    ],
  },
  {
    name: 'Activity',
    description: 'Manage one-time activities with scheduling',
    endpoints: [
      {
        method: 'POST',
        path: '/api/activity',
        description: 'Create a new activity',
        auth: true,
        body: {
          title: 'string (required)',
          description: 'string (optional)',
          scheduledFor: 'datetime (optional)',
          priority: 'low | medium | high | urgent (optional)',
          category: 'string (optional)',
          estimatedDuration: 'number (minutes, optional)',
        },
        response: {
          activity: {
            id: 1,
            title: 'Team Meeting',
            status: 'pending',
            priority: 'high',
            scheduledFor: '2024-01-15T10:00:00Z',
          },
        },
      },
      {
        method: 'GET',
        path: '/api/activity',
        description: 'List all activities with filters',
        auth: true,
        query: {
          status: 'pending | in_progress | completed | cancelled (optional)',
          priority: 'low | medium | high | urgent (optional)',
          category: 'string (optional)',
          page: 'number (default: 1)',
          limit: 'number (default: 20)',
        },
        response: {
          activities: [{ id: 1, title: 'Team Meeting', status: 'pending' }],
          pagination: { page: 1, limit: 20, total: 1 },
        },
      },
      {
        method: 'GET',
        path: '/api/activity/:id',
        description: 'Get activity details by ID',
        auth: true,
        params: { id: 'number' },
        response: { activity: { id: 1, title: 'Team Meeting', status: 'pending' } },
      },
      {
        method: 'PUT',
        path: '/api/activity/:id',
        description: 'Update activity (partial update)',
        auth: true,
        params: { id: 'number' },
        body: {
          title: 'string (optional)',
          status: 'pending | in_progress | completed | cancelled (optional)',
          priority: 'low | medium | high | urgent (optional)',
        },
        response: { activity: { id: 1, title: 'Updated Meeting', status: 'completed' } },
      },
      {
        method: 'DELETE',
        path: '/api/activity/:id',
        description: 'Delete an activity',
        auth: true,
        params: { id: 'number' },
        response: { message: 'Activity deleted successfully' },
      },
    ],
  },
  {
    name: 'Habit',
    description: 'Track daily habits with streaks and completion history',
    endpoints: [
      {
        method: 'POST',
        path: '/api/habit',
        description: 'Create a new habit',
        auth: true,
        body: {
          name: 'string (required)',
          description: 'string (optional)',
          frequency: 'daily | weekly | custom (default: daily)',
          targetDays: 'array of days (optional, for weekly)',
          icon: 'string (optional)',
          color: 'string (optional)',
        },
        response: {
          habit: { id: 1, name: 'Morning Exercise', frequency: 'daily', currentStreak: 0 },
        },
      },
      {
        method: 'GET',
        path: '/api/habit',
        description: 'List all habits',
        auth: true,
        query: {
          isActive: 'true | false (optional)',
          page: 'number (default: 1)',
          limit: 'number (default: 20)',
        },
        response: {
          habits: [{ id: 1, name: 'Morning Exercise', currentStreak: 5, longestStreak: 10 }],
        },
      },
      {
        method: 'POST',
        path: '/api/habit/:id/complete',
        description: 'Mark habit as completed for a date',
        auth: true,
        params: { id: 'number' },
        body: {
          completionDate: 'date (optional, default: today)',
          notes: 'string (optional)',
        },
        response: {
          completion: { id: 1, habitId: 1, completionDate: '2024-01-15', notes: 'Felt great!' },
          currentStreak: 6,
        },
      },
      {
        method: 'GET',
        path: '/api/habit/:id/history',
        description: 'Get habit completion history',
        auth: true,
        params: { id: 'number' },
        query: {
          startDate: 'date (optional)',
          endDate: 'date (optional)',
        },
        response: {
          history: [{ date: '2024-01-15', completed: true, notes: 'Felt great!' }],
          stats: { totalCompletions: 30, currentStreak: 6, completionRate: 85 },
        },
      },
    ],
  },
  {
    name: 'Todo',
    description: 'Task management with subtasks and priorities',
    endpoints: [
      {
        method: 'POST',
        path: '/api/todo',
        description: 'Create a new todo',
        auth: true,
        body: {
          title: 'string (required)',
          description: 'string (optional)',
          dueDate: 'datetime (optional)',
          priority: 'low | medium | high | urgent (optional)',
          category: 'string (optional)',
        },
        response: {
          todo: { id: 1, title: 'Complete project', status: 'pending', priority: 'high' },
        },
      },
      {
        method: 'GET',
        path: '/api/todo',
        description: 'List todos with filters',
        auth: true,
        query: {
          status: 'pending | in_progress | completed (optional)',
          priority: 'low | medium | high | urgent (optional)',
          category: 'string (optional)',
        },
        response: {
          todos: [{ id: 1, title: 'Complete project', subtasksCount: 3, completedSubtasks: 1 }],
        },
      },
      {
        method: 'POST',
        path: '/api/todo/:id/subtasks',
        description: 'Add subtask to todo',
        auth: true,
        params: { id: 'number' },
        body: {
          title: 'string (required)',
          orderIndex: 'number (required)',
        },
        response: {
          subtask: { id: 1, todoId: 1, title: 'Research options', completed: false },
        },
      },
      {
        method: 'PUT',
        path: '/api/todo/:id/subtasks/:subtaskId',
        description: 'Update subtask (mark complete/incomplete)',
        auth: true,
        params: { id: 'number', subtaskId: 'number' },
        body: {
          completed: 'boolean (optional)',
          title: 'string (optional)',
        },
        response: {
          subtask: { id: 1, title: 'Research options', completed: true },
        },
      },
    ],
  },
  {
    name: 'Wallet',
    description: 'Financial management with accounts, transactions, and categories',
    endpoints: [
      {
        method: 'POST',
        path: '/api/wallet/accounts',
        description: 'Create financial account',
        auth: true,
        body: {
          name: 'string (required)',
          type: 'cash | bank | credit_card | investment (required)',
          currency: 'string (default: USD)',
          initialBalance: 'number (default: 0)',
        },
        response: {
          account: { id: 1, name: 'Main Bank', type: 'bank', currentBalance: 1000 },
        },
      },
      {
        method: 'POST',
        path: '/api/wallet/transactions',
        description: 'Create transaction (income/expense)',
        auth: true,
        body: {
          accountId: 'number (required)',
          categoryId: 'number (optional)',
          type: 'income | expense (required)',
          amount: 'number (required)',
          description: 'string (optional)',
          transactionDate: 'datetime (optional)',
        },
        response: {
          transaction: {
            id: 1,
            accountId: 1,
            type: 'expense',
            amount: 50,
            description: 'Groceries',
          },
        },
      },
      {
        method: 'GET',
        path: '/api/wallet/transactions',
        description: 'List transactions with filters',
        auth: true,
        query: {
          accountId: 'number (optional)',
          type: 'income | expense (optional)',
          startDate: 'date (optional)',
          endDate: 'date (optional)',
        },
        response: {
          transactions: [
            { id: 1, type: 'expense', amount: 50, accountName: 'Main Bank', categoryName: 'Food' },
          ],
        },
      },
      {
        method: 'GET',
        path: '/api/wallet/accounts/:id/summary',
        description: 'Get account financial summary',
        auth: true,
        params: { id: 'number' },
        query: {
          startDate: 'date (optional)',
          endDate: 'date (optional)',
        },
        response: {
          summary: {
            currentBalance: 950,
            totalIncome: 2000,
            totalExpense: 1050,
            netIncome: 950,
          },
        },
      },
    ],
  },
  {
    name: 'Shopping',
    description: 'Shopping lists with items and categories',
    endpoints: [
      {
        method: 'POST',
        path: '/api/shopping',
        description: 'Create shopping list',
        auth: true,
        body: {
          name: 'string (required)',
          category: 'string (optional)',
        },
        response: {
          shoppingList: { id: 1, name: 'Weekly Groceries', totalItems: 0, purchasedItems: 0 },
        },
      },
      {
        method: 'POST',
        path: '/api/shopping/:id/items',
        description: 'Add item to shopping list',
        auth: true,
        params: { id: 'number' },
        body: {
          name: 'string (required)',
          quantity: 'number (optional)',
          unit: 'string (optional)',
          category: 'string (optional)',
        },
        response: {
          item: { id: 1, name: 'Milk', quantity: 2, unit: 'liters', purchased: false },
        },
      },
      {
        method: 'PUT',
        path: '/api/shopping/:id/items/:itemId',
        description: 'Update item (mark purchased)',
        auth: true,
        params: { id: 'number', itemId: 'number' },
        body: {
          purchased: 'boolean (optional)',
          quantity: 'number (optional)',
        },
        response: {
          item: { id: 1, name: 'Milk', quantity: 2, purchased: true },
        },
      },
      {
        method: 'GET',
        path: '/api/shopping/:id',
        description: 'Get shopping list with all items',
        auth: true,
        params: { id: 'number' },
        response: {
          shoppingList: {
            id: 1,
            name: 'Weekly Groceries',
            items: [{ id: 1, name: 'Milk', purchased: false }],
          },
        },
      },
    ],
  },
  {
    name: 'Routine',
    description: 'Daily routines with ordered steps',
    endpoints: [
      {
        method: 'POST',
        path: '/api/routine',
        description: 'Create routine',
        auth: true,
        body: {
          name: 'string (required)',
          description: 'string (optional)',
          timeOfDay: 'morning | afternoon | evening | night (optional)',
        },
        response: {
          routine: { id: 1, name: 'Morning Routine', timeOfDay: 'morning', totalSteps: 0 },
        },
      },
      {
        method: 'POST',
        path: '/api/routine/:id/steps',
        description: 'Add step to routine',
        auth: true,
        params: { id: 'number' },
        body: {
          title: 'string (required)',
          description: 'string (optional)',
          estimatedDuration: 'number (minutes, optional)',
          orderIndex: 'number (required)',
        },
        response: {
          step: { id: 1, title: 'Meditation', estimatedDuration: 10, orderIndex: 0 },
        },
      },
      {
        method: 'POST',
        path: '/api/routine/:id/complete',
        description: 'Log routine completion',
        auth: true,
        params: { id: 'number' },
        body: {
          completionDate: 'datetime (optional)',
          completedSteps: 'array of step IDs (optional)',
          notes: 'string (optional)',
        },
        response: {
          completion: { id: 1, routineId: 1, completionDate: '2024-01-15', completedSteps: [1, 2] },
        },
      },
    ],
  },
  {
    name: 'Learning',
    description: 'Learning resources with progress tracking and auto-status updates',
    endpoints: [
      {
        method: 'POST',
        path: '/api/learning',
        description: 'Create learning resource',
        auth: true,
        body: {
          title: 'string (required)',
          resourceType: 'article | video | book | course | podcast | tutorial | other (required)',
          url: 'string (optional)',
          category: 'string (optional)',
          priority: 'low | medium | high | urgent (optional)',
          estimatedDuration: 'number (minutes, optional)',
        },
        response: {
          resource: {
            id: 1,
            title: 'Clean Architecture',
            resourceType: 'book',
            status: 'not_started',
          },
        },
      },
      {
        method: 'POST',
        path: '/api/learning/:id/progress',
        description: 'Log progress session (auto-updates status)',
        auth: true,
        params: { id: 'number' },
        body: {
          sessionDate: 'datetime (optional)',
          durationMinutes: 'number (required)',
          notes: 'string (optional)',
          progressPercentage: 'number 0-100 (required)',
        },
        response: {
          session: {
            id: 1,
            resourceId: 1,
            durationMinutes: 60,
            progressPercentage: 25,
            notes: 'Chapter 3 completed',
          },
        },
      },
      {
        method: 'GET',
        path: '/api/learning',
        description: 'List resources with aggregated stats',
        auth: true,
        query: {
          resourceType: 'article | video | book | course | podcast | tutorial | other (optional)',
          status: 'not_started | in_progress | completed | archived (optional)',
        },
        response: {
          resources: [
            {
              id: 1,
              title: 'Clean Architecture',
              status: 'in_progress',
              totalSessions: 4,
              totalTimeSpent: 240,
              currentProgress: 75,
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/api/learning/:id',
        description: 'Get resource with all progress sessions',
        auth: true,
        params: { id: 'number' },
        response: {
          resource: {
            id: 1,
            title: 'Clean Architecture',
            progressSessions: [{ id: 1, durationMinutes: 60, progressPercentage: 25 }],
          },
        },
      },
    ],
  },
  {
    name: 'Sleep',
    description: 'Sleep tracking with quality ratings and statistics',
    endpoints: [
      {
        method: 'POST',
        path: '/api/sleep',
        description: 'Log sleep entry',
        auth: true,
        body: {
          sleepDate: 'date (required)',
          bedtime: 'datetime (required)',
          wakeTime: 'datetime (required)',
          quality: 'poor | fair | good | excellent (optional)',
          moodOnWaking: 'tired | groggy | refreshed | energized (optional)',
          notes: 'string (optional)',
        },
        response: {
          sleepLog: {
            id: 1,
            sleepDate: '2024-01-15',
            durationMinutes: 450,
            durationHours: '7.5',
            quality: 'good',
          },
        },
      },
      {
        method: 'GET',
        path: '/api/sleep',
        description: 'List sleep logs',
        auth: true,
        query: {
          startDate: 'date (optional)',
          endDate: 'date (optional)',
          quality: 'poor | fair | good | excellent (optional)',
        },
        response: {
          sleepLogs: [{ id: 1, sleepDate: '2024-01-15', durationHours: '7.5', quality: 'good' }],
        },
      },
      {
        method: 'GET',
        path: '/api/sleep/stats',
        description: 'Get sleep statistics',
        auth: true,
        query: {
          startDate: 'date (optional)',
          endDate: 'date (optional)',
        },
        response: {
          stats: {
            totalNights: 30,
            avgDurationHours: '7.6',
            minDurationHours: '6.3',
            maxDurationHours: '9.0',
            qualityDistribution: { poor: 2, fair: 5, good: 15, excellent: 8 },
          },
        },
      },
    ],
  },
  {
    name: 'Course',
    description: 'Structured courses with modules, lessons, and progress tracking',
    endpoints: [
      {
        method: 'POST',
        path: '/api/course',
        description: 'Create course',
        auth: true,
        body: {
          title: 'string (required)',
          description: 'string (optional)',
          instructor: 'string (optional)',
          durationHours: 'number (optional)',
          difficulty: 'beginner | intermediate | advanced (optional)',
          tags: 'array of strings (optional)',
        },
        response: {
          course: {
            id: 1,
            title: 'Full Stack Development',
            difficulty: 'intermediate',
            status: 'not_started',
          },
        },
      },
      {
        method: 'POST',
        path: '/api/course/:courseId/modules',
        description: 'Add module to course',
        auth: true,
        params: { courseId: 'number' },
        body: {
          title: 'string (required)',
          description: 'string (optional)',
          orderIndex: 'number (required)',
        },
        response: {
          module: { id: 1, courseId: 1, title: 'Frontend Basics', orderIndex: 0 },
        },
      },
      {
        method: 'POST',
        path: '/api/course/:courseId/modules/:moduleId/lessons',
        description: 'Add lesson to module',
        auth: true,
        params: { courseId: 'number', moduleId: 'number' },
        body: {
          title: 'string (required)',
          contentType: 'video | text | quiz | exercise | assignment (optional)',
          contentUrl: 'string (optional)',
          durationMinutes: 'number (optional)',
          orderIndex: 'number (required)',
        },
        response: {
          lesson: {
            id: 1,
            moduleId: 1,
            title: 'HTML Basics',
            contentType: 'video',
            durationMinutes: 45,
          },
        },
      },
      {
        method: 'POST',
        path: '/api/course/:courseId/lessons/:lessonId/progress',
        description: 'Mark lesson complete (auto-updates course status)',
        auth: true,
        params: { courseId: 'number', lessonId: 'number' },
        body: {
          completed: 'boolean (required)',
          notes: 'string (optional)',
        },
        response: {
          progress: { id: 1, lessonId: 1, completed: true, notes: 'Great lesson!' },
          courseStatus: 'in_progress',
        },
      },
      {
        method: 'GET',
        path: '/api/course/:id',
        description: 'Get course with full structure (modules, lessons, progress)',
        auth: true,
        params: { id: 'number' },
        response: {
          course: {
            id: 1,
            title: 'Full Stack Development',
            status: 'in_progress',
            progress: 50,
            totalLessons: 10,
            completedLessons: 5,
            modules: [
              {
                id: 1,
                title: 'Frontend Basics',
                lessons: [{ id: 1, title: 'HTML Basics', completed: true }],
              },
            ],
          },
        },
      },
      {
        method: 'GET',
        path: '/api/course/:id/progress',
        description: 'Get course progress summary',
        auth: true,
        params: { id: 'number' },
        response: {
          progress: {
            courseId: 1,
            totalModules: 3,
            totalLessons: 10,
            completedLessons: 5,
            progress: 50,
            startedDate: '2024-01-01',
            lastActivity: '2024-01-15',
          },
        },
      },
    ],
  },
];

export async function getDocumentation(req: Request, res: Response): Promise<void> {
  // Remove CSP header to allow inline scripts for documentation page
  res.removeHeader('Content-Security-Policy');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xavier API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    header h1 { font-size: 2.5em; margin-bottom: 10px; }
    header p { font-size: 1.2em; opacity: 0.9; }
    .module {
      background: white;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .module-header {
      background: #f8f9fa;
      padding: 20px;
      border-bottom: 2px solid #e9ecef;
      cursor: pointer;
      transition: background 0.3s;
    }
    .module-header:hover { background: #e9ecef; }
    .module-header h2 {
      color: #667eea;
      font-size: 1.5em;
      margin-bottom: 5px;
    }
    .module-header p { color: #6c757d; }
    .module-content { padding: 20px; display: none; }
    .module.active .module-content { display: block; }
    .endpoint {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 15px;
      overflow: hidden;
    }
    .endpoint-header {
      background: #f8f9fa;
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .method {
      font-weight: bold;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      text-transform: uppercase;
    }
    .method.get { background: #d4edda; color: #155724; }
    .method.post { background: #cce5ff; color: #004085; }
    .method.put { background: #fff3cd; color: #856404; }
    .method.delete { background: #f8d7da; color: #721c24; }
    .path {
      font-family: 'Courier New', monospace;
      color: #495057;
      flex: 1;
    }
    .auth-badge {
      background: #28a745;
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75em;
      font-weight: bold;
    }
    .endpoint-body {
      padding: 15px;
      background: #fafbfc;
    }
    .description {
      color: #6c757d;
      margin-bottom: 15px;
      font-style: italic;
    }
    .section {
      margin-bottom: 15px;
    }
    .section-title {
      font-weight: bold;
      color: #495057;
      margin-bottom: 8px;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .code-block {
      background: #282c34;
      color: #abb2bf;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      line-height: 1.5;
    }
    .param-list {
      list-style: none;
    }
    .param-list li {
      padding: 8px;
      border-left: 3px solid #667eea;
      margin-bottom: 8px;
      background: white;
      border-radius: 4px;
    }
    .param-name {
      font-weight: bold;
      color: #667eea;
      font-family: 'Courier New', monospace;
    }
    .param-type {
      color: #6c757d;
      font-size: 0.9em;
    }
    .toggle-all {
      text-align: center;
      margin-bottom: 20px;
    }
    .toggle-all button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1em;
      font-weight: bold;
      transition: background 0.3s;
    }
    .toggle-all button:hover {
      background: #764ba2;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Xavier API Documentation</h1>
      <p>Complete API reference for Xavier Personal Productivity Platform</p>
    </header>

    <div class="toggle-all">
      <button id="toggleAllBtn">Expand/Collapse All</button>
    </div>

    ${documentation
      .map(
        (module, idx) => `
      <div class="module" data-module-index="${idx}">
        <div class="module-header">
          <h2>${module.name}</h2>
          <p>${module.description}</p>
        </div>
        <div class="module-content">
          ${module.endpoints
            .map(
              (endpoint) => `
            <div class="endpoint">
              <div class="endpoint-header">
                <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                <span class="path">${endpoint.path}</span>
                ${endpoint.auth ? '<span class="auth-badge">🔒 AUTH</span>' : ''}
              </div>
              <div class="endpoint-body">
                <div class="description">${endpoint.description}</div>

                ${
                  endpoint.params
                    ? `
                <div class="section">
                  <div class="section-title">Path Parameters</div>
                  <ul class="param-list">
                    ${Object.entries(endpoint.params)
                      .map(
                        ([key, value]) => `
                      <li>
                        <span class="param-name">${key}</span>
                        <span class="param-type">: ${value}</span>
                      </li>
                    `
                      )
                      .join('')}
                  </ul>
                </div>
                `
                    : ''
                }

                ${
                  endpoint.query
                    ? `
                <div class="section">
                  <div class="section-title">Query Parameters</div>
                  <ul class="param-list">
                    ${Object.entries(endpoint.query)
                      .map(
                        ([key, value]) => `
                      <li>
                        <span class="param-name">${key}</span>
                        <span class="param-type">: ${value}</span>
                      </li>
                    `
                      )
                      .join('')}
                  </ul>
                </div>
                `
                    : ''
                }

                ${
                  endpoint.body
                    ? `
                <div class="section">
                  <div class="section-title">Request Body</div>
                  <div class="code-block">${JSON.stringify(endpoint.body, null, 2)}</div>
                </div>
                `
                    : ''
                }

                <div class="section">
                  <div class="section-title">Response Example</div>
                  <div class="code-block">${JSON.stringify({ status: true, data: endpoint.response, meta: { env: 'development' } }, null, 2)}</div>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
      )
      .join('')}
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Toggle individual modules
      const moduleHeaders = document.querySelectorAll('.module-header');
      moduleHeaders.forEach(function(header) {
        header.addEventListener('click', function() {
          const module = header.parentElement;
          module.classList.toggle('active');
        });
      });

      // Toggle all modules
      const toggleBtn = document.getElementById('toggleAllBtn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
          const modules = document.querySelectorAll('.module');
          const anyActive = Array.from(modules).some(function(m) {
            return m.classList.contains('active');
          });
          
          modules.forEach(function(module) {
            if (anyActive) {
              module.classList.remove('active');
            } else {
              module.classList.add('active');
            }
          });
        });
      }
    });
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

export async function getDocumentationJson(req: Request, res: Response): Promise<void> {
  res.json({
    status: true,
    data: {
      title: 'Xavier API Documentation',
      version: '1.0.0',
      baseUrl: '/api',
      modules: documentation,
    },
  });
}
