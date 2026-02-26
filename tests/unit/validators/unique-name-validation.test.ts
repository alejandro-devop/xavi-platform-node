import { z } from 'zod';
import * as dbValidators from '../../../src/shared/utils/db-validators';
import {
  createWalletInputSchema,
  createWalletUpdateSchema,
} from '../../../src/validators/schemas/wallet.schemas';
import {
  createExpenseCategoryInputSchema,
  createExpenseCategoryUpdateSchema,
} from '../../../src/validators/schemas/expense-category.schemas';

// Mock the db-validators module
jest.mock('../../../src/shared/utils/db-validators', () => ({
  ...jest.requireActual('../../../src/shared/utils/db-validators'),
  checkFieldUniqueness: jest.fn(),
}));

describe('Unique Name Validations', () => {
  const mockUserId = 123;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Wallet Name Uniqueness', () => {
    describe('createWalletInputSchema', () => {
      it('should pass validation when wallet name is unique', async () => {
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

        const schema = createWalletInputSchema(mockUserId);
        const input = {
          name: 'My Unique Wallet',
          icon: 'wallet',
          initialBalance: 100,
          isMain: false,
        };

        const result = await schema.parseAsync(input);

        expect(result.name).toBe('My Unique Wallet');
        expect(dbValidators.checkFieldUniqueness).toHaveBeenCalled();
      });

      it('should fail validation when wallet name already exists', async () => {
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(false);

        const schema = createWalletInputSchema(mockUserId);
        const input = {
          name: 'Existing Wallet',
          icon: 'cash',
        };

        await expect(schema.parseAsync(input)).rejects.toThrow(z.ZodError);

        try {
          await schema.parseAsync(input);
        } catch (error: any) {
          expect(error.errors[0].message).toBe('A wallet with this name already exists');
          expect(error.errors[0].path).toEqual(['name']);
        }
      });

      it('should validate other fields alongside name uniqueness', async () => {
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

        const schema = createWalletInputSchema(mockUserId);

        // Test name too short
        await expect(schema.parseAsync({ name: 'ab' })).rejects.toThrow(
          'Name must be at least 3 characters'
        );

        // Test name too long
        await expect(schema.parseAsync({ name: 'a'.repeat(101) })).rejects.toThrow(
          'Name must be less than 100 characters'
        );

        // Test negative initial balance
        await expect(
          schema.parseAsync({ name: 'Valid Name', initialBalance: -100 })
        ).rejects.toThrow('Initial balance must be positive');
      });
    });

    describe('createWalletUpdateSchema', () => {
      it('should pass validation when updating to a unique name', async () => {
        const walletId = 'wallet-123';
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

        const schema = createWalletUpdateSchema(mockUserId, walletId);
        const input = {
          name: 'Updated Unique Name',
        };

        const result = await schema.parseAsync(input);

        expect(result.name).toBe('Updated Unique Name');
        expect(dbValidators.checkFieldUniqueness).toHaveBeenCalled();
      });

      it('should fail when updating to an existing name', async () => {
        const walletId = 'wallet-123';
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(false);

        const schema = createWalletUpdateSchema(mockUserId, walletId);
        const input = {
          name: 'Existing Name',
        };

        await expect(schema.parseAsync(input)).rejects.toThrow(z.ZodError);
      });

      it('should allow keeping the same name (when excluding current wallet)', async () => {
        const walletId = 'wallet-123';
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

        const schema = createWalletUpdateSchema(mockUserId, walletId);
        const input = {
          name: 'Same Name',
        };

        const result = await schema.parseAsync(input);

        expect(result.name).toBe('Same Name');
        expect(dbValidators.checkFieldUniqueness).toHaveBeenCalled();
      });
    });
  });

  describe('Category Name Uniqueness', () => {
    describe('createExpenseCategoryInputSchema', () => {
      it('should pass validation when category name is unique', async () => {
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

        const schema = createExpenseCategoryInputSchema(mockUserId);
        const input = {
          name: 'Groceries',
          type: 'expense' as const,
          color: '#FF5733',
          icon: 'cart',
        };

        const result = await schema.parseAsync(input);

        expect(result.name).toBe('Groceries');
        expect(dbValidators.checkFieldUniqueness).toHaveBeenCalled();
      });

      it('should fail validation when category name already exists', async () => {
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(false);

        const schema = createExpenseCategoryInputSchema(mockUserId);
        const input = {
          name: 'Existing Category',
          type: 'income' as const,
        };

        await expect(schema.parseAsync(input)).rejects.toThrow(z.ZodError);

        try {
          await schema.parseAsync(input);
        } catch (error: any) {
          expect(error.errors[0].message).toBe('A category with this name already exists');
          expect(error.errors[0].path).toEqual(['name']);
        }
      });

      it('should validate other fields alongside name uniqueness', async () => {
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

        const schema = createExpenseCategoryInputSchema(mockUserId);

        // Test name too short
        await expect(schema.parseAsync({ name: 'ab', type: 'expense' })).rejects.toThrow(
          'Name must be at least 3 characters'
        );

        // Test invalid color format
        await expect(
          schema.parseAsync({ name: 'Valid Name', type: 'expense', color: 'red' })
        ).rejects.toThrow('Color must be a valid hex color');

        // Test valid hex colors
        const validColors = ['#FFF', '#FF5733', '#abc', '#123456'];
        for (const color of validColors) {
          await expect(
            schema.parseAsync({ name: 'Valid Name', type: 'expense', color })
          ).resolves.toBeDefined();
        }
      });
    });

    describe('createExpenseCategoryUpdateSchema', () => {
      it('should pass validation when updating to a unique name', async () => {
        const categoryId = 'category-123';
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

        const schema = createExpenseCategoryUpdateSchema(mockUserId, categoryId);
        const input = {
          name: 'Updated Category',
          color: '#00FF00',
        };

        const result = await schema.parseAsync(input);

        expect(result.name).toBe('Updated Category');
        expect(dbValidators.checkFieldUniqueness).toHaveBeenCalled();
      });

      it('should fail when updating to an existing name', async () => {
        const categoryId = 'category-123';
        (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(false);

        const schema = createExpenseCategoryUpdateSchema(mockUserId, categoryId);
        const input = {
          name: 'Existing Category',
        };

        await expect(schema.parseAsync(input)).rejects.toThrow(z.ZodError);
      });

      it('should allow partial updates without name change', async () => {
        const categoryId = 'category-123';

        const schema = createExpenseCategoryUpdateSchema(mockUserId, categoryId);
        const input = {
          color: '#0000FF',
          icon: 'work',
        };

        const result = await schema.parseAsync(input);

        expect(result).toEqual(input);
        // checkFieldUniqueness should not be called when name is not being updated
        expect(dbValidators.checkFieldUniqueness).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration: Multiple Async Validations', () => {
    it('should handle concurrent validations correctly', async () => {
      (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

      const walletSchema = createWalletInputSchema(mockUserId);
      const categorySchema = createExpenseCategoryInputSchema(mockUserId);

      const [walletResult, categoryResult] = await Promise.all([
        walletSchema.parseAsync({ name: 'Wallet 1', icon: 'cash' }),
        categorySchema.parseAsync({ name: 'Category 1', type: 'expense' }),
      ]);

      expect(walletResult.name).toBe('Wallet 1');
      expect(categoryResult.name).toBe('Category 1');
      expect(dbValidators.checkFieldUniqueness).toHaveBeenCalledTimes(2);
    });

    it('should normalize names before validation', async () => {
      (dbValidators.checkFieldUniqueness as jest.Mock).mockResolvedValue(true);

      const schema = createWalletInputSchema(mockUserId);
      const input = {
        name: '  My   Wallet  ',
        icon: 'wallet',
      };

      const result = await schema.parseAsync(input);

      // Name should be normalized (trim + single spaces)
      expect(result.name).toBe('My Wallet');
    });
  });
});
