import { walletResolvers } from '../../../../src/graphql/modules/wallet/wallet.resolvers';
import { walletService } from '../../../../src/services/wallet.service';
import { GraphQLError } from 'graphql';
import { createMockUser, createMockWallet } from '../../../helpers/mocks';
import * as dbValidators from '../../../../src/shared/utils/db-validators';

// Mock wallet service
jest.mock('../../../../src/services/wallet.service');

describe('Wallet Resolvers', () => {
  const mockContext = {
    user: createMockUser(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on checkFieldUniqueness to return true by default (name is unique)
    jest.spyOn(dbValidators, 'checkFieldUniqueness').mockResolvedValue(true);
  });

  describe('Query.wallet', () => {
    it('should return a wallet by id', async () => {
      const mockWallet = createMockWallet();
      (walletService.getWalletById as jest.Mock).mockResolvedValue(mockWallet);

      const result = await walletResolvers.Query.wallet(null, { id: mockWallet.id }, mockContext);

      expect(result).toEqual(mockWallet);
      expect(walletService.getWalletById).toHaveBeenCalledWith(mockWallet.id, mockContext.user.id);
    });

    it('should throw error when not authenticated', async () => {
      await expect(walletResolvers.Query.wallet(null, { id: '1' }, {})).rejects.toThrow(
        GraphQLError
      );
    });

    it('should handle service errors', async () => {
      (walletService.getWalletById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(walletResolvers.Query.wallet(null, { id: '1' }, mockContext)).rejects.toThrow(
        GraphQLError
      );
    });
  });

  describe('Query.wallets', () => {
    it('should return all wallets for user', async () => {
      const mockWallets = [
        createMockWallet({ id: '1', name: 'Wallet 1' }),
        createMockWallet({ id: '2', name: 'Wallet 2' }),
      ];
      (walletService.getWallets as jest.Mock).mockResolvedValue(mockWallets);

      const result = await walletResolvers.Query.wallets(null, {}, mockContext);

      expect(result).toEqual(mockWallets);
      expect(walletService.getWallets).toHaveBeenCalledWith(mockContext.user.id);
    });

    it('should throw error when not authenticated', async () => {
      await expect(walletResolvers.Query.wallets(null, {}, {})).rejects.toThrow(GraphQLError);
    });
  });

  describe('Mutation.walletAdd', () => {
    it('should create a new wallet', async () => {
      const mockWallet = createMockWallet();
      const input = {
        name: 'Test Wallet',
        icon: '💰💵💳',
        initialBalance: 1000,
        isMain: true,
      };
      (walletService.createWallet as jest.Mock).mockResolvedValue(mockWallet);

      const result = await walletResolvers.Mutation.walletAdd(null, { input }, mockContext);

      expect(result).toEqual(mockWallet);
      expect(walletService.createWallet).toHaveBeenCalledWith(mockContext.user.id, input);
    });

    it('should throw error when not authenticated', async () => {
      await expect(walletResolvers.Mutation.walletAdd(null, { input: {} }, {})).rejects.toThrow(
        GraphQLError
      );
    });
  });

  describe('Mutation.walletUpdate', () => {
    it('should update a wallet', async () => {
      const mockWallet = createMockWallet({ name: 'Updated Wallet' });
      const input = { name: 'Updated Wallet' };
      (walletService.updateWallet as jest.Mock).mockResolvedValue(mockWallet);

      const result = await walletResolvers.Mutation.walletUpdate(
        null,
        { id: mockWallet.id, input },
        mockContext
      );

      expect(result).toEqual(mockWallet);
      expect(walletService.updateWallet).toHaveBeenCalledWith(
        mockWallet.id,
        mockContext.user.id,
        input
      );
    });

    it('should throw error when not authenticated', async () => {
      await expect(
        walletResolvers.Mutation.walletUpdate(null, { id: '1', input: {} }, {})
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Mutation.walletRemove', () => {
    it('should delete a wallet', async () => {
      const mockWallet = createMockWallet();
      (walletService.deleteWallet as jest.Mock).mockResolvedValue(true);

      const result = await walletResolvers.Mutation.walletRemove(
        null,
        { id: mockWallet.id },
        mockContext
      );

      expect(result).toBe(true);
      expect(walletService.deleteWallet).toHaveBeenCalledWith(mockWallet.id, mockContext.user.id);
    });

    it('should throw error when not authenticated', async () => {
      const mockWallet = createMockWallet();
      await expect(
        walletResolvers.Mutation.walletRemove(null, { id: mockWallet.id }, {})
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Mutation.walletCleanSlate', () => {
    it('should delete all wallet data', async () => {
      (walletService.cleanSlate as jest.Mock).mockResolvedValue(true);

      const result = await walletResolvers.Mutation.walletCleanSlate(null, {}, mockContext);

      expect(result).toBe(true);
      expect(walletService.cleanSlate).toHaveBeenCalledWith(mockContext.user.id);
    });

    it('should throw error when not authenticated', async () => {
      await expect(walletResolvers.Mutation.walletCleanSlate(null, {}, {})).rejects.toThrow(
        GraphQLError
      );
    });
  });
});
