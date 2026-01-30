# Implementation Blueprint - Part 1: Foundation
This document provides detailed specifications for implementing the Node.js serverless system.
## Repository Structure
```
xavier-serverless/
├── src/
│   ├── functions/          # Serverless function entry points
│   │   ├── auth/
│   │   ├── activity/
│   │   ├── habit/
│   │   ├── todo/
│   │   ├── wallet/
│   │   └── ...
│   └── shared/             # Shared modules across functions
│       ├── config/
│       ├── database/
│       ├── errors/
│       ├── logger/
│       ├── middleware/
│       ├── queue/
│       ├── redis/
│       ├── router/
│       ├── utils/
│       └── validators/
├── infra/terraform/        # Infrastructure as Code
├── scripts/                # Build and deploy scripts
├── tests/                  # Unit, integration, E2E tests
└── docs/                   # Documentation
```
## Runtime Decisions
- **Node.js**: 18.x LTS
- **TypeScript**: 5.x
- **Database**: PostgreSQL
- **Cache**: Redis
- **Queue**: SQS/Cloud Tasks
- **Bundler**: esbuild
- **Logger**: pino
- **Validator**: zod
- **ORM**: None (raw SQL for performance)
## Key Dependencies
```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.2",
    "pino": "^8.15.0",
    "uuid": "^9.0.0"
  }
}
```
See full implementation details in source code modules.
