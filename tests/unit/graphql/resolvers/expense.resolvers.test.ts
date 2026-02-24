import { GraphQLError } from 'graphql';
import { expenseResolvers } from '../../../../src/graphql/modules/expense/expense.resolvers';
import { expenseService } from '../../../../src/services/expense.service';

jest.mock('../../../../src/services/expense.service');

const mockExpenseService = expenseService as jest.Mocked<typeof expenseService>;

describe('Expense Resolvers', () => {
  const mockContext = {
    user: { id: 'user-1', email: 'test@example.com' },
  };

  const mockExpense = {
    id: 'expense-1',
    userId: 1,
    walletId: 'wallet-1',
    categoryId: 'category-1',
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
        { id: 'expense-1' },
        mockContext
      );

      expect(result).toEqual(mockExpense);
      expect(mockExpenseService.getExpenseById).toHaveBeenCalledWith('expense-1', 'user-1');
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseResolvers.Query.walletExpense(null, { id: 'expense-1' }, { user: null })
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseService.getExpenseById.mockRejectedValue(new Error('Expense not found'));

      await expect(
        expenseResolvers.Query.walletExpense(null, { id: 'expense-1' }, mockContext)
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Query: walletExpenses', () => {
    it('should return all expenses for a user', async () => {
      const mockExpenses = [mockExpense];
      mockExpenseService.getExpenses.mockResolvedValue(mockExpenses);

      const result = await expenseResolvers.Query.walletExpenses(
        null,
        { walletId: 'wallet-1' },
        mockContext
      );

      expect(result).toEqual(mockExpenses);
      expect(mockExpenseService.getExpenses).toHaveBeenCalledWith('user-1', {
        walletId: 'wallet-1',
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
        walletId: 'wallet-1',
        categoryId: 'category-1',
        debit: 100.5,
        credit: 0,
        description: 'Test expense',
        date: '2024-01-01',
      };

      mockExpenseService.createExpense.mockResolvedValue(mockExpense);

      const result = await expenseResolvers.Mutation.walletExpenseAdd(null, { input }, mockContext);

      expect(result).toEqual(mockExpense);
      expect(mockExpenseService.createExpense).toHaveBeenCalledWith('user-1', input);
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
        { id: 'expense-1', input },
        mockContext
      );

      expect(result).toEqual(updatedExpense);
      expect(mockExpenseService.updateExpense).toHaveBeenCalledWith('expense-1', 'user-1', input);
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseResolvers.Mutation.walletExpenseUpdate(
          null,
          { id: 'expense-1', input: {} },
          { user: null }
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseService.updateExpense.mockRejectedValue(new Error('Expense not found'));

      await expect(
        expenseResolvers.Mutation.walletExpenseUpdate(
          null,
          { id: 'expense-1', input: {} },
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
        { id: 'expense-1' },
        mockContext
      );

      expect(result).toEqual(true);
      expect(mockExpenseService.deleteExpense).toHaveBeenCalledWith('expense-1', 'user-1');
    });

    it('should throw error if not authenticated', async () => {
      await expect(
        expenseResolvers.Mutation.walletExpenseRemove(null, { id: 'expense-1' }, { user: null })
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw GraphQLError if service throws', async () => {
      mockExpenseService.deleteExpense.mockRejectedValue(new Error('Expense not found'));

      await expect(
        expenseResolvers.Mutation.walletExpenseRemove(null, { id: 'expense-1' }, mockContext)
      ).rejects.toThrow(GraphQLError);
    });
  });
});
