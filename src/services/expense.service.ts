import { getDb } from '../shared/database/drizzle';
import {
  walletExpenses,
  walletWallets,
  walletExpenseCategories,
  walletBudgets,
} from '../shared/database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';
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
    const db = getDb();

    const expense = await db.query.walletExpenses.findFirst({
      where: eq(walletExpenses.id, id),
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    // Verify ownership
    if (expense.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to access this expense');
    }

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
    const wallet = await db.query.walletWallets.findFirst({
      where: eq(walletWallets.id, input.walletId),
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    if (wallet.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to add expenses to this wallet');
    }

    // Verify category if provided
    if (input.categoryId) {
      const category = await db.query.walletExpenseCategories.findFirst({
        where: eq(walletExpenseCategories.id, input.categoryId),
      });
      if (!category) {
        throw new NotFoundError('Category not found');
      }
      if (category.userId.toString() !== userId.toString()) {
        throw new ForbiddenError('You do not have permission to use this category');
      }
    }

    // Verify budget if provided
    if (input.budgetId) {
      const budget = await db.query.walletBudgets.findFirst({
        where: eq(walletBudgets.id, input.budgetId),
      });
      if (!budget) {
        throw new NotFoundError('Budget not found');
      }
      if (budget.userId.toString() !== userId.toString()) {
        throw new ForbiddenError('You do not have permission to use this budget');
      }
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

      // Update wallet balance: balance += credit - debit
      const balanceChange = parseFloat(expense.credit) - parseFloat(expense.debit);
      await tx
        .update(walletWallets)
        .set({ balance: sql`balance + ${balanceChange}` })
        .where(eq(walletWallets.id, input.walletId));

      // Update budget balance if linked: balance += debit - credit
      if (input.budgetId) {
        const budgetBalanceChange = parseFloat(expense.debit) - parseFloat(expense.credit);
        await tx
          .update(walletBudgets)
          .set({ balance: sql`balance + ${budgetBalanceChange}` })
          .where(eq(walletBudgets.id, input.budgetId));
      }

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
      // Reverse old balance changes
      const oldBalanceChange = existingExpense.credit - existingExpense.debit;
      await tx
        .update(walletWallets)
        .set({ balance: sql`balance - ${oldBalanceChange}` })
        .where(eq(walletWallets.id, existingExpense.walletId));

      if (existingExpense.budgetId) {
        const oldBudgetChange = existingExpense.debit - existingExpense.credit;
        await tx
          .update(walletBudgets)
          .set({ balance: sql`balance - ${oldBudgetChange}` })
          .where(eq(walletBudgets.id, existingExpense.budgetId));
      }

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

      // Apply new balance changes
      const newBalanceChange = parseFloat(expense.credit) - parseFloat(expense.debit);
      const targetWalletId = input.walletId || existingExpense.walletId;
      await tx
        .update(walletWallets)
        .set({ balance: sql`balance + ${newBalanceChange}` })
        .where(eq(walletWallets.id, targetWalletId));

      const targetBudgetId =
        input.budgetId !== undefined ? input.budgetId : existingExpense.budgetId;
      if (targetBudgetId) {
        const newBudgetChange = parseFloat(expense.debit) - parseFloat(expense.credit);
        await tx
          .update(walletBudgets)
          .set({ balance: sql`balance + ${newBudgetChange}` })
          .where(eq(walletBudgets.id, targetBudgetId));
      }

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
      // Reverse balance changes
      const balanceChange = expense.credit - expense.debit;
      await tx
        .update(walletWallets)
        .set({ balance: sql`balance - ${balanceChange}` })
        .where(eq(walletWallets.id, expense.walletId));

      if (expense.budgetId) {
        const budgetChange = expense.debit - expense.credit;
        await tx
          .update(walletBudgets)
          .set({ balance: sql`balance - ${budgetChange}` })
          .where(eq(walletBudgets.id, expense.budgetId));
      }

      // Delete expense
      await tx.delete(walletExpenses).where(eq(walletExpenses.id, id));
    });

    return true;
  },
};
