import { expenseCategoryService } from '../../../src/services/expense-category.service';
import { mockDb, createMockCategory, resetAllMocks } from '../../helpers/mocks';

// Mock Drizzle
jest.mock('../../../src/shared/database/drizzle', () => ({
  getDb: jest.fn(),
  getDrizzlePool: jest.fn(() => ({ query: jest.fn() })),
}));

import { getDb } from '../../../src/shared/database/drizzle';
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe('ExpenseCategoryService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDb.mockReturnValue(mockDb as any);
  });

  describe('getCategories', () => {
    it('should return all categories for a user', async () => {
      const mockCategories = [
        createMockCategory({ id: '1', name: 'Food', type: 'expense' }),
        createMockCategory({ id: '2', name: 'Salary', type: 'income' }),
      ];

      mockDb.query.walletExpenseCategories.findMany.mockResolvedValue(mockCategories);

      const result = await expenseCategoryService.getCategories(1);

      expect(result).toEqual(mockCategories);
      expect(mockDb.query.walletExpenseCategories.findMany).toHaveBeenCalled();
    });

    it('should filter categories by type', async () => {
      const expenseCategories = [createMockCategory({ id: '1', name: 'Food', type: 'expense' })];

      mockDb.query.walletExpenseCategories.findMany.mockResolvedValue(expenseCategories);

      const result = await expenseCategoryService.getCategories(1, 'expense');

      expect(result).toEqual(expenseCategories);
    });

    it('should return empty array when user has no categories', async () => {
      mockDb.query.walletExpenseCategories.findMany.mockResolvedValue([]);

      const result = await expenseCategoryService.getCategories(1);

      expect(result).toEqual([]);
    });
  });

  describe('getCategoryById', () => {
    it('should return a category by id', async () => {
      const mockCategory = createMockCategory();
      mockDb.query.walletExpenseCategories.findFirst.mockResolvedValue(mockCategory);

      const result = await expenseCategoryService.getCategoryById(mockCategory.id, 1);

      expect(result).toEqual(mockCategory);
    });

    it('should return null when category not found', async () => {
      mockDb.query.walletExpenseCategories.findFirst.mockResolvedValue(undefined);

      try {
        await expenseCategoryService.getCategoryById('non-existent-id', 1);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const newCategory = createMockCategory();
      const categoryData = {
        name: 'Food',
        type: 'expense' as const,
        icon: '🍔',
        color: '#FF0000',
        description: 'Food expenses',
      };

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([newCategory]),
        }),
      });
      mockDb.insert = mockInsert;

      const result = await expenseCategoryService.createCategory(1, categoryData);

      expect(result).toEqual(newCategory);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle minimal category data', async () => {
      const newCategory = createMockCategory({ description: null, color: null });
      const minimalData = {
        name: 'Minimal Category',
        type: 'expense' as const,
      };

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([newCategory]),
        }),
      });
      mockDb.insert = mockInsert;

      const result = await expenseCategoryService.createCategory(1, minimalData);

      expect(result).toBeDefined();
    });
  });

  describe('updateCategory', () => {
    it('should update an existing category', async () => {
      const existingCategory = createMockCategory();
      const updatedCategory = { ...existingCategory, name: 'Updated Category' };
      const updateData = { name: 'Updated Category' };

      mockDb.query.walletExpenseCategories.findFirst.mockResolvedValue(existingCategory);

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedCategory]),
          }),
        }),
      });
      mockDb.update = mockUpdate;

      const result = await expenseCategoryService.updateCategory(
        existingCategory.id,
        1,
        updateData
      );

      expect(result).toEqual(updatedCategory);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should return null when category not found', async () => {
      mockDb.query.walletExpenseCategories.findFirst.mockResolvedValue(undefined);

      try {
        await expenseCategoryService.updateCategory('non-existent-id', 1, {
          name: 'Test',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const existingCategory = createMockCategory();
      mockDb.query.walletExpenseCategories.findFirst.mockResolvedValue(existingCategory);

      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });
      mockDb.delete = mockDelete;

      const result = await expenseCategoryService.deleteCategory('1', 1);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should return false when category not found', async () => {
      mockDb.query.walletExpenseCategories.findFirst.mockResolvedValue(undefined);

      try {
        await expenseCategoryService.deleteCategory('non-existent-id', 1);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });
  });
});
