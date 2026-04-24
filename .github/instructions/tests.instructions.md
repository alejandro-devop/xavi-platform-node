---
description: 'Use when writing or reviewing unit tests in tests/. Covers mocking strategy for Drizzle ORM, mock factory usage, test structure, coverage exclusions, and Jest patterns.'
applyTo: 'tests/**'
---

# Testing Guidelines

Tests live in `tests/unit/` mirroring the `src/` structure. Framework: Jest 29 + ts-jest.

## Drizzle Mock Setup (required for service tests)

```typescript
// Always mock getDb BEFORE importing the module under test
jest.mock('@shared/database/drizzle', () => ({
  getDb: jest.fn(),
}));

import { getDb } from '@shared/database/drizzle';
import { mockDb, createMockWallet, resetAllMocks } from '../../helpers/mocks';

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe('DomainService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDb.mockReturnValue(mockDb as any);
  });
```

## Available Mock Factories (`tests/helpers/mocks.ts`)

```typescript
createMockWallet(overrides?)         // Returns wallet with string balance ('1000.00')
createMockCategory(overrides?)       // Returns expense category
createMockExpense(overrides?)        // Returns expense
createMockBudget(overrides?)         // Returns budget
createMockScheduledExpense(overrides?) // Returns scheduled expense
```

## mockDb API

```typescript
mockDb.query.walletWallets.findMany.mockResolvedValue([...]);
mockDb.query.walletWallets.findFirst.mockResolvedValue({...});
mockDb.insert.mockReturnValue({
  values: jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue([row]),
  }),
});
mockDb.update.mockReturnValue({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([updated]),
});
mockDb.delete.mockReturnValue({
  where: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([deleted]),
});
mockDb.transaction.mockImplementation(async (fn) => fn(mockDb));
```

## Test Structure Pattern

```typescript
describe('ServiceName.methodName', () => {
  it('should [expected behavior] when [condition]', async () => {
    // Arrange
    const mockData = createMockWallet({ name: 'Test' });
    mockDb.query.walletWallets.findMany.mockResolvedValue([mockData]);

    // Act
    const result = await domainService.getAll(1);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test');
    expect(result[0].balance).toBe(1000); // number, not string
  });

  it('should throw NotFoundError when record does not exist', async () => {
    mockDb.query.walletWallets.findFirst.mockResolvedValue(undefined);

    await expect(domainService.getById('non-existent', 1)).rejects.toThrow(NotFoundError);
  });
});
```

## Rules

- **`resetAllMocks()` in every `beforeEach`** — resets all jest mocks between tests
- **Mock `getDb` at top of file before imports** — ordering is critical with jest.mock hoisting
- **Use `createMockX()` factories** — not inline objects, to ensure correct DB shape (string decimals, UUID IDs)
- **Test both happy path and error cases** — at minimum: found/not found, authorized/forbidden
- **Path aliases work in tests**: `@shared/` and `@/` are configured in jest.config.js
- **Coverage thresholds**: 70% branches, functions, lines, statements
- **Excluded from coverage**: `routes/`, `controllers/` (except auth), `server.ts`, `app.ts`, `index.ts` files
