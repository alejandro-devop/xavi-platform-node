import { getDb } from '../shared/database/drizzle';
import {
  walletExpenses,
  walletWallets,
  walletExpenseCategories,
  walletBudgets,
} from '../shared/database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { BadRequestError } from '../shared/errors';
import { checkRecordExists } from '../shared/utils/db-validators';
import { balanceStrategies, updateBalances } from '../shared/utils/balance-strategies';
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  GetExpensesFilter,
} from '../types/services/expense.types';

export const expenseService = {
  /**
   * Get expenses with optional filters
   */
  async getExpenses(userId: number, filter?: GetExpensesFilter): Promise<Expense[]> {
    const db = getDb();

    const conditions = [eq(walletExpenses.userId, userId)];

    if (filter?.walletId) {
      conditions.push(eq(walletExpenses.walletId, filter.walletId));
    }

    if (filter?.categoryId) {
      conditions.push(eq(walletExpenses.categoryId, filter.categoryId));
    }

    if (filter?.budgetId) {
      conditions.push(eq(walletExpenses.budgetId, filter.budgetId));
    }

    if (filter?.startDate) {
      conditions.push(gte(walletExpenses.date, filter.startDate));
    }

    if (filter?.endDate) {
      conditions.push(lte(walletExpenses.date, filter.endDate));
    }

    const expenses = await db.query.walletExpenses.findMany({
      where: and(...conditions),
      orderBy: [desc(walletExpenses.date), desc(walletExpenses.id)], // Date first, then newest first (UUID v7)
    });

    return expenses.map((expense) => ({
      ...expense,
      debit: parseFloat(expense.debit),
      credit: parseFloat(expense.credit),
    }));
  },

  /**
   * Get an expense by ID
   */
  async getExpenseById(id: string, userId: number): Promise<Expense> {
    const expense = await checkRecordExists({
      table: walletExpenses,
      idValue: id,
      scopeField: walletExpenses.userId,
      scopeValue: userId,
      notFoundMessage: 'Expense not found',
      forbiddenMessage: 'You do not have permission to access this expense',
    });

    return {
      ...expense,
      debit: parseFloat(expense.debit),
      credit: parseFloat(expense.credit),
    };
  },

  /**
   * Create a new expense and update wallet/budget balances
   */
  async createExpense(userId: number, input: CreateExpenseInput): Promise<Expense> {
    const db = getDb();

    // Verify wallet ownership
    await checkRecordExists({
      table: walletWallets,
      idValue: input.walletId,
      scopeField: walletWallets.userId,
      scopeValue: userId,
      notFoundMessage: 'Wallet not found',
      forbiddenMessage: 'You do not have permission to add expenses to this wallet',
    });

    // Verify category if provided
    if (input.categoryId) {
      await checkRecordExists({
        table: walletExpenseCategories,
        idValue: input.categoryId,
        scopeField: walletExpenseCategories.userId,
        scopeValue: userId,
        notFoundMessage: 'Category not found',
        forbiddenMessage: 'You do not have permission to use this category',
      });
    }

    // Verify budget if provided
    if (input.budgetId) {
      await checkRecordExists({
        table: walletBudgets,
        idValue: input.budgetId,
        scopeField: walletBudgets.userId,
        scopeValue: userId,
        notFoundMessage: 'Budget not found',
        forbiddenMessage: 'You do not have permission to use this budget',
      });
    }

    // Use Drizzle transaction
    const result = await db.transaction(async (tx) => {
      const debitValue = input.debit?.toString() || '0';
      const creditValue = input.credit?.toString() || '0';

      // Create expense
      const [expense] = await tx
        .insert(walletExpenses)
        .values({
          userId,
          walletId: input.walletId,
          categoryId: input.categoryId || null,
          budgetId: input.budgetId || null,
          debit: debitValue,
          credit: creditValue,
          description: input.description,
          date: input.date || new Date().toISOString().split('T')[0],
        })
        .returning();

      // Apply balance changes using strategy pattern
      await updateBalances(balanceStrategies.apply, {
        tx,
        walletId: input.walletId,
        budgetId: input.budgetId,
        credit: parseFloat(expense.credit),
        debit: parseFloat(expense.debit),
      });

      return expense;
    });

    return {
      ...result,
      debit: parseFloat(result.debit),
      credit: parseFloat(result.credit),
    };
  },

  /**
   * Update an expense and adjust wallet/budget balances
   */
  async updateExpense(id: string, userId: number, input: UpdateExpenseInput): Promise<Expense> {
    const db = getDb();

    // Get existing expense
    const existingExpense = await this.getExpenseById(id, userId);

    // Use Drizzle transaction
    const result = await db.transaction(async (tx) => {
      // Reverse old balance changes using strategy pattern
      await updateBalances(balanceStrategies.reverse, {
        tx,
        walletId: existingExpense.walletId,
        budgetId: existingExpense.budgetId,
        credit: existingExpense.credit,
        debit: existingExpense.debit,
      });

      // Build update object
      const updateData: Partial<typeof walletExpenses.$inferInsert> = {};

      if (input.walletId !== undefined) updateData.walletId = input.walletId;
      if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
      if (input.budgetId !== undefined) updateData.budgetId = input.budgetId;
      if (input.debit !== undefined) updateData.debit = input.debit.toString();
      if (input.credit !== undefined) updateData.credit = input.credit.toString();
      if (input.description !== undefined) updateData.description = input.description;
      if (input.date !== undefined) updateData.date = input.date;

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestError('No fields to update');
      }

      // Always update timestamp
      updateData.updatedAt = new Date();

      // Update expense
      const [expense] = await tx
        .update(walletExpenses)
        .set(updateData)
        .where(eq(walletExpenses.id, id))
        .returning();

      // Apply new balance changes using strategy pattern
      const targetWalletId = input.walletId || existingExpense.walletId;
      const targetBudgetId =
        input.budgetId !== undefined ? input.budgetId : existingExpense.budgetId;

      await updateBalances(balanceStrategies.apply, {
        tx,
        walletId: targetWalletId,
        budgetId: targetBudgetId,
        credit: parseFloat(expense.credit),
        debit: parseFloat(expense.debit),
      });

      return expense;
    });

    return {
      ...result,
      debit: parseFloat(result.debit),
      credit: parseFloat(result.credit),
    };
  },

  /**
   * Delete an expense and reverse balance changes
   */
  async deleteExpense(id: string, userId: number): Promise<boolean> {
    const db = getDb();

    // Get existing expense
    const expense = await this.getExpenseById(id, userId);

    // Use Drizzle transaction
    await db.transaction(async (tx) => {
      // Reverse balance changes using strategy pattern
      await updateBalances(balanceStrategies.reverse, {
        tx,
        walletId: expense.walletId,
        budgetId: expense.budgetId,
        credit: expense.credit,
        debit: expense.debit,
      });

      // Delete expense
      await tx.delete(walletExpenses).where(eq(walletExpenses.id, id));
    });

    return true;
  },
};
