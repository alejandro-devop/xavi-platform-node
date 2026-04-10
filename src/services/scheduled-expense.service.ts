import { getDb } from '../shared/database/drizzle';
import {
  walletScheduledExpenses,
  walletWallets,
  walletExpenseCategories,
  walletBudgets,
  walletExpenses,
} from '../shared/database/schema';
import { eq, and, gte, lte, desc, isNull, or } from 'drizzle-orm';
import { BadRequestError, NotFoundError, ForbiddenError } from '../shared/errors';
import { checkRecordExists } from '../shared/utils/db-validators';
import { balanceStrategies, updateBalances } from '../shared/utils/balance-strategies';
import { RecurrenceService } from '../shared/utils/recurrence.service';
import { budgetClosureService } from './budget-closure.service';
import type {
  ScheduledExpense,
  CreateScheduledExpenseInput,
  UpdateScheduledExpenseInput,
  GetScheduledExpensesFilter,
  PayScheduledExpenseInput,
  BulkUpdateScheduledExpensesInput,
  BulkDeleteScheduledExpensesInput,
} from '../types/services/scheduled-expense.types';

export const scheduledExpenseService = {
  /**
   * Get scheduled expenses with optional filters
   */
  async getScheduledExpenses(
    userId: number,
    filter?: GetScheduledExpensesFilter
  ): Promise<ScheduledExpense[]> {
    const db = getDb();

    const conditions = [eq(walletScheduledExpenses.userId, userId)];

    if (filter?.walletId) {
      conditions.push(eq(walletScheduledExpenses.walletId, filter.walletId));
    }

    if (filter?.categoryId) {
      conditions.push(eq(walletScheduledExpenses.categoryId, filter.categoryId));
    }

    if (filter?.budgetId) {
      conditions.push(eq(walletScheduledExpenses.budgetId, filter.budgetId));
    }

    if (filter?.parentId) {
      conditions.push(eq(walletScheduledExpenses.parentId, filter.parentId));
    }

    if (filter?.isPaid !== undefined) {
      conditions.push(eq(walletScheduledExpenses.isPaid, filter.isPaid));
    }

    if (filter?.startDate) {
      conditions.push(gte(walletScheduledExpenses.dueDate, filter.startDate));
    }

    if (filter?.endDate) {
      conditions.push(lte(walletScheduledExpenses.dueDate, filter.endDate));
    }

    const expenses = await db.query.walletScheduledExpenses.findMany({
      where: and(...conditions),
      orderBy: [desc(walletScheduledExpenses.dueDate), desc(walletScheduledExpenses.id)],
    });

    return expenses.map((expense) => ({
      ...expense,
      amount: parseFloat(expense.amount),
    }));
  },

  /**
   * Get a scheduled expense by ID
   */
  async getScheduledExpenseById(id: string, userId: number): Promise<ScheduledExpense> {
    const expense = await checkRecordExists({
      table: walletScheduledExpenses,
      idValue: id,
      scopeField: walletScheduledExpenses.userId,
      scopeValue: userId,
      notFoundMessage: 'Scheduled expense not found',
      forbiddenMessage: 'You do not have permission to access this scheduled expense',
    });

    return {
      ...expense,
      amount: parseFloat(expense.amount),
    };
  },

  /**
   * Create a new scheduled expense with optional recurrence
   * If repeatType is provided, generates all occurrences automatically
   */
  async createScheduledExpense(
    userId: number,
    input: CreateScheduledExpenseInput
  ): Promise<ScheduledExpense[]> {
    const db = getDb();

    // Verify wallet ownership
    await checkRecordExists({
      table: walletWallets,
      idValue: input.walletId,
      scopeField: walletWallets.userId,
      scopeValue: userId,
      notFoundMessage: 'Wallet not found',
      forbiddenMessage: 'You do not have permission to add scheduled expenses to this wallet',
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

    // Generate occurrences based on repeat type
    const occurrences =
      input.repeatType && input.repeatType !== 'none' && input.endDate
        ? RecurrenceService.generateOccurrences(input.dueDate, input.endDate, input.repeatType)
        : [{ dueDate: input.dueDate }];

    // Create all scheduled expenses in a transaction
    const createdExpenses: ScheduledExpense[] = [];

    await db.transaction(async (tx) => {
      let parentId: string | null = null;

      for (const [index, occurrence] of occurrences.entries()) {
        const [scheduledExpense]: any[] = await tx
          .insert(walletScheduledExpenses)
          .values({
            userId,
            walletId: input.walletId,
            categoryId: input.categoryId || null,
            budgetId: input.budgetId || null,
            amount: input.amount.toString(),
            description: input.description,
            dueDate: occurrence.dueDate,
            repeatType: input.repeatType || 'none',
            endDate: input.endDate || null,
            parentId: index === 0 ? null : parentId,
            isPaid: false,
          })
          .returning();

        // First expense becomes the parent
        if (index === 0) {
          parentId = scheduledExpense.id;
        }

        createdExpenses.push({
          ...scheduledExpense,
          amount: parseFloat(scheduledExpense.amount),
        });
      }
    });

    return createdExpenses;
  },

  /**
   * Update a scheduled expense
   * Cannot update if already paid
   */
  async updateScheduledExpense(
    id: string,
    userId: number,
    input: UpdateScheduledExpenseInput
  ): Promise<ScheduledExpense> {
    const db = getDb();

    // Verify ownership and get current data
    const currentExpense = await this.getScheduledExpenseById(id, userId);

    // Validate: cannot update if paid
    if (currentExpense.isPaid) {
      throw new BadRequestError('Cannot update a paid scheduled expense. Revert payment first.');
    }

    // Verify wallet if being changed
    if (input.walletId !== undefined) {
      await checkRecordExists({
        table: walletWallets,
        idValue: input.walletId,
        scopeField: walletWallets.userId,
        scopeValue: userId,
        notFoundMessage: 'Wallet not found',
        forbiddenMessage: 'You do not have permission to use this wallet',
      });
    }

    // Verify category if being changed
    if (input.categoryId !== undefined && input.categoryId !== null) {
      await checkRecordExists({
        table: walletExpenseCategories,
        idValue: input.categoryId,
        scopeField: walletExpenseCategories.userId,
        scopeValue: userId,
        notFoundMessage: 'Category not found',
        forbiddenMessage: 'You do not have permission to use this category',
      });
    }

    // Verify budget if being changed
    if (input.budgetId !== undefined && input.budgetId !== null) {
      await checkRecordExists({
        table: walletBudgets,
        idValue: input.budgetId,
        scopeField: walletBudgets.userId,
        scopeValue: userId,
        notFoundMessage: 'Budget not found',
        forbiddenMessage: 'You do not have permission to use this budget',
      });
    }

    // Build update object
    // Note: dueDate, repeatType, and endDate cannot be updated
    const updateData: Partial<typeof walletScheduledExpenses.$inferInsert> = {};

    if (input.walletId !== undefined) updateData.walletId = input.walletId;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.budgetId !== undefined) updateData.budgetId = input.budgetId;
    if (input.amount !== undefined) updateData.amount = input.amount.toString();
    if (input.description !== undefined) updateData.description = input.description;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    const [updatedExpense] = await db
      .update(walletScheduledExpenses)
      .set(updateData)
      .where(eq(walletScheduledExpenses.id, id))
      .returning();

    return {
      ...updatedExpense,
      amount: parseFloat(updatedExpense.amount),
    };
  },

  /**
   * Bulk update scheduled expenses by parent ID
   * Only updates unpaid expenses
   */
  async bulkUpdateScheduledExpenses(
    userId: number,
    input: BulkUpdateScheduledExpensesInput
  ): Promise<ScheduledExpense[]> {
    const db = getDb();

    // Get all scheduled expenses with this parent ID (including the parent itself)
    const expenses = await db.query.walletScheduledExpenses.findMany({
      where: and(
        eq(walletScheduledExpenses.userId, userId),
        or(
          eq(walletScheduledExpenses.id, input.parentId),
          eq(walletScheduledExpenses.parentId, input.parentId)
        )
      ),
    });

    if (expenses.length === 0) {
      throw new NotFoundError('No scheduled expenses found with this parent ID');
    }

    // Check if any are paid
    const anyPaid = expenses.some((e) => e.isPaid);
    if (anyPaid) {
      throw new BadRequestError(
        'Cannot bulk update: some scheduled expenses are already paid. Revert payments first.'
      );
    }

    // Verify category if being changed
    if (input.categoryId !== undefined && input.categoryId !== null) {
      await checkRecordExists({
        table: walletExpenseCategories,
        idValue: input.categoryId,
        scopeField: walletExpenseCategories.userId,
        scopeValue: userId,
        notFoundMessage: 'Category not found',
        forbiddenMessage: 'You do not have permission to use this category',
      });
    }

    // Verify budget if being changed
    if (input.budgetId !== undefined && input.budgetId !== null) {
      await checkRecordExists({
        table: walletBudgets,
        idValue: input.budgetId,
        scopeField: walletBudgets.userId,
        scopeValue: userId,
        notFoundMessage: 'Budget not found',
        forbiddenMessage: 'You do not have permission to use this budget',
      });
    }

    // Build update object
    const updateData: Partial<typeof walletScheduledExpenses.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.amount !== undefined) updateData.amount = input.amount.toString();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.budgetId !== undefined) updateData.budgetId = input.budgetId;

    // Update all expenses
    const updatedExpenses = await db
      .update(walletScheduledExpenses)
      .set(updateData)
      .where(
        and(
          eq(walletScheduledExpenses.userId, userId),
          or(
            eq(walletScheduledExpenses.id, input.parentId),
            eq(walletScheduledExpenses.parentId, input.parentId)
          )
        )
      )
      .returning();

    return updatedExpenses.map((expense) => ({
      ...expense,
      amount: parseFloat(expense.amount),
    }));
  },

  /**
   * Pay a scheduled expense - creates actual expense and updates balances
   */
  async payScheduledExpense(
    userId: number,
    input: PayScheduledExpenseInput
  ): Promise<ScheduledExpense> {
    const db = getDb();

    // Get the scheduled expense
    const scheduledExpense = await this.getScheduledExpenseById(input.id, userId);

    // Validate: cannot pay if already paid
    if (scheduledExpense.isPaid) {
      throw new BadRequestError('Scheduled expense is already paid');
    }

    // Use provided amountPaid or default to scheduled amount
    const amountPaid = input.amountPaid ?? scheduledExpense.amount;
    const paidDate = input.paidDate || new Date().toISOString().split('T')[0];

    await budgetClosureService.assertBudgetDateOpen(
      userId,
      scheduledExpense.budgetId,
      paidDate,
      'pay scheduled expense in a closed period'
    );

    // Create the actual expense in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the expense
      const [expense] = await tx
        .insert(walletExpenses)
        .values({
          userId,
          walletId: scheduledExpense.walletId,
          categoryId: scheduledExpense.categoryId,
          budgetId: scheduledExpense.budgetId,
          date: paidDate,
          description: scheduledExpense.description,
          debit: amountPaid.toString(),
          credit: '0',
          isIncome: false,
          isOutcome: true,
        })
        .returning();

      // Update balances using the apply strategy
      await updateBalances(balanceStrategies.apply, {
        tx,
        walletId: scheduledExpense.walletId,
        budgetId: scheduledExpense.budgetId,
        credit: 0,
        debit: amountPaid,
      });

      // Update scheduled expense
      const [updated] = await tx
        .update(walletScheduledExpenses)
        .set({
          isPaid: true,
          paidDate: new Date(),
          expenseId: expense.id,
          updatedAt: new Date(),
        })
        .where(eq(walletScheduledExpenses.id, input.id))
        .returning();

      return updated;
    });

    return {
      ...result,
      amount: parseFloat(result.amount),
    };
  },

  /**
   * Revert payment of a scheduled expense - deletes expense and restores balances
   */
  async revertScheduledExpensePayment(id: string, userId: number): Promise<ScheduledExpense> {
    const db = getDb();

    // Get the scheduled expense
    const scheduledExpense = await this.getScheduledExpenseById(id, userId);

    // Validate: must be paid
    if (!scheduledExpense.isPaid) {
      throw new BadRequestError('Scheduled expense is not paid');
    }

    // Validate: must have associated expense
    if (!scheduledExpense.expenseId) {
      throw new BadRequestError('Scheduled expense does not have an associated expense');
    }

    // Revert in a transaction
    const result = await db.transaction(async (tx) => {
      // Get the expense details before deletion
      const [expense] = await tx
        .select()
        .from(walletExpenses)
        .where(eq(walletExpenses.id, scheduledExpense.expenseId!));

      if (!expense) {
        throw new NotFoundError('Associated expense not found');
      }

      await budgetClosureService.assertBudgetDateOpen(
        userId,
        expense.budgetId,
        expense.date,
        'revert payment from a closed period',
        tx
      );

      // Reverse the balances
      await updateBalances(balanceStrategies.reverse, {
        tx,
        walletId: expense.walletId,
        budgetId: expense.budgetId,
        credit: parseFloat(expense.credit),
        debit: parseFloat(expense.debit),
      });

      // Delete the expense
      await tx.delete(walletExpenses).where(eq(walletExpenses.id, scheduledExpense.expenseId!));

      // Update scheduled expense
      const [updated] = await tx
        .update(walletScheduledExpenses)
        .set({
          isPaid: false,
          paidDate: null,
          expenseId: null,
          updatedAt: new Date(),
        })
        .where(eq(walletScheduledExpenses.id, id))
        .returning();

      return updated;
    });

    return {
      ...result,
      amount: parseFloat(result.amount),
    };
  },

  /**
   * Delete a scheduled expense
   * If paid, also deletes the associated expense and reverts balances
   */
  async deleteScheduledExpense(id: string, userId: number): Promise<boolean> {
    const db = getDb();

    // Get the scheduled expense
    const scheduledExpense = await this.getScheduledExpenseById(id, userId);

    // If paid, revert payment first
    if (scheduledExpense.isPaid) {
      await this.revertScheduledExpensePayment(id, userId);
    }

    // Delete the scheduled expense
    await db.delete(walletScheduledExpenses).where(eq(walletScheduledExpenses.id, id));

    return true;
  },

  /**
   * Bulk delete scheduled expenses by parent ID
   * Only deletes unpaid expenses
   */
  async bulkDeleteScheduledExpenses(
    userId: number,
    input: BulkDeleteScheduledExpensesInput
  ): Promise<boolean> {
    const db = getDb();

    // Get all scheduled expenses with this parent ID (including the parent itself)
    const expenses = await db.query.walletScheduledExpenses.findMany({
      where: and(
        eq(walletScheduledExpenses.userId, userId),
        or(
          eq(walletScheduledExpenses.id, input.parentId),
          eq(walletScheduledExpenses.parentId, input.parentId)
        )
      ),
    });

    if (expenses.length === 0) {
      throw new NotFoundError('No scheduled expenses found with this parent ID');
    }

    // Check if any are paid
    const anyPaid = expenses.some((e) => e.isPaid);
    if (anyPaid) {
      throw new BadRequestError(
        'Cannot bulk delete: some scheduled expenses are already paid. Revert payments first.'
      );
    }

    // Delete all expenses
    await db
      .delete(walletScheduledExpenses)
      .where(
        and(
          eq(walletScheduledExpenses.userId, userId),
          or(
            eq(walletScheduledExpenses.id, input.parentId),
            eq(walletScheduledExpenses.parentId, input.parentId)
          )
        )
      );

    return true;
  },

  /**
   * Clean slate - delete ALL scheduled expenses for a user, reverting paid ones
   */
  async cleanSlate(userId: number): Promise<boolean> {
    const db = getDb();

    // Get all paid scheduled expenses
    const paidExpenses = await db.query.walletScheduledExpenses.findMany({
      where: and(
        eq(walletScheduledExpenses.userId, userId),
        eq(walletScheduledExpenses.isPaid, true)
      ),
    });

    // Revert all paid expenses in a transaction
    if (paidExpenses.length > 0) {
      await db.transaction(async (tx) => {
        for (const scheduledExpense of paidExpenses) {
          if (scheduledExpense.expenseId) {
            // Get expense details
            const [expense] = await tx
              .select()
              .from(walletExpenses)
              .where(eq(walletExpenses.id, scheduledExpense.expenseId));

            if (expense) {
              // Reverse balances
              await updateBalances(balanceStrategies.reverse, {
                tx,
                walletId: expense.walletId,
                budgetId: expense.budgetId,
                credit: parseFloat(expense.credit),
                debit: parseFloat(expense.debit),
              });

              // Delete expense
              await tx
                .delete(walletExpenses)
                .where(eq(walletExpenses.id, scheduledExpense.expenseId));
            }
          }
        }
      });
    }

    // Delete all scheduled expenses
    await db.delete(walletScheduledExpenses).where(eq(walletScheduledExpenses.userId, userId));

    return true;
  },

  /**
   * Clean slate scheduled expenses only - deletes ALL scheduled expenses for a user.
   * Does NOT affect actual expenses, balances, categories, or any other data.
   */
  async cleanSlateScheduledExpenses(userId: number): Promise<boolean> {
    const db = getDb();

    await db.delete(walletScheduledExpenses).where(eq(walletScheduledExpenses.userId, userId));

    return true;
  },
};
