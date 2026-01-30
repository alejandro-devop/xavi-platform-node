# Xavier API - Quick Start Guide

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- PostgreSQL 15 (if running without Docker)
- Redis 7 (optional, for caching)

## Local Development with Docker (Recommended)

### 1. Copy environment variables

```bash
cp .env.example .env
```

The default values in `.env.example` are configured for Docker Compose and will work out of the box.

### 2. Start all services

```bash
npm run docker:up
```

This will start:

- PostgreSQL database on port 5432
- Redis cache on port 6379
- API server on port 8080 with hot reload

### 3. Verify it's running

```bash
curl http://localhost:8080/health
```

You should see:

```json
{
  "success": true,
  "data": {
    "status": "healthy"
  }
}
```

### 4. View logs

```bash
npm run docker:logs
```

### 5. Stop all services

```bash
npm run docker:down
```

## Local Development without Docker

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and update the database/Redis connection details to match your local setup:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=xavi_db
DB_USER=your_user
DB_PASSWORD=your_password

REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_REDIS_CACHE=false  # Set to false if you don't have Redis
```

### 3. Create database

```bash
psql -U postgres
CREATE DATABASE xavi_db;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE xavi_db TO your_user;
\q
```

### 4. Start development server

```bash
npm run dev
```

The server will start on http://localhost:8080 with hot reload.

## Testing the API

### Health Check

```bash
# Basic health check
curl http://localhost:8080/health

# Readiness check (verifies DB and Redis connectivity)
curl http://localhost:8080/ready
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "status": "healthy"
  }
}
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server (requires build first)
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run docker:build` - Build Docker image
- `npm run docker:up` - Start Docker Compose services
- `npm run docker:down` - Stop Docker Compose services
- `npm run docker:logs` - View Docker logs

## Project Structure

```
xavi-platform-node/
├── src/
│   ├── shared/          # Shared infrastructure
│   │   ├── config/      # Service initialization
│   │   ├── database/    # PostgreSQL connection pooling
│   │   ├── redis/       # Redis client
│   │   ├── logger/      # Pino logger with Cloud Logging
│   │   ├── errors/      # Custom error classes
│   │   ├── middleware/  # Express middleware
│   │   └── utils/       # Utilities (JWT, password, OTP, etc.)
│   ├── routes/          # API routes
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Server entry point
├── docs/                # Documentation
├── package.json
├── tsconfig.json
├── Dockerfile           # Production Dockerfile
├── Dockerfile.dev       # Development Dockerfile
└── docker-compose.yml   # Local development stack
```

## Next Steps

Once the foundation is running:

1. **Phase 2**: Implement authentication module
   - User registration and login
   - JWT token management
   - Email verification with OTP

2. **Phase 3+**: Implement domain modules
   - Activity tracking
   - Habit management
   - Todo lists
   - Wallet and finances
   - Shopping lists
   - Routines
   - Learning resources
   - Course management
   - Sleep tracking

See [docs/architecture/CLOUD_RUN_ROADMAP.md](docs/architecture/CLOUD_RUN_ROADMAP.md) for the complete 10-week implementation plan.

## Troubleshooting

### Port already in use

If port 8080 is already in use, you can change it in `.env`:

```env
PORT=3000
```

### Database connection failed

Make sure PostgreSQL is running and the credentials in `.env` are correct.

For Docker Compose, the services will wait for the database to be healthy before starting the app.

### Redis connection failed

If you don't need Redis caching, set:

```env
ENABLE_REDIS_CACHE=false
```

The app will work without Redis, just without session caching.

### Module not found errors

Delete `node_modules` and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Documentation

- [Architecture Overview](docs/architecture/CLOUD_RUN_ARCHITECTURE.md)
- [Implementation Guide](docs/architecture/CLOUD_RUN_IMPLEMENTATION.md)
- [Roadmap](docs/architecture/CLOUD_RUN_ROADMAP.md)
- [API Contracts](docs/architecture/API_CONTRACTS.md)
- [Data Model](docs/architecture/DATA_MODEL.md)
- [Master Spec](docs/architecture/MASTER_SPEC.md)
