import {
  ApplyBalanceStrategy,
  ReverseBalanceStrategy,
  balanceStrategies,
  updateBalances,
  BalanceUpdateParams,
} from '../../../src/shared/utils/balance-strategies';
import { BadRequestError } from '../../../src/shared/errors';

describe('Balance Strategies', () => {
  let mockTx: any;

  beforeEach(() => {
    // Create mock transaction object
    mockTx = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('ApplyBalanceStrategy', () => {
    let strategy: ApplyBalanceStrategy;

    beforeEach(() => {
      strategy = new ApplyBalanceStrategy();
    });

    describe('Validation', () => {
      it('should throw error if walletId is missing', async () => {
        const params = {
          tx: mockTx,
          walletId: '',
          credit: 100,
          debit: 0,
        };

        await expect(strategy.execute(params)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params)).rejects.toThrow('Valid walletId is required');
      });

      it('should throw error if credit is negative', async () => {
        const params = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: -100,
          debit: 0,
        };

        await expect(strategy.execute(params)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params)).rejects.toThrow(
          'Credit must be a non-negative number'
        );
      });

      it('should throw error if debit is negative', async () => {
        const params = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 0,
          debit: -50,
        };

        await expect(strategy.execute(params)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params)).rejects.toThrow(
          'Debit must be a non-negative number'
        );
      });

      it('should throw error if both credit and debit are zero', async () => {
        const params = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 0,
          debit: 0,
        };

        await expect(strategy.execute(params)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params)).rejects.toThrow(
          'At least one of credit or debit must be non-zero'
        );
      });

      it('should throw error if transaction object is missing', async () => {
        const params = {
          tx: null,
          walletId: 'wallet-123',
          credit: 100,
          debit: 0,
        };

        await expect(strategy.execute(params as any)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params as any)).rejects.toThrow(
          'Transaction object is required'
        );
      });

      it('should throw error if budgetId is invalid type', async () => {
        const params = {
          tx: mockTx,
          walletId: 'wallet-123',
          budgetId: 123 as any, // Should be string
          credit: 100,
          debit: 0,
        };

        await expect(strategy.execute(params)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params)).rejects.toThrow(
          'BudgetId must be a string when provided'
        );
      });
    });

    describe('Execute - Wallet Balance', () => {
      it('should apply income (credit only)', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 100,
          debit: 0,
        };

        await strategy.execute(params);

        expect(mockTx.update).toHaveBeenCalled();
        expect(mockTx.set).toHaveBeenCalled();
        expect(mockTx.where).toHaveBeenCalled();
      });

      it('should apply expense (debit only)', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 0,
          debit: 50,
        };

        await strategy.execute(params);

        expect(mockTx.update).toHaveBeenCalled();
        expect(mockTx.set).toHaveBeenCalled();
        expect(mockTx.where).toHaveBeenCalled();
      });

      it('should apply mixed transaction (both credit and debit)', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 100,
          debit: 30,
        };

        await strategy.execute(params);

        expect(mockTx.update).toHaveBeenCalled();
        expect(mockTx.set).toHaveBeenCalled();
        expect(mockTx.where).toHaveBeenCalled();
      });
    });

    describe('Execute - Budget Balance', () => {
      it('should update budget balance when budgetId is provided', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          budgetId: 'budget-456',
          credit: 0,
          debit: 50,
        };

        await strategy.execute(params);

        // Should be called twice: once for wallet, once for budget
        expect(mockTx.update).toHaveBeenCalledTimes(2);
        expect(mockTx.set).toHaveBeenCalledTimes(2);
        expect(mockTx.where).toHaveBeenCalledTimes(2);
      });

      it('should not update budget balance when budgetId is null', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          budgetId: null,
          credit: 0,
          debit: 50,
        };

        await strategy.execute(params);

        // Should be called only once for wallet
        expect(mockTx.update).toHaveBeenCalledTimes(1);
        expect(mockTx.set).toHaveBeenCalledTimes(1);
        expect(mockTx.where).toHaveBeenCalledTimes(1);
      });

      it('should not update budget balance when budgetId is undefined', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 0,
          debit: 50,
        };

        await strategy.execute(params);

        // Should be called only once for wallet
        expect(mockTx.update).toHaveBeenCalledTimes(1);
        expect(mockTx.set).toHaveBeenCalledTimes(1);
        expect(mockTx.where).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('ReverseBalanceStrategy', () => {
    let strategy: ReverseBalanceStrategy;

    beforeEach(() => {
      strategy = new ReverseBalanceStrategy();
    });

    describe('Validation', () => {
      it('should throw error if walletId is missing', async () => {
        const params = {
          tx: mockTx,
          walletId: '',
          credit: 100,
          debit: 0,
        };

        await expect(strategy.execute(params)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params)).rejects.toThrow('Valid walletId is required');
      });

      it('should throw error if credit is negative', async () => {
        const params = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: -100,
          debit: 0,
        };

        await expect(strategy.execute(params)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params)).rejects.toThrow(
          'Credit must be a non-negative number'
        );
      });

      it('should throw error if debit is negative', async () => {
        const params = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 0,
          debit: -50,
        };

        await expect(strategy.execute(params)).rejects.toThrow(BadRequestError);
        await expect(strategy.execute(params)).rejects.toThrow(
          'Debit must be a non-negative number'
        );
      });
    });

    describe('Execute - Wallet Balance', () => {
      it('should reverse income (credit only)', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 100,
          debit: 0,
        };

        await strategy.execute(params);

        expect(mockTx.update).toHaveBeenCalled();
        expect(mockTx.set).toHaveBeenCalled();
        expect(mockTx.where).toHaveBeenCalled();
      });

      it('should reverse expense (debit only)', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          credit: 0,
          debit: 50,
        };

        await strategy.execute(params);

        expect(mockTx.update).toHaveBeenCalled();
        expect(mockTx.set).toHaveBeenCalled();
        expect(mockTx.where).toHaveBeenCalled();
      });
    });

    describe('Execute - Budget Balance', () => {
      it('should reverse budget balance when budgetId is provided', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          budgetId: 'budget-456',
          credit: 0,
          debit: 50,
        };

        await strategy.execute(params);

        // Should be called twice: once for wallet, once for budget
        expect(mockTx.update).toHaveBeenCalledTimes(2);
        expect(mockTx.set).toHaveBeenCalledTimes(2);
        expect(mockTx.where).toHaveBeenCalledTimes(2);
      });

      it('should not reverse budget balance when budgetId is null', async () => {
        const params: BalanceUpdateParams = {
          tx: mockTx,
          walletId: 'wallet-123',
          budgetId: null,
          credit: 0,
          debit: 50,
        };

        await strategy.execute(params);

        // Should be called only once for wallet
        expect(mockTx.update).toHaveBeenCalledTimes(1);
        expect(mockTx.set).toHaveBeenCalledTimes(1);
        expect(mockTx.where).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('balanceStrategies collection', () => {
    it('should have apply strategy', () => {
      expect(balanceStrategies.apply).toBeInstanceOf(ApplyBalanceStrategy);
    });

    it('should have reverse strategy', () => {
      expect(balanceStrategies.reverse).toBeInstanceOf(ReverseBalanceStrategy);
    });
  });

  describe('updateBalances helper', () => {
    it('should execute the provided strategy', async () => {
      const params: BalanceUpdateParams = {
        tx: mockTx,
        walletId: 'wallet-123',
        credit: 100,
        debit: 0,
      };

      await updateBalances(balanceStrategies.apply, params);

      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalled();
      expect(mockTx.where).toHaveBeenCalled();
    });

    it('should work with reverse strategy', async () => {
      const params: BalanceUpdateParams = {
        tx: mockTx,
        walletId: 'wallet-123',
        credit: 0,
        debit: 50,
      };

      await updateBalances(balanceStrategies.reverse, params);

      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalled();
      expect(mockTx.where).toHaveBeenCalled();
    });
  });
});
