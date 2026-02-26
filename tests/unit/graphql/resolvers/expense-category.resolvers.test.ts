import { GraphQLError } from 'graphql';
import { expenseCategoryResolvers } from '../../../../src/graphql/modules/expense-category/expense-category.resolvers';
import { expenseCategoryService } from '../../../../src/services/expense-category.service';

jest.mock('../../../../src/services/expense-category.service');

const mockExpenseCategoryService = expenseCategoryService as jest.Mocked<
  typeof expenseCategoryService
>;

describe('Expense Category Resolvers', () => {
  // Use valid UUIDs for validation
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TEST_CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440001';

  const mockContext = {
    user: { id: TEST_USER_ID, email: 'test@example.com' },
  };

  const mockCategory = {
    id: TEST_CATEGORY_ID,
    userId: 1,
    name: 'Food',
    type: 'expense' as const,
    icon: '🍔🍟🥤',
    color: '#FF5733',
    isDefault: false,
    isSystem: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Query: walletExpenseCategory', () => {
    it('should return a category by id', async () => {
      mockExpenseCategoryService.getCategoryById.mockResolvedValue(mockCategory);

      const result = await expenseCategoryResolvers.Query.walletExpenseCategory(
        null,
        { id: TEST_CATEGORY_ID },
        mockContext
      );

      expect(result).toEqual(mockCategory);
      expect(mockExpenseCategoryService.getCategoryById).toHaveBeenCalledWith(
        TEST_CATEGORY_ID,
        TEST_USER_ID
      );
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseCategoryResolvers.Query.walletExpenseCategory(
          null,
          { id: TEST_CATEGORY_ID },
          { user: null }
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseCategoryService.getCategoryById.mockRejectedValue(new Error('Category not found'));

      await expect(
        expenseCategoryResolvers.Query.walletExpenseCategory(
          null,
          { id: TEST_CATEGORY_ID },
          mockContext
        )
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Query: walletExpenseCategories', () => {
    it('should return all categories for a user', async () => {
      const mockCategories = [mockCategory];
      mockExpenseCategoryService.getCategories.mockResolvedValue(mockCategories);

      const result = await expenseCategoryResolvers.Query.walletExpenseCategories(
        null,
        {},
        mockContext
      );

      expect(result).toEqual(mockCategories);
      expect(mockExpenseCategoryService.getCategories).toHaveBeenCalledWith(
        TEST_USER_ID,
        undefined
      );
    });

    it('should return filtered categories by type', async () => {
      const mockCategories = [mockCategory];
      mockExpenseCategoryService.getCategories.mockResolvedValue(mockCategories);

      const result = await expenseCategoryResolvers.Query.walletExpenseCategories(
        null,
        { type: 'expense' },
        mockContext
      );

      expect(result).toEqual(mockCategories);
      expect(mockExpenseCategoryService.getCategories).toHaveBeenCalledWith(
        TEST_USER_ID,
        'expense'
      );
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseCategoryResolvers.Query.walletExpenseCategories(null, {}, { user: null })
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseCategoryService.getCategories.mockRejectedValue(new Error('Database error'));

      await expect(
        expenseCategoryResolvers.Query.walletExpenseCategories(null, {}, mockContext)
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Mutation: walletExpenseCategoryAdd', () => {
    it('should create a new category', async () => {
      const input = {
        name: 'Food',
        type: 'expense' as const,
        icon: '🍔🍟🥤',
        color: '#FF5733',
      };

      mockExpenseCategoryService.createCategory.mockResolvedValue(mockCategory);

      const result = await expenseCategoryResolvers.Mutation.walletExpenseCategoryAdd(
        null,
        { input },
        mockContext
      );

      expect(result).toEqual(mockCategory);
      expect(mockExpenseCategoryService.createCategory).toHaveBeenCalledWith(TEST_USER_ID, input);
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseCategoryResolvers.Mutation.walletExpenseCategoryAdd(
          null,
          { input: {} },
          { user: null }
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseCategoryService.createCategory.mockRejectedValue(new Error('Invalid input'));

      await expect(
        expenseCategoryResolvers.Mutation.walletExpenseCategoryAdd(null, { input: {} }, mockContext)
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Mutation: walletExpenseCategoryUpdate', () => {
    it('should update a category', async () => {
      const input = {
        name: 'Updated Food',
        icon: '🍕🧀🥗',
      };

      const updatedCategory = { ...mockCategory, ...input };
      mockExpenseCategoryService.updateCategory.mockResolvedValue(updatedCategory);

      const result = await expenseCategoryResolvers.Mutation.walletExpenseCategoryUpdate(
        null,
        { id: TEST_CATEGORY_ID, input },
        mockContext
      );

      expect(result).toEqual(updatedCategory);
      expect(mockExpenseCategoryService.updateCategory).toHaveBeenCalledWith(
        TEST_CATEGORY_ID,
        TEST_USER_ID,
        input
      );
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseCategoryResolvers.Mutation.walletExpenseCategoryUpdate(
          null,
          { id: TEST_CATEGORY_ID, input: {} },
          { user: null }
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseCategoryService.updateCategory.mockRejectedValue(new Error('Category not found'));

      await expect(
        expenseCategoryResolvers.Mutation.walletExpenseCategoryUpdate(
          null,
          { id: TEST_CATEGORY_ID, input: {} },
          mockContext
        )
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Mutation: walletExpenseCategoryRemove', () => {
    it('should delete a category', async () => {
      mockExpenseCategoryService.deleteCategory.mockResolvedValue(true);

      const result = await expenseCategoryResolvers.Mutation.walletExpenseCategoryRemove(
        null,
        { id: TEST_CATEGORY_ID },
        mockContext
      );

      expect(result).toEqual(true);
      expect(mockExpenseCategoryService.deleteCategory).toHaveBeenCalledWith(
        TEST_CATEGORY_ID,
        TEST_USER_ID
      );
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseCategoryResolvers.Mutation.walletExpenseCategoryRemove(
          null,
          { id: TEST_CATEGORY_ID },
          { user: null }
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseCategoryService.deleteCategory.mockRejectedValue(new Error('Category not found'));

      await expect(
        expenseCategoryResolvers.Mutation.walletExpenseCategoryRemove(
          null,
          { id: TEST_CATEGORY_ID },
          mockContext
        )
      ).rejects.toThrow(GraphQLError);
    });
  });
});
