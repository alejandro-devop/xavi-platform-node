import { getDb } from '../shared/database/drizzle';
import { walletWallets } from '../shared/database/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';
import type { Wallet, CreateWalletInput, UpdateWalletInput } from '../types/services/wallet.types';

export const walletService = {
  /**
   * Get all wallets for a user
   */
  async getWallets(userId: number): Promise<Wallet[]> {
    const db = getDb();

    const wallets = await db.query.walletWallets.findMany({
      where: eq(walletWallets.userId, userId),
      orderBy: [desc(walletWallets.isMain), asc(walletWallets.id)], // Main first, then newest first (UUID v7)
    });

    // Convert decimal strings to numbers
    return wallets.map(
      (wallet): Wallet => ({
        ...wallet,
        balance: parseFloat(wallet.balance),
        initialBalance: parseFloat(wallet.initialBalance),
      })
    );
  },

  /**
   * Get a wallet by ID
   */
  async getWalletById(id: string, userId: number): Promise<Wallet> {
    const db = getDb();

    const wallet = await db.query.walletWallets.findFirst({
      where: eq(walletWallets.id, id),
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    // Verify ownership
    if (wallet.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to access this wallet');
    }

    return {
      ...wallet,
      balance: parseFloat(wallet.balance),
      initialBalance: parseFloat(wallet.initialBalance),
    };
  },

  /**
   * Create a new wallet
   */
  async createWallet(userId: number, input: CreateWalletInput): Promise<Wallet> {
    const db = getDb();

    // If this is marked as main, unset other main wallets
    if (input.isMain) {
      await db.update(walletWallets).set({ isMain: false }).where(eq(walletWallets.userId, userId));
    }

    const initialBalance = input.initialBalance?.toString() || '0';

    const [wallet] = await db
      .insert(walletWallets)
      .values({
        userId,
        name: input.name,
        icon: input.icon || null,
        balance: initialBalance,
        initialBalance: initialBalance,
        isMain: input.isMain || false,
      })
      .returning();

    return {
      ...wallet,
      balance: parseFloat(wallet.balance),
      initialBalance: parseFloat(wallet.initialBalance),
    };
  },

  /**
   * Update a wallet
   */
  async updateWallet(id: string, userId: number, input: UpdateWalletInput): Promise<Wallet> {
    const db = getDb();

    // Verify ownership
    await this.getWalletById(id, userId);

    // Build update object with only provided fields
    const updateData: Partial<typeof walletWallets.$inferInsert> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.balance !== undefined) updateData.balance = input.balance.toString();
    if (input.initialBalance !== undefined)
      updateData.initialBalance = input.initialBalance.toString();

    if (input.isMain !== undefined) {
      // If setting to main, unset other main wallets
      if (input.isMain) {
        await db
          .update(walletWallets)
          .set({ isMain: false })
          .where(eq(walletWallets.userId, userId));
      }
      updateData.isMain = input.isMain;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    const [wallet] = await db
      .update(walletWallets)
      .set(updateData)
      .where(eq(walletWallets.id, id))
      .returning();

    return {
      ...wallet,
      balance: parseFloat(wallet.balance),
      initialBalance: parseFloat(wallet.initialBalance),
    };
  },

  /**
   * Delete a wallet and all related data
   */
  async deleteWallet(id: string, userId: number): Promise<boolean> {
    const db = getDb();

    // Verify ownership
    await this.getWalletById(id, userId);

    // Drizzle will handle cascading deletes as defined in the schema
    // But we can be explicit if needed
    await db.delete(walletWallets).where(eq(walletWallets.id, id));

    return true;
  },

  /**
   * Clean slate - delete ALL wallet data for a user
   */
  async cleanSlate(userId: number): Promise<boolean> {
    const db = getDb();

    // Delete wallets first - cascade will handle related data
    await db.delete(walletWallets).where(eq(walletWallets.userId, userId));

    return true;
  },
};
