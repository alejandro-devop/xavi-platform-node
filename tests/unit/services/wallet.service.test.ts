import { walletService } from '../../../src/services/wallet.service';
import { mockDb, createMockWallet, resetAllMocks } from '../../helpers/mocks';

// Mock Drizzle
jest.mock('../../../src/shared/database/drizzle', () => ({
  getDb: jest.fn(),
  getDrizzlePool: jest.fn(() => ({ query: jest.fn() })),
}));

import { getDb } from '../../../src/shared/database/drizzle';
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe('WalletService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDb.mockReturnValue(mockDb as any);
  });

  describe('getWallets', () => {
    it('should return all wallets for a user', async () => {
      const mockWallets = [
        createMockWallet({ id: '1', name: 'Wallet 1' }),
        createMockWallet({ id: '2', name: 'Wallet 2' }),
      ];

      mockDb.query.walletWallets.findMany.mockResolvedValue(mockWallets);

      const result = await walletService.getWallets(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Wallet 1');
      expect(result[0].balance).toBe(1000); // Converted from string to number
      expect(result[0].initialBalance).toBe(1000);
      expect(mockDb.query.walletWallets.findMany).toHaveBeenCalled();
    });

    it('should return empty array when user has no wallets', async () => {
      mockDb.query.walletWallets.findMany.mockResolvedValue([]);

      const result = await walletService.getWallets(1);

      expect(result).toEqual([]);
    });
  });

  describe('getWalletById', () => {
    it('should return a wallet by id', async () => {
      const mockWallet = createMockWallet();
      mockDb.query.walletWallets.findFirst.mockResolvedValue(mockWallet);

      const result = await walletService.getWalletById(mockWallet.id, 1);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockWallet.id);
      expect(result.balance).toBe(1000); // Converted from string to number
      expect(result.initialBalance).toBe(1000);
    });

    it('should return null when wallet not found', async () => {
      mockDb.query.walletWallets.findFirst.mockResolvedValue(undefined);

      try {
        await walletService.getWalletById('non-existent-id', 1);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });

    it('should return null when wallet belongs to different user', async () => {
      const walletOfOtherUser = createMockWallet({ userId: 999 });
      mockDb.query.walletWallets.findFirst.mockResolvedValue(walletOfOtherUser);

      try {
        await walletService.getWalletById('some-id', 1);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('permission');
      }
    });
  });

  describe('createWallet', () => {
    it('should create a new wallet', async () => {
      const newWallet = createMockWallet();
      const walletData = {
        name: 'Test Wallet',
        icon: '💰',
        initialBalance: 1000,
        isMain: true,
      };

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });
      mockDb.update = mockUpdate;

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([newWallet]),
        }),
      });
      mockDb.insert = mockInsert;

      const result = await walletService.createWallet(1, walletData);

      expect(result).toBeDefined();
      expect(result.name).toBe(newWallet.name);
      expect(result.balance).toBe(1000); // Converted from string
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should set default values when not provided', async () => {
      const newWallet = createMockWallet({
        initialBalance: '0.00',
        balance: '0.00',
        isMain: false,
      });
      const minimalData = { name: 'Minimal Wallet' };

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([newWallet]),
        }),
      });
      mockDb.insert = mockInsert;

      const result = await walletService.createWallet(1, minimalData);

      expect(result).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updateWallet', () => {
    it('should update an existing wallet', async () => {
      const existingWallet = createMockWallet();
      const updatedWallet = { ...existingWallet, name: 'Updated Wallet' };
      const updateData = { name: 'Updated Wallet' };

      mockDb.query.walletWallets.findFirst.mockResolvedValue(existingWallet);

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedWallet]),
          }),
        }),
      });
      mockDb.update = mockUpdate;

      const result = await walletService.updateWallet(existingWallet.id, 1, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Wallet');
      expect(result.balance).toBe(1000); // Converted from string
    });

    it('should return null when wallet not found', async () => {
      mockDb.query.walletWallets.findFirst.mockResolvedValue(undefined);

      try {
        await walletService.updateWallet('non-existent-id', 1, { name: 'Test' });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('deleteWallet', () => {
    it('should delete a wallet', async () => {
      mockDb.query.walletWallets.findFirst.mockResolvedValue(createMockWallet());
      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: '1' }]),
        }),
      });
      mockDb.delete = mockDelete;

      const result = await walletService.deleteWallet('1', 1);

      expect(result).toBe(true);
    });

    it('should return false when wallet not found', async () => {
      mockDb.query.walletWallets.findFirst.mockResolvedValue(undefined);

      try {
        await walletService.deleteWallet('non-existent-id', 1);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('cleanSlate', () => {
    it('should delete all data for a user', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]),
        }),
      });
      mockDb.delete = mockDelete;

      const result = await walletService.cleanSlate(1);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
