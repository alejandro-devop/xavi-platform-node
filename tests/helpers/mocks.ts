// Mock helpers for database and external services

// Drizzle query builder mock
const createMockQueryBuilder = () => ({
  findFirst: jest.fn(),
  findMany: jest.fn(),
});

export const mockDb = {
  query: {
    walletWallets: createMockQueryBuilder(),
    walletExpenseCategories: createMockQueryBuilder(),
    walletExpenses: createMockQueryBuilder(),
  },
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    }),
  }),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn((table) => ({
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  })),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  update: jest.fn((table) => ({
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  })),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn((table) => ({
    where: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  })),
  transaction: jest.fn(),
};

export const mockDbPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};

export const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  ping: jest.fn(),
};

/**
 * Convert camelCase keys to snake_case for db.select() mocks
 * db.select() returns data as it is in the database (snake_case)
 * while db.query returns data in camelCase as defined in schema
 */
export const toSnakeCase = (obj: any) => {
  const snakeCase: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    snakeCase[snakeKey] = value;
  }
  return snakeCase;
};

export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  isAccountVerified: true,
  ...overrides,
});

export const createMockWallet = (overrides = {}) => ({
  id: '019c7d42-15dc-7000-8000-000000000001',
  userId: 1,
  name: 'Test Wallet',
  icon: '💰💵💳',
  initialBalance: '1000.00',
  balance: '1000.00',
  isMain: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockCategory = (overrides = {}) => ({
  id: '019c7d42-15dc-7000-8000-000000000002',
  userId: 1,
  name: 'Food',
  type: 'expense',
  description: null,
  color: '#FF0000',
  icon: '🍔',
  isSystem: false,
  isTransaction: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockExpense = (overrides = {}) => ({
  id: '019c7d42-15dc-7000-8000-000000000003',
  userId: 1,
  walletId: '019c7d42-15dc-7000-8000-000000000001',
  categoryId: '019c7d42-15dc-7000-8000-000000000002',
  budgetId: null,
  date: new Date('2024-01-01'),
  description: 'Test Expense',
  debit: '50.00',
  credit: '0.00',
  isIncome: false,
  isOutcome: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const resetAllMocks = () => {
  jest.clearAllMocks();

  // Reset Drizzle query builders
  mockDb.query.walletWallets.findFirst.mockReset();
  mockDb.query.walletWallets.findMany.mockReset();
  mockDb.query.walletExpenseCategories.findFirst.mockReset();
  mockDb.query.walletExpenseCategories.findMany.mockReset();
  mockDb.query.walletExpenses.findFirst.mockReset();
  mockDb.query.walletExpenses.findMany.mockReset();

  // Reset other mocks
  mockDb.select.mockReturnThis();
  mockDb.from.mockReturnThis();
  mockDb.where.mockReturnThis();
  mockDb.orderBy.mockReturnThis();
  mockDb.limit.mockReturnThis();
  mockDb.transaction.mockReset();

  mockDbPool.query.mockReset();
  mockRedisClient.get.mockReset();
  mockRedisClient.set.mockReset();
  mockRedisClient.setex.mockReset();
  mockRedisClient.del.mockReset();
  mockRedisClient.ping.mockReset();
};
