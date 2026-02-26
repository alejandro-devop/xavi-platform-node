import { GraphQLError } from 'graphql';
import { expenseResolvers } from '../../../../src/graphql/modules/expense/expense.resolvers';
import { expenseService } from '../../../../src/services/expense.service';

jest.mock('../../../../src/services/expense.service');

const mockExpenseService = expenseService as jest.Mocked<typeof expenseService>;

describe('Expense Resolvers', () => {
  // Use valid UUIDs for validation
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TEST_EXPENSE_ID = '550e8400-e29b-41d4-a716-446655440001';
  const TEST_WALLET_ID = '550e8400-e29b-41d4-a716-446655440002';
  const TEST_CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440003';

  const mockContext = {
    user: { id: TEST_USER_ID, email: 'test@example.com' },
  };

  const mockExpense = {
    id: TEST_EXPENSE_ID,
    userId: 1,
    walletId: TEST_WALLET_ID,
    categoryId: TEST_CATEGORY_ID,
    debit: 100.5,
    credit: 0,
    description: 'Test expense',
    date: '2024-01-01',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Query: walletExpense', () => {
    it('should return an expense by id', async () => {
      mockExpenseService.getExpenseById.mockResolvedValue(mockExpense);

      const result = await expenseResolvers.Query.walletExpense(
        null,
        { id: TEST_EXPENSE_ID },
        mockContext
      );

      expect(result).toEqual(mockExpense);
      expect(mockExpenseService.getExpenseById).toHaveBeenCalledWith(TEST_EXPENSE_ID, TEST_USER_ID);
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseResolvers.Query.walletExpense(null, { id: TEST_EXPENSE_ID }, { user: null })
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseService.getExpenseById.mockRejectedValue(new Error('Expense not found'));

      await expect(
        expenseResolvers.Query.walletExpense(null, { id: TEST_EXPENSE_ID }, mockContext)
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Query: walletExpenses', () => {
    it('should return all expenses for a user', async () => {
      const mockExpenses = [mockExpense];
      mockExpenseService.getExpenses.mockResolvedValue(mockExpenses);

      const result = await expenseResolvers.Query.walletExpenses(
        null,
        { walletId: TEST_WALLET_ID },
        mockContext
      );

      expect(result).toEqual(mockExpenses);
      expect(mockExpenseService.getExpenses).toHaveBeenCalledWith(TEST_USER_ID, {
        walletId: TEST_WALLET_ID,
      });
    });

    it('should throw error if not authenticated', async () => {
      await expect(expenseResolvers.Query.walletExpenses(null, {}, { user: null })).rejects.toThrow(
        GraphQLError
      );
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseService.getExpenses.mockRejectedValue(new Error('Database error'));

      await expect(expenseResolvers.Query.walletExpenses(null, {}, mockContext)).rejects.toThrow(
        GraphQLError
      );
    });
  });

  describe('Mutation: walletExpenseAdd', () => {
    it('should create a new expense', async () => {
      const input = {
        walletId: TEST_WALLET_ID,
        categoryId: TEST_CATEGORY_ID,
        debit: 100.5,
        credit: 0,
        description: 'Test expense',
        date: '2024-01-01',
      };

      mockExpenseService.createExpense.mockResolvedValue(mockExpense);

      const result = await expenseResolvers.Mutation.walletExpenseAdd(null, { input }, mockContext);

      expect(result).toEqual(mockExpense);
      expect(mockExpenseService.createExpense).toHaveBeenCalledWith(TEST_USER_ID, input);
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseResolvers.Mutation.walletExpenseAdd(null, { input: {} }, { user: null })
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseService.createExpense.mockRejectedValue(new Error('Invalid input'));

      await expect(
        expenseResolvers.Mutation.walletExpenseAdd(null, { input: {} }, mockContext)
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Mutation: walletExpenseUpdate', () => {
    it('should update an expense', async () => {
      const input = {
        debit: 150.75,
        description: 'Updated expense',
      };

      const updatedExpense = { ...mockExpense, ...input, debit: 150.75 };
      mockExpenseService.updateExpense.mockResolvedValue(updatedExpense);

      const result = await expenseResolvers.Mutation.walletExpenseUpdate(
        null,
        { id: TEST_EXPENSE_ID, input },
        mockContext
      );

      expect(result).toEqual(updatedExpense);
      expect(mockExpenseService.updateExpense).toHaveBeenCalledWith(
        TEST_EXPENSE_ID,
        TEST_USER_ID,
        input
      );
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseResolvers.Mutation.walletExpenseUpdate(
          null,
          { id: TEST_EXPENSE_ID, input: {} },
          { user: null }
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseService.updateExpense.mockRejectedValue(new Error('Expense not found'));

      await expect(
        expenseResolvers.Mutation.walletExpenseUpdate(
          null,
          { id: TEST_EXPENSE_ID, input: {} },
          mockContext
        )
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Mutation: walletExpenseRemove', () => {
    it('should delete an expense', async () => {
      mockExpenseService.deleteExpense.mockResolvedValue(true);

      const result = await expenseResolvers.Mutation.walletExpenseRemove(
        null,
        { id: TEST_EXPENSE_ID },
        mockContext
      );

      expect(result).toEqual(true);
      expect(mockExpenseService.deleteExpense).toHaveBeenCalledWith(TEST_EXPENSE_ID, TEST_USER_ID);
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseResolvers.Mutation.walletExpenseRemove(null, { id: TEST_EXPENSE_ID }, { user: null })
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseService.deleteExpense.mockRejectedValue(new Error('Expense not found'));

      await expect(
        expenseResolvers.Mutation.walletExpenseRemove(null, { id: TEST_EXPENSE_ID }, mockContext)
      ).rejects.toThrow(GraphQLError);
    });
  });
});
