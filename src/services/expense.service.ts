import { getDb } from '../shared/database/drizzle';
import { walletExpenses, walletWallets, walletExpenseCategories, walletBudgets } from '../shared/database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

export interface Expense {
  id: string;
  userId: number;
  walletId: string;
  categoryId?: number | null;
  budgetId?: string | null;
  debit: number;
  credit: number;
  description: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseInput {
  walletId: string;
  categoryId?: number;
  budgetId?: string;
  debit?: number;
  credit?: number;
  description: string;
  date?: string;
}

export interface UpdateExpenseInput {
  walletId?: string;
  categoryId?: number;
  budgetId?: string;
  debit?: number;
  credit?: number;
  description?: string;
  date?: string;
}

export interface GetExpensesFilter {
  walletId?: string;
  categoryId?: number;
  budgetId?: string;
  startDate?: string;
  endDate?: string;
}

export const expenseService = {
  /**
   * Get expenses with optional filters
   */
  async getExpenses(userId: string, filter?: GetExpensesFilter): Promise<Expense[]> {
    const db = getDbPool();

    let query = `SELECT id, user_id, wallet_id, category_id, budget_id, debit, credit, note, date, created_at, updated_at
                 FROM wallet_expenses
                 WHERE user_id = $1`;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filter?.walletId) {
      query += ` AND wallet_id = $${paramIndex}`;
      params.push(filter.walletId);
      paramIndex++;
    }

    if (filter?.categoryId) {
      query += ` AND category_id = $${paramIndex}`;
      params.push(filter.categoryId);
      paramIndex++;
    }

    if (filter?.budgetId) {
      query += ` AND budget_id = $${paramIndex}`;
      params.push(filter.budgetId);
      paramIndex++;
    }

    if (filter?.startDate) {
      query += ` AND date >= $${paramIndex}`;
      params.push(filter.startDate);
      paramIndex++;
    }

    if (filter?.endDate) {
      query += ` AND date <= $${paramIndex}`;
      params.push(filter.endDate);
      paramIndex++;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const result = await db.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      walletId: row.wallet_id,
      categoryId: row.category_id,
      budgetId: row.budget_id,
      debit: parseFloat(row.debit),
      credit: parseFloat(row.credit),
      note: row.note,
      date: row.date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * Get an expense by ID
   */
  async getExpenseById(id: string, userId: string): Promise<Expense> {
    const db = getDbPool();
    const result = await db.query(
      `SELECT id, user_id, wallet_id, category_id, budget_id, debit, credit, note, date, created_at, updated_at
       FROM wallet_expenses
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Expense not found');
    }

    const expense = result.rows[0];

    // Convert both to string for comparison (userId from JWT is string, user_id from DB is integer)
    if (expense.user_id.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to access this expense');
    }

    return {
      id: expense.id,
      userId: expense.user_id,
      walletId: expense.wallet_id,
      categoryId: expense.category_id,
      budgetId: expense.budget_id,
      debit: parseFloat(expense.debit),
      credit: parseFloat(expense.credit),
      note: expense.note,
      date: expense.date,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
    };
  },

  /**
   * Create a new expense and update wallet/budget balances
   */
  async createExpense(userId: string, input: CreateExpenseInput): Promise<Expense> {
    const db = getDbPool();

    // Verify wallet ownership
    const walletResult = await db.query('SELECT id, user_id FROM wallet_wallets WHERE id = $1', [
      input.walletId,
    ]);

    if (walletResult.rows.length === 0) {
      throw new NotFoundError('Wallet not found');
    }

    // Convert both to string for comparison
    if (walletResult.rows[0].user_id.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to add expenses to this wallet');
    }

    // Verify category if provided
    if (input.categoryId) {
      const categoryResult = await db.query(
        'SELECT id, user_id FROM wallet_expense_categories WHERE id = $1',
        [input.categoryId]
      );
      if (categoryResult.rows.length === 0) {
        throw new NotFoundError('Category not found');
      }
      // Convert both to string for comparison
      if (categoryResult.rows[0].user_id.toString() !== userId.toString()) {
        throw new ForbiddenError('You do not have permission to use this category');
      }
    }

    // Verify budget if provided
    if (input.budgetId) {
      const budgetResult = await db.query('SELECT id, user_id FROM wallet_budgets WHERE id = $1', [
        input.budgetId,
      ]);
      if (budgetResult.rows.length === 0) {
        throw new NotFoundError('Budget not found');
      }
      // Convert both to string for comparison
      if (budgetResult.rows[0].user_id.toString() !== userId.toString()) {
        throw new ForbiddenError('You do not have permission to use this budget');
      }
    }

    await db.query('BEGIN');

    try {
      // Create expense
      const expenseResult = await db.query(
        `INSERT INTO wallet_expenses (user_id, wallet_id, category_id, budget_id, debit, credit, note, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, user_id, wallet_id, category_id, budget_id, debit, credit, note, date, created_at, updated_at`,
        [
          userId,
          input.walletId,
          input.categoryId || null,
          input.budgetId || null,
          input.debit || 0,
          input.credit || 0,
          input.note || null,
          input.date || new Date(),
        ]
      );

      const expense = expenseResult.rows[0];

      // Update wallet balance: balance += credit - debit
      const balanceChange = parseFloat(expense.credit) - parseFloat(expense.debit);
      await db.query('UPDATE wallet_wallets SET balance = balance + $1 WHERE id = $2', [
        balanceChange,
        input.walletId,
      ]);

      // Update budget balance if linked: balance += debit - credit
      if (input.budgetId) {
        const budgetBalanceChange = parseFloat(expense.debit) - parseFloat(expense.credit);
        await db.query('UPDATE wallet_budgets SET balance = balance + $1 WHERE id = $2', [
          budgetBalanceChange,
          input.budgetId,
        ]);
      }

      await db.query('COMMIT');

      return {
        id: expense.id,
        userId: expense.user_id,
        walletId: expense.wallet_id,
        categoryId: expense.category_id,
        budgetId: expense.budget_id,
        debit: parseFloat(expense.debit),
        credit: parseFloat(expense.credit),
        note: expense.note,
        date: expense.date,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },

  /**
   * Update an expense and adjust wallet/budget balances
   */
  async updateExpense(id: string, userId: string, input: UpdateExpenseInput): Promise<Expense> {
    const db = getDbPool();

    // Get existing expense
    const existingExpense = await this.getExpenseById(id, userId);

    await db.query('BEGIN');

    try {
      // Reverse old balance changes
      const oldBalanceChange = existingExpense.credit - existingExpense.debit;
      await db.query('UPDATE wallet_wallets SET balance = balance - $1 WHERE id = $2', [
        oldBalanceChange,
        existingExpense.walletId,
      ]);

      if (existingExpense.budgetId) {
        const oldBudgetChange = existingExpense.debit - existingExpense.credit;
        await db.query('UPDATE wallet_budgets SET balance = balance - $1 WHERE id = $2', [
          oldBudgetChange,
          existingExpense.budgetId,
        ]);
      }

      // Update expense
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (input.walletId !== undefined) {
        updates.push(`wallet_id = $${paramIndex}`);
        params.push(input.walletId);
        paramIndex++;
      }

      if (input.categoryId !== undefined) {
        updates.push(`category_id = $${paramIndex}`);
        params.push(input.categoryId);
        paramIndex++;
      }

      if (input.budgetId !== undefined) {
        updates.push(`budget_id = $${paramIndex}`);
        params.push(input.budgetId);
        paramIndex++;
      }

      if (input.debit !== undefined) {
        updates.push(`debit = $${paramIndex}`);
        params.push(input.debit);
        paramIndex++;
      }

      if (input.credit !== undefined) {
        updates.push(`credit = $${paramIndex}`);
        params.push(input.credit);
        paramIndex++;
      }

      if (input.note !== undefined) {
        updates.push(`note = $${paramIndex}`);
        params.push(input.note);
        paramIndex++;
      }

      if (input.date !== undefined) {
        updates.push(`date = $${paramIndex}`);
        params.push(input.date);
        paramIndex++;
      }

      if (updates.length === 0) {
        throw new BadRequestError('No fields to update');
      }

      params.push(id);

      const result = await db.query(
        `UPDATE wallet_expenses SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING id, user_id, wallet_id, category_id, budget_id, debit, credit, note, date, created_at, updated_at`,
        params
      );

      const expense = result.rows[0];

      // Apply new balance changes
      const newBalanceChange = parseFloat(expense.credit) - parseFloat(expense.debit);
      const targetWalletId = input.walletId || existingExpense.walletId;
      await db.query('UPDATE wallet_wallets SET balance = balance + $1 WHERE id = $2', [
        newBalanceChange,
        targetWalletId,
      ]);

      const targetBudgetId =
        input.budgetId !== undefined ? input.budgetId : existingExpense.budgetId;
      if (targetBudgetId) {
        const newBudgetChange = parseFloat(expense.debit) - parseFloat(expense.credit);
        await db.query('UPDATE wallet_budgets SET balance = balance + $1 WHERE id = $2', [
          newBudgetChange,
          targetBudgetId,
        ]);
      }

      await db.query('COMMIT');

      return {
        id: expense.id,
        userId: expense.user_id,
        walletId: expense.wallet_id,
        categoryId: expense.category_id,
        budgetId: expense.budget_id,
        debit: parseFloat(expense.debit),
        credit: parseFloat(expense.credit),
        note: expense.note,
        date: expense.date,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },

  /**
   * Delete an expense and reverse balance changes
   */
  async deleteExpense(id: string, userId: string): Promise<boolean> {
    const db = getDbPool();

    // Get existing expense
    const expense = await this.getExpenseById(id, userId);

    await db.query('BEGIN');

    try {
      // Reverse balance changes
      const balanceChange = expense.credit - expense.debit;
      await db.query('UPDATE wallet_wallets SET balance = balance - $1 WHERE id = $2', [
        balanceChange,
        expense.walletId,
      ]);

      if (expense.budgetId) {
        const budgetChange = expense.debit - expense.credit;
        await db.query('UPDATE wallet_budgets SET balance = balance - $1 WHERE id = $2', [
          budgetChange,
          expense.budgetId,
        ]);
      }

      // Delete expense
      await db.query('DELETE FROM wallet_expenses WHERE id = $1', [id]);

      await db.query('COMMIT');
      return true;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },
};
