# Test Suite Documentation

This directory contains the unit and integration tests for the Xavi Platform API.

## Structure

```
tests/
├── setup.ts                    # Global test setup and configuration
├── helpers/
│   └── mocks.ts               # Shared mocks and test utilities
├── unit/
│   ├── services/              # Service layer tests
│   │   ├── wallet.service.test.ts
│   │   ├── expense-category.service.test.ts
│   │   └── expense.service.test.ts
│   ├── graphql/
│   │   └── resolvers/         # GraphQL resolver tests
│   │       └── wallet.resolvers.test.ts
│   ├── middleware/            # Middleware tests
│   │   └── auth.test.ts
│   └── controllers/           # Controller tests (REST API)
│       └── auth.controller.test.ts  # Only login endpoint
└── integration/               # Integration tests (TODO)
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test wallet.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"
```

## Test Coverage

Current coverage targets (configured in `jest.config.js`):

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### What We Test

✅ **Services** (fully tested):

- `wallet.service.ts` - All CRUD operations
- `expense-category.service.ts` - All CRUD operations
- `expense.service.ts` - All CRUD operations with transactions

✅ **GraphQL Resolvers**:

- Wallet resolvers (queries and mutations)
- Authentication checks
- Error handling

✅ **Middleware**:

- Auth middleware
- Token verification
- Redis caching (with fallback)
- User authentication flow

✅ **Auth Controller** (login only):

- Login endpoint
- Credential validation
- Token generation
- Refresh token storage

### What We DON'T Test

❌ **REST API Controllers** (except login):

- Other auth endpoints (register, verify, etc.)
- Activity, habit, todo, shopping, routine, learning controllers
- These are not going to production (GraphQL will be used instead)

## Test Environment

Tests use a separate test database and environment variables defined in `.env.test`:

- Test database: `xavi_test`
- Redis: Disabled by default in tests
- JWT secrets: Test-specific values
- Log level: Silent

## Writing New Tests

### Service Tests

```typescript
import { yourService } from '../../../src/services/your.service';
import { mockDb, createMockYourType, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/drizzle', () => ({
  getDb: jest.fn(() => mockDb),
}));

describe('YourService', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('should do something', async () => {
    mockDb.select().from().where().mockResolvedValue([
      /* data */
    ]);
    const result = await yourService.yourMethod();
    expect(result).toBeDefined();
  });
});
```

### GraphQL Resolver Tests

```typescript
import { yourResolvers } from '../../../../src/graphql/modules/your/your.resolvers';
import { yourService } from '../../../../src/services/your.service';
import { GraphQLError } from 'graphql';

jest.mock('../../../../src/services/your.service');

describe('Your Resolvers', () => {
  const mockContext = { user: createMockUser() };

  it('should handle authenticated requests', async () => {
    (yourService.yourMethod as jest.Mock).mockResolvedValue(/* data */);
    const result = await yourResolvers.Query.yourQuery(null, {}, mockContext);
    expect(result).toBeDefined();
  });

  it('should throw error when not authenticated', async () => {
    await expect(yourResolvers.Query.yourQuery(null, {}, {})).rejects.toThrow(GraphQLError);
  });
});
```

## Mocking Strategy

We use Jest mocks for:

- **Drizzle ORM**: Mocked in `tests/helpers/mocks.ts`
- **Database Pool**: Mocked for legacy services
- **Redis Client**: Mocked with configurable responses
- **External Services**: All external dependencies are mocked

## Best Practices

1. **Isolation**: Each test should be independent
2. **Reset Mocks**: Always reset mocks in `beforeEach`
3. **Clear Assertions**: Use specific expect matchers
4. **Test Edge Cases**: Happy path + error scenarios
5. **Mock External Dependencies**: Never hit real databases/services in tests

## CI/CD Integration

Tests run automatically on:

- Pull requests
- Push to main branch
- Manual workflow dispatch

Failed tests will block merges to protected branches.

## Future Improvements

- [ ] Add integration tests with test database
- [ ] Add E2E tests for critical GraphQL flows
- [ ] Increase coverage to 80%+
- [ ] Add performance tests
- [ ] Add mutation testing
- [ ] Add snapshot tests for GraphQL schemas
