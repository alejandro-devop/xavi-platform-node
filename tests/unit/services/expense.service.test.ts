import { expenseService } from '../../../src/services/expense.service';
import { mockDb, createMockExpense, createMockWallet, createMockCategory, resetAllMocks } from '../../helpers/mocks';

// Mock Drizzle
jest.mock('../../../src/shared/database/drizzle', () => ({
  getDb: jest.fn(),
  getDrizzlePool: jest.fn(() => ({ query: jest.fn() })),
}));

import { getDb } from '../../../src/shared/database/drizzle';
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe('ExpenseService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDb.mockReturnValue(mockDb as any);
  });

  describe('getExpenses', () => {
    it('should return all expenses for a user', async () => {
      const mockExpenses = [
        createMockExpense({ id: '1', description: 'Expense 1' }),
        createMockExpense({ id: '2', description: 'Expense 2' }),
      ];

      mockDb.query.walletExpenses.findMany.mockResolvedValue(mockExpenses);

      const result = await expenseService.getExpenses(1, {});

      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('Expense 1');
      expect(result[0].debit).toBe(50); // Converted from string to number
      expect(result[0].credit).toBe(0);
      expect(mockDb.query.walletExpenses.findMany).toHaveBeenCalled();
    });

    it('should filter expenses by walletId', async () => {
      const walletId = '019c7d42-15dc-7000-8000-000000000001';
      const mockExpenses = [createMockExpense({ walletId })];

      mockDb.query.walletExpenses.findMany.mockResolvedValue(mockExpenses);

      const result = await expenseService.getExpenses(1, { walletId });

      expect(result).toHaveLength(1);
      expect(result[0].walletId).toBe(walletId);
      expect(result[0].debit).toBe(50);
    });

    it('should filter expenses by categoryId', async () => {
      const categoryId = '019c7d42-15dc-7000-8000-000000000002';
      const mockExpenses = [createMockExpense({ categoryId })];

      mockDb.query.walletExpenses.findMany.mockResolvedValue(mockExpenses);

      const result = await expenseService.getExpenses(1, { categoryId });

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe(categoryId);
    });

    it('should filter expenses by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const mockExpenses = [createMockExpense({ date: new Date('2024-01-15') })];

      mockDb.query.walletExpenses.findMany.mockResolvedValue(mockExpenses);

      const result = await expenseService.getExpenses(1, { startDate, endDate });

      expect(result).toHaveLength(1);
      expect(result[0].debit).toBe(50);
    });
  });

  describe('getExpenseById', () => {
    it('should return an expense by id', async () => {
      const mockExpense = createMockExpense();
      mockDb.query.walletExpenses.findFirst.mockResolvedValue(mockExpense);

      const result = await expenseService.getExpenseById(mockExpense.id, 1);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockExpense.id);
      expect(result.debit).toBe(50); // Converted to number
      expect(result.credit).toBe(0);
    });

    it('should return null when expense not found', async () => {
      mockDb.query.walletExpenses.findFirst.mockResolvedValue(undefined);

      try {
        await expenseService.getExpenseById('non-existent-id', 1);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('createExpense', () => {
    it('should create a new expense with transaction', async () => {
      const newExpense = createMockExpense();
      const wallet = createMockWallet({ balance: '1000.00' });
      const category = createMockCategory();
      const expenseData = {
        walletId: wallet.id,
        categoryId: category.id,
        date: '2024-01-01',
        description: 'Test Expense',
        debit: 50,
        credit: 0,
        isIncome: false,
        isOutcome: true,
      };

      // Mock wallet and category lookup
      mockDb.query.walletWallets.findFirst.mockResolvedValue(wallet);
      mockDb.query.walletExpenseCategories.findFirst.mockResolvedValue(category);

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockDb,
          query: {
            ...mockDb.query,
            walletWallets: {
              ...mockDb.query.walletWallets,
              findFirst: jest.fn().mockResolvedValue(wallet),
            },
            walletExpenseCategories: {
              ...mockDb.query.walletExpenseCategories,
              findFirst: jest.fn().mockResolvedValue(category),
            },
          },
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([newExpense]),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
        };
        return callback(tx);
      });

      const result = await expenseService.createExpense(1, expenseData);

      expect(result).toBeDefined();
      expect(result.description).toBe(newExpense.description);
      expect(result.debit).toBe(50); // Converted to number
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle income expenses correctly', async () => {
      const newExpense = createMockExpense({ credit: '100.00', debit: '0.00', isIncome: true });
      const wallet = createMockWallet({ balance: '1000.00' });
      const expenseData = {
        walletId: wallet.id,
        date: '2024-01-01',
        description: 'Salary',
        credit: 100,
        debit: 0,
        isIncome: true,
        isOutcome: false,
      };

      // Mock wallet lookup
      mockDb.query.walletWallets.findFirst.mockResolvedValue(wallet);

      mockDb.transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockDb,
          query: {
            ...mockDb.query,
            walletWallets: {
              ...mockDb.query.walletWallets,
              findFirst: jest.fn().mockResolvedValue(wallet),
            },
          },
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([newExpense]),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
        };
        return callback(tx);
      });

      const result = await expenseService.createExpense(1, expenseData);

      expect(result).toBeDefined();
      expect(result.credit).toBe(100); // Converted to number
      expect(result.debit).toBe(0);
    });
  });

  describe('updateExpense', () => {
    it('should update an existing expense', async () => {
      const existingExpense = createMockExpense();
      const updatedExpense = { ...existingExpense, description: 'Updated Expense' };
      const updateData = { description: 'Updated Expense' };

      // Mock getExpenseById call
      mockDb.query.walletExpenses.findFirst.mockResolvedValue(existingExpense);

      mockDb.transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockDb,
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([updatedExpense]),
        };
        return callback(tx);
      });

      const result = await expenseService.updateExpense(existingExpense.id, 1, updateData);

      expect(result).toBeDefined();
      expect(result.description).toBe('Updated Expense');
      expect(result.debit).toBe(50); // Converted to number
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should return null when expense not found', async () => {
      // Mock getExpenseById to throw error
      mockDb.query.walletExpenses.findFirst.mockResolvedValue(undefined);

      try {
        await expenseService.updateExpense('non-existent-id', 1, {
          description: 'Test',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('deleteExpense', () => {
    it('should delete an expense with transaction', async () => {
      const existingExpense = createMockExpense();

      // Mock getExpenseById call
      mockDb.query.walletExpenses.findFirst.mockResolvedValue(existingExpense);

      mockDb.transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockDb,
          delete: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: '1' }]),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
        };
        return callback(tx);
      });

      const result = await expenseService.deleteExpense('1', 1);

      expect(result).toBe(true);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should return false when expense not found', async () => {
      // Mock getExpenseById to throw error
      mockDb.query.walletExpenses.findFirst.mockResolvedValue(undefined);

      try {
        await expenseService.deleteExpense('non-existent-id', 1);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });
  });
});
