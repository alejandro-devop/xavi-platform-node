import { getDbPool } from '../shared/database/pool';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  balance: number;
  initialBalance: number;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletInput {
  name: string;
  initialBalance?: number;
  isMain?: boolean;
}

export interface UpdateWalletInput {
  name?: string;
  balance?: number;
  initialBalance?: number;
  isMain?: boolean;
}

export const walletService = {
  /**
   * Get all wallets for a user
   */
  async getWallets(userId: string): Promise<Wallet[]> {
    const db = getDbPool();
    const result = await db.query(
      `SELECT id, user_id, name, balance, initial_balance, is_main, created_at, updated_at
       FROM wallet_wallets
       WHERE user_id = $1
       ORDER BY is_main DESC, created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      balance: parseFloat(row.balance),
      initialBalance: parseFloat(row.initial_balance),
      isMain: row.is_main,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * Get a wallet by ID
   */
  async getWalletById(id: string, userId: string): Promise<Wallet> {
    const db = getDbPool();
    const result = await db.query(
      `SELECT id, user_id, name, balance, initial_balance, is_main, created_at, updated_at
       FROM wallet_wallets
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Wallet not found');
    }

    const wallet = result.rows[0];

    if (wallet.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this wallet');
    }

    return {
      id: wallet.id,
      userId: wallet.user_id,
      name: wallet.name,
      balance: parseFloat(wallet.balance),
      initialBalance: parseFloat(wallet.initial_balance),
      isMain: wallet.is_main,
      createdAt: wallet.created_at,
      updatedAt: wallet.updated_at,
    };
  },

  /**
   * Create a new wallet
   */
  async createWallet(userId: string, input: CreateWalletInput): Promise<Wallet> {
    const db = getDbPool();

    // If this is marked as main, unset other main wallets
    if (input.isMain) {
      await db.query('UPDATE wallet_wallets SET is_main = false WHERE user_id = $1', [userId]);
    }

    const result = await db.query(
      `INSERT INTO wallet_wallets (user_id, name, balance, initial_balance, is_main)
       VALUES ($1, $2, $3, $3, $4)
       RETURNING id, user_id, name, balance, initial_balance, is_main, created_at, updated_at`,
      [userId, input.name, input.initialBalance || 0, input.isMain || false]
    );

    const wallet = result.rows[0];

    return {
      id: wallet.id,
      userId: wallet.user_id,
      name: wallet.name,
      balance: parseFloat(wallet.balance),
      initialBalance: parseFloat(wallet.initial_balance),
      isMain: wallet.is_main,
      createdAt: wallet.created_at,
      updatedAt: wallet.updated_at,
    };
  },

  /**
   * Update a wallet
   */
  async updateWallet(id: string, userId: string, input: UpdateWalletInput): Promise<Wallet> {
    const db = getDbPool();

    // Verify ownership
    await this.getWalletById(id, userId);

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(input.name);
      paramIndex++;
    }

    if (input.balance !== undefined) {
      updates.push(`balance = $${paramIndex}`);
      params.push(input.balance);
      paramIndex++;
    }

    if (input.initialBalance !== undefined) {
      updates.push(`initial_balance = $${paramIndex}`);
      params.push(input.initialBalance);
      paramIndex++;
    }

    if (input.isMain !== undefined) {
      // If setting to main, unset other main wallets
      if (input.isMain) {
        await db.query('UPDATE wallet_wallets SET is_main = false WHERE user_id = $1', [userId]);
      }
      updates.push(`is_main = $${paramIndex}`);
      params.push(input.isMain);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    params.push(id);

    const result = await db.query(
      `UPDATE wallet_wallets SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, user_id, name, balance, initial_balance, is_main, created_at, updated_at`,
      params
    );

    const wallet = result.rows[0];

    return {
      id: wallet.id,
      userId: wallet.user_id,
      name: wallet.name,
      balance: parseFloat(wallet.balance),
      initialBalance: parseFloat(wallet.initial_balance),
      isMain: wallet.is_main,
      createdAt: wallet.created_at,
      updatedAt: wallet.updated_at,
    };
  },

  /**
   * Delete a wallet and all related data
   */
  async deleteWallet(id: string, userId: string): Promise<boolean> {
    const db = getDbPool();

    // Verify ownership
    await this.getWalletById(id, userId);

    await db.query('BEGIN');

    try {
      // Delete related data (cascading will handle most, but let's be explicit)
      await db.query('DELETE FROM wallet_expenses WHERE wallet_id = $1', [id]);
      await db.query('DELETE FROM wallet_scheduled_expenses WHERE wallet_id = $1', [id]);
      await db.query('DELETE FROM wallet_budgets WHERE wallet_id = $1', [id]);

      // Delete the wallet
      await db.query('DELETE FROM wallet_wallets WHERE id = $1', [id]);

      await db.query('COMMIT');
      return true;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },

  /**
   * Clean slate - delete ALL wallet data for a user
   */
  async cleanSlate(userId: string): Promise<boolean> {
    const db = getDbPool();

    await db.query('BEGIN');

    try {
      // Delete in correct order to respect foreign keys
      await db.query('DELETE FROM wallet_budget_follow_ups WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM wallet_expenses WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM wallet_scheduled_expenses WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM wallet_budgets WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM wallet_wallets WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM wallet_periods WHERE user_id = $1', [userId]);
      // Don't delete frequencies as they might be system-wide

      await db.query('COMMIT');
      return true;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },
};
