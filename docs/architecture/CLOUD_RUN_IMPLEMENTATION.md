# Cloud Run Implementation Guide

## Overview

This document provides **concrete code examples** and implementation patterns for building Xavier API on Google Cloud Run. Use this alongside [CLOUD_RUN_ARCHITECTURE.md](./CLOUD_RUN_ARCHITECTURE.md) for complete implementation guidance.

---

## Project Structure

```
xavi-api/
├── src/
│   ├── server.ts                 # Main entry point
│   ├── app.ts                    # Express app configuration
│   ├── routes/                   # Route handlers
│   │   ├── index.ts              # Route aggregation
│   │   ├── health.ts             # Health check endpoints
│   │   ├── auth.ts               # Auth routes
│   │   ├── activity.ts           # Activity routes
│   │   ├── habit.ts              # Habit routes
│   │   ├── todo.ts               # Todo routes
│   │   ├── wallet.ts             # Wallet routes
│   │   └── ...
│   ├── controllers/              # Business logic
│   │   ├── auth/
│   │   ├── activity/
│   │   └── ...
│   ├── shared/                   # Shared modules
│   │   ├── config/
│   │   │   ├── database.ts       # DB configuration
│   │   │   ├── redis.ts          # Redis configuration
│   │   │   ├── secrets.ts        # Secret Manager integration
│   │   │   └── index.ts          # Service initialization
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT authentication
│   │   │   ├── error-handler.ts  # Global error handler
│   │   │   ├── request-logger.ts # Request logging
│   │   │   ├── validate.ts       # Request validation
│   │   │   └── index.ts
│   │   ├── database/
│   │   │   ├── pool.ts           # Connection pool
│   │   │   ├── queries.ts        # Reusable queries
│   │   │   └── transactions.ts   # Transaction helpers
│   │   ├── redis/
│   │   │   └── client.ts         # Redis client
│   │   ├── logger/
│   │   │   └── index.ts          # Cloud Logging integration
│   │   ├── errors/
│   │   │   └── index.ts          # Custom error classes
│   │   ├── validators/
│   │   │   └── schemas.ts        # Zod schemas
│   │   └── utils/
│   │       ├── jwt.ts            # JWT utilities
│   │       ├── password.ts       # Password hashing
│   │       └── response.ts       # Standardized responses
│   └── types/
│       ├── express.d.ts          # Express type extensions
│       └── index.ts
├── migrations/                   # Database migrations
├── tests/                        # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                      # Utility scripts
│   ├── migrate.ts                # Run migrations
│   └── seed.ts                   # Seed data
├── terraform/                    # Infrastructure
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD pipeline
├── Dockerfile                    # Production image
├── Dockerfile.dev                # Development image
├── docker-compose.yml            # Local dev environment
├── cloudbuild.yaml               # Cloud Build config
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

---

## Core Implementation Files

### 1. server.ts - Main Entry Point

```typescript
// src/server.ts
import { createApp } from "./app";
import { initializeServices, shutdownServices } from "./shared/config";
import { logger } from "./shared/logger";

const PORT = parseInt(process.env.PORT || "8080", 10);

async function startServer() {
  try {
    // Initialize services (DB, Redis, etc.)
    logger.info("Initializing services...");
    await initializeServices();

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const server = app.listen(PORT, "0.0.0.0", () => {
      logger.info({ port: PORT }, "Server started successfully");
    });

    // Graceful shutdown handlers
    const shutdownHandler = async (signal: string) => {
      logger.info({ signal }, "Shutdown signal received");

      // Stop accepting new requests
      server.close(async () => {
        logger.info("HTTP server closed");

        // Close database and Redis connections
        await shutdownServices();

        logger.info("Shutdown complete");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
    process.on("SIGINT", () => shutdownHandler("SIGINT"));
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

startServer();
```

### 2. app.ts - Express App Configuration

```typescript
// src/app.ts
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { setupRoutes } from "./routes";
import { errorHandler } from "./shared/middleware/error-handler";
import { requestLogger } from "./shared/middleware/request-logger";
import { logger } from "./shared/logger";

export function createApp(): Express {
  const app = express();

  // Trust proxy (Cloud Run is behind a proxy)
  app.set("trust proxy", true);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Adjust as needed
    }),
  );

  // CORS
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      credentials: true,
    }),
  );

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Request logging
  app.use(requestLogger);

  // Setup all routes
  setupRoutes(app);

  // Global error handler (must be last)
  app.use(errorHandler);

  logger.info("Express app configured");

  return app;
}
```

### 3. routes/index.ts - Route Aggregation

```typescript
// src/routes/index.ts
import { Express } from "express";
import healthRoutes from "./health";
import authRoutes from "./auth";
import activityRoutes from "./activity";
import habitRoutes from "./habit";
import todoRoutes from "./todo";
import walletRoutes from "./wallet";
import shoppingRoutes from "./shopping";
import routineRoutes from "./routine";
import learningRoutes from "./learning";
import courseRoutes from "./course";
import sleepRoutes from "./sleep";

export function setupRoutes(app: Express): void {
  // Health checks (no auth required)
  app.use("/", healthRoutes);

  // Auth routes (no /v1 prefix)
  app.use("/auth", authRoutes);

  // API routes with /v1 prefix
  app.use("/v1/activity-categories", activityRoutes.categories);
  app.use("/v1/activity", activityRoutes.activities);
  app.use("/v1/habit-categories", habitRoutes.categories);
  app.use("/v1/habit", habitRoutes.habits);
  app.use("/v1/todo-categories", todoRoutes.categories);
  app.use("/v1/todo-lists", todoRoutes.lists);
  app.use("/v1/todo-frequencies", todoRoutes.frequencies);
  app.use("/v1/todo", todoRoutes.todos);
  app.use("/v1/wallet-categories", walletRoutes.categories);
  app.use("/v1/wallet", walletRoutes.wallets);
  app.use("/v1/shopping-categories", shoppingRoutes.categories);
  app.use("/v1/shopping", shoppingRoutes.lists);
  app.use("/v1/routine", routineRoutes);
  app.use("/v1/learning-categories", learningRoutes.categories);
  app.use("/v1/learning", learningRoutes.resources);
  app.use("/v1/programming", learningRoutes.programming);
  app.use("/v1/tags", learningRoutes.tags);
  app.use("/v1/courses", courseRoutes);
  app.use("/v1/sleep-tracker", sleepRoutes);

  // 404 handler
  app.use("*", (req, res) => {
    res.status(404).json({
      status: false,
      errors: ["Endpoint not found"],
      env: process.env.NODE_ENV,
    });
  });
}
```

### 4. shared/config/index.ts - Service Initialization

```typescript
// src/shared/config/index.ts
import { initializeDbPool, shutdownDbPool } from "../database/pool";
import { initializeRedisClient, shutdownRedisClient } from "../redis/client";
import { logger } from "../logger";

export async function initializeServices(): Promise<void> {
  try {
    // Initialize database pool
    const dbPool = initializeDbPool();
    logger.info("Database pool initialized");

    // Test database connection
    await dbPool.query("SELECT 1");
    logger.info("Database connection verified");

    // Initialize Redis client
    const redis = initializeRedisClient();
    logger.info("Redis client initialized");

    // Test Redis connection
    await redis.ping();
    logger.info("Redis connection verified");

    logger.info("All services initialized successfully");
  } catch (error) {
    logger.error({ error }, "Failed to initialize services");
    throw error;
  }
}

export async function shutdownServices(): Promise<void> {
  logger.info("Shutting down services...");

  try {
    await Promise.all([shutdownDbPool(), shutdownRedisClient()]);

    logger.info("All services shut down successfully");
  } catch (error) {
    logger.error({ error }, "Error during service shutdown");
    throw error;
  }
}
```

### 5. shared/middleware/auth.ts - JWT Authentication

```typescript
// src/shared/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { getRedisClient } from "../redis/client";
import { getDbPool } from "../database/pool";
import { UnauthorizedError } from "../errors";
import { logger } from "../logger";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  isAccountVerified: boolean;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT
    const payload = verifyAccessToken(token);

    // Check Redis cache first
    const cacheKey = `session:${payload.jti}`;
    const redis = getRedisClient();
    const cachedUser = await redis.get(cacheKey);

    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      logger.debug({ userId: req.user!.id }, "User authenticated from cache");
      return next();
    }

    // Cache miss - query database
    const db = getDbPool();
    const result = await db.query(
      "SELECT id, email, name, is_account_verified FROM users WHERE id = $1",
      [payload.sub],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError("User not found");
    }

    const user: AuthenticatedUser = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      isAccountVerified: result.rows[0].is_account_verified,
    };

    // Cache user for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(user));

    req.user = user;
    logger.debug({ userId: user.id }, "User authenticated from database");

    next();
  } catch (error) {
    next(error);
  }
}

// Optional middleware to check if user owns a resource
export function ownerMiddleware(resourceIdParam: string = "id") {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const resourceId = parseInt(req.params[resourceIdParam], 10);
      if (isNaN(resourceId)) {
        return next();
      }

      // This is a simplified check - implement per resource type
      const tableName = getTableFromRoute(req.route.path);
      if (!tableName) {
        return next();
      }

      const db = getDbPool();
      const result = await db.query(
        `SELECT user_id FROM ${tableName} WHERE id = $1`,
        [resourceId],
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedError("Resource not found");
      }

      if (result.rows[0].user_id !== req.user.id) {
        throw new UnauthorizedError("You do not own this resource");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function getTableFromRoute(routePath: string): string | null {
  // Map route patterns to table names
  const routeMap: Record<string, string> = {
    "/activity-categories": "activity_categories",
    "/activity": "activities",
    "/habit-categories": "habit_categories",
    "/habit": "habits",
    // ... add more mappings
  };

  for (const [pattern, table] of Object.entries(routeMap)) {
    if (routePath.includes(pattern)) {
      return table;
    }
  }

  return null;
}
```

### 6. shared/middleware/error-handler.ts - Global Error Handler

```typescript
// src/shared/middleware/error-handler.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from "../errors";

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Log error
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      request: {
        method: req.method,
        path: req.path,
        userId: req.user?.id,
      },
    },
    "Request error",
  );

  // Handle known error types
  if (error instanceof ValidationError) {
    res.status(400).json({
      status: false,
      errors: error.errors,
      env: process.env.NODE_ENV,
    });
    return;
  }

  if (error instanceof UnauthorizedError) {
    res.status(401).json({
      status: false,
      errors: [error.message],
      env: process.env.NODE_ENV,
    });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({
      status: false,
      errors: [error.message],
      env: process.env.NODE_ENV,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: false,
      errors: [error.message],
      env: process.env.NODE_ENV,
    });
    return;
  }

  // Unknown error - return 500
  res.status(500).json({
    status: false,
    errors: ["Internal server error"],
    env: process.env.NODE_ENV,
    ...(process.env.NODE_ENV === "development" && {
      debug: {
        message: error.message,
        stack: error.stack,
      },
    }),
  });
}
```

### 7. shared/errors/index.ts - Custom Error Classes

```typescript
// src/shared/errors/index.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(public errors: string[]) {
    super("Validation failed", 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}
```

### 8. routes/auth.ts - Example Route Implementation

```typescript
// src/routes/auth.ts
import { Router } from "express";
import { asyncHandler } from "../shared/utils/async-handler";
import { validate } from "../shared/middleware/validate";
import { registerSchema, loginSchema } from "../shared/validators/auth-schemas";
import * as authController from "../controllers/auth";

const router = Router();

// POST /auth/register
router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(authController.register),
);

// POST /auth/login
router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(authController.login),
);

// GET /auth/verify/:code
router.get("/verify/:code", asyncHandler(authController.verifyEmail));

// POST /auth/resend-verification
router.post(
  "/resend-verification",
  asyncHandler(authController.resendVerification),
);

// POST /auth/refresh
router.post("/refresh", asyncHandler(authController.refreshToken));

// POST /auth/verify-token (requires auth)
router.post("/verify-token", asyncHandler(authController.verifyToken));

export default router;
```

### 9. controllers/auth/index.ts - Controller Example

```typescript
// src/controllers/auth/index.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { getDbPool } from "../../shared/database/pool";
import { getRedisClient } from "../../shared/redis/client";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../shared/utils/jwt";
import { ValidationError, UnauthorizedError } from "../../shared/errors";
import { logger } from "../../shared/logger";

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;
  const db = getDbPool();

  // Check if email already exists
  const existingUser = await db.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  if (existingUser.rows.length > 0) {
    throw new ValidationError(["Email already registered"]);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Insert user
  const result = await db.query(
    `INSERT INTO users (name, email, password, auth_otp, is_account_verified, last_otp_sent, created_at, updated_at)
     VALUES ($1, $2, $3, $4, false, NOW(), NOW(), NOW())
     RETURNING id`,
    [name, email, hashedPassword, otp],
  );

  const userId = result.rows[0].id;

  // TODO: Queue verification email with OTP
  logger.info({ userId, email }, "User registered, verification email queued");

  res.status(200).json({
    status: true,
    env: process.env.NODE_ENV,
    data: { id: userId },
    message:
      "User created successfully, an e-mail was sent to confirm your account",
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const db = getDbPool();

  // Find user
  const result = await db.query(
    "SELECT id, name, email, password, email_verified_at, is_account_verified FROM users WHERE email = $1",
    [email],
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError("User or password wrong");
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("User or password wrong");
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token in database
  // TODO: Implement refresh token storage

  // Cache session in Redis
  const redis = getRedisClient();
  const sessionKey = `session:${user.id}`;
  await redis.setex(
    sessionKey,
    600, // 10 minutes
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      isAccountVerified: user.is_account_verified,
    }),
  );

  logger.info({ userId: user.id }, "User logged in");

  res.status(200).json({
    status: true,
    meta: { env: process.env.NODE_ENV },
    data: {
      message: "User logged",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified_at: user.email_verified_at,
        is_account_verified: user.is_account_verified,
      },
      token: accessToken,
      refresh: refreshToken,
    },
  });
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { code } = req.params;

  // Decode base64
  const decoded = Buffer.from(code, "base64").toString("utf-8");
  const otp = decoded.substring(0, 6);
  const userId = decoded.substring(6);

  const db = getDbPool();

  // Find user with matching OTP
  const result = await db.query(
    "SELECT id FROM users WHERE id = $1 AND auth_otp = $2",
    [userId, otp],
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      status: false,
      errors: ["Invalid verification code"],
      env: process.env.NODE_ENV,
    });
    return;
  }

  // Mark as verified and clear OTP
  await db.query(
    `UPDATE users 
     SET is_account_verified = true, 
         email_verified_at = NOW(), 
         auth_otp = NULL, 
         updated_at = NOW()
     WHERE id = $1`,
    [userId],
  );

  logger.info({ userId }, "Email verified");

  res.status(200).json({
    status: true,
    env: process.env.NODE_ENV,
    message: "Email verified successfully",
  });
}

// Additional controller methods: resendVerification, refreshToken, verifyToken
export async function resendVerification(
  req: Request,
  res: Response,
): Promise<void> {
  // TODO: Implement
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  // TODO: Implement
}

export async function verifyToken(req: Request, res: Response): Promise<void> {
  // TODO: Implement
}
```

### 10. shared/utils/async-handler.ts - Async Wrapper

```typescript
// src/shared/utils/async-handler.ts
import { Request, Response, NextFunction } from "express";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

---

## package.json Configuration

```json
{
  "name": "xavi-api",
  "version": "1.0.0",
  "description": "Xavier Personal Productivity API - Cloud Run",
  "main": "dist/server.js",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "migrate": "tsx scripts/migrate.ts",
    "migrate:create": "tsx scripts/create-migration.ts",
    "seed": "tsx scripts/seed.ts",
    "docker:build": "docker build -t xavi-api .",
    "docker:run": "docker run -p 8080:8080 --env-file .env xavi-api"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "ioredis": "^5.3.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "pino": "^8.16.2",
    "pino-pretty": "^10.2.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "uuid": "^9.0.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "@types/pg": "^8.10.9",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/uuid": "^9.0.7",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.0.1",
    "prettier": "^3.1.1",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "tsc-alias": "^1.8.8",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

---

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@shared/*": ["./shared/*"],
      "@routes/*": ["./routes/*"],
      "@controllers/*": ["./controllers/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Environment Variables

```bash
# .env.example
# Server
NODE_ENV=development
PORT=8080
LOG_LEVEL=debug

# Database (Cloud SQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=changeme
DB_NAME=xavier_dev
CLOUD_SQL_CONNECTION_NAME=

# Redis (Memorystore)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=changeme-long-random-secret-64-chars-minimum
JWT_REFRESH_SECRET=changeme-long-random-refresh-secret-64-chars-minimum
JWT_ACCESS_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=2592000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# GCP (Cloud Run)
GCP_PROJECT=
GCP_REGION=us-central1

# Email (SendGrid)
SENDGRID_API_KEY=
EMAIL_FROM=noreply@xavi.app

# Feature Flags
ENABLE_EMAIL_QUEUE=true
ENABLE_REDIS_CACHE=true
```

---

## Next Steps

1. **Initialize Project**

   ```bash
   npm init -y
   npm install
   ```

2. **Set up Database**
   - Create Cloud SQL instance
   - Run migrations from DATA_MODEL.md

3. **Implement Controllers**
   - Start with auth (register, login, verify)
   - Then implement each domain (activity, habit, etc.)
   - Follow API_CONTRACTS.md and BEHAVIOR_SPEC.md

4. **Write Tests**
   - Unit tests for utilities
   - Integration tests for routes
   - E2E tests for critical flows

5. **Deploy to Cloud Run**
   - Build Docker image
   - Push to GCR
   - Deploy with Terraform or gcloud CLI

---

**Document Version**: 1.0  
**Last Updated**: January 30, 2026  
**Related Docs**: [CLOUD_RUN_ARCHITECTURE.md](./CLOUD_RUN_ARCHITECTURE.md), [API_CONTRACTS.md](./API_CONTRACTS.md)
