import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../shared/database/drizzle';
import {
  walletBudgets,
  walletExpenses,
  walletFrequencies,
  walletScheduledExpenses,
  walletWallets,
} from '../shared/database/schema';
import { BadRequestError, NotFoundError } from '../shared/errors';
import { checkRecordExists } from '../shared/utils/db-validators';
import type {
  ApplyBudgetToExpensesInput,
  Budget,
  CreateBudgetInput,
  GetBudgetsFilter,
  UpdateBudgetInput,
} from '../types/services/budget.types';

function toBudget(model: typeof walletBudgets.$inferSelect): Budget {
  return {
    ...model,
    amount: parseFloat(model.amount),
    balance: parseFloat(model.balance),
  };
}

function budgetEffect(credit: number, debit: number): number {
  // Available budget decreases with spending and increases on reversals.
  return credit - debit;
}

export const budgetService = {
  async getBudgets(userId: number, filter?: GetBudgetsFilter): Promise<Budget[]> {
    const db = getDb();

    const conditions = [eq(walletBudgets.userId, userId)];

    if (filter?.walletId) {
      conditions.push(eq(walletBudgets.walletId, filter.walletId));
    }

    if (filter?.isActive !== undefined) {
      conditions.push(eq(walletBudgets.isActive, filter.isActive));
    }

    const budgets = await db.query.walletBudgets.findMany({
      where: and(...conditions),
      orderBy: [desc(walletBudgets.startDate), desc(walletBudgets.id)],
    });

    return budgets.map(toBudget);
  },

  async getBudgetById(id: string, userId: number): Promise<Budget> {
    const budget = await checkRecordExists<typeof walletBudgets.$inferSelect>({
      table: walletBudgets,
      idValue: id,
      scopeField: walletBudgets.userId,
      scopeValue: userId,
      notFoundMessage: 'Budget not found',
      forbiddenMessage: 'You do not have permission to access this budget',
    });

    return toBudget(budget);
  },

  async createBudget(userId: number, input: CreateBudgetInput): Promise<Budget> {
    const db = getDb();

    if (input.amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    if (new Date(input.startDate) > new Date(input.endDate)) {
      throw new BadRequestError('Start date cannot be greater than end date');
    }

    if (input.walletId) {
      await checkRecordExists({
        table: walletWallets,
        idValue: input.walletId,
        scopeField: walletWallets.userId,
        scopeValue: userId,
        notFoundMessage: 'Wallet not found',
        forbiddenMessage: 'You do not have permission to use this wallet',
      });
    }

    if (input.frequencyId) {
      await checkRecordExists({
        table: walletFrequencies,
        idValue: input.frequencyId,
        scopeField: walletFrequencies.userId,
        scopeValue: userId,
        notFoundMessage: 'Frequency not found',
        forbiddenMessage: 'You do not have permission to use this frequency',
      });
    }

    const amountValue = input.amount.toString();

    const [budget] = await db
      .insert(walletBudgets)
      .values({
        userId,
        walletId: input.walletId || null,
        frequencyId: input.frequencyId || null,
        name: input.name,
        description: input.description || null,
        icon: input.icon || null,
        amount: amountValue,
        balance: amountValue,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive ?? true,
      })
      .returning();

    return toBudget(budget);
  },

  async updateBudget(id: string, userId: number, input: UpdateBudgetInput): Promise<Budget> {
    const db = getDb();

    const currentBudget = await this.getBudgetById(id, userId);

    if (input.amount !== undefined && input.amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    const resultingStartDate = input.startDate ?? currentBudget.startDate;
    const resultingEndDate = input.endDate ?? currentBudget.endDate;

    if (new Date(resultingStartDate) > new Date(resultingEndDate)) {
      throw new BadRequestError('Start date cannot be greater than end date');
    }

    if (input.walletId !== undefined && input.walletId !== null) {
      await checkRecordExists({
        table: walletWallets,
        idValue: input.walletId,
        scopeField: walletWallets.userId,
        scopeValue: userId,
        notFoundMessage: 'Wallet not found',
        forbiddenMessage: 'You do not have permission to use this wallet',
      });
    }

    if (input.frequencyId !== undefined && input.frequencyId !== null) {
      await checkRecordExists({
        table: walletFrequencies,
        idValue: input.frequencyId,
        scopeField: walletFrequencies.userId,
        scopeValue: userId,
        notFoundMessage: 'Frequency not found',
        forbiddenMessage: 'You do not have permission to use this frequency',
      });
    }

    const updateData: Partial<typeof walletBudgets.$inferInsert> = {};

    if (input.walletId !== undefined) updateData.walletId = input.walletId;
    if (input.frequencyId !== undefined) updateData.frequencyId = input.frequencyId;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.amount !== undefined) updateData.amount = input.amount.toString();
    if (input.balance !== undefined) updateData.balance = input.balance.toString();
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.endDate !== undefined) updateData.endDate = input.endDate;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(walletBudgets)
      .set(updateData)
      .where(eq(walletBudgets.id, id))
      .returning();

    return toBudget(updated);
  },

  async deleteBudget(id: string, userId: number): Promise<boolean> {
    const db = getDb();

    await this.getBudgetById(id, userId);
    await db.delete(walletBudgets).where(eq(walletBudgets.id, id));

    return true;
  },

  async applyBudgetToExpenses(userId: number, input: ApplyBudgetToExpensesInput): Promise<boolean> {
    const db = getDb();

    await this.getBudgetById(input.budgetId, userId);

    await db.transaction(async (tx) => {
      if (input.scheduled) {
        const scheduledExpenses = await tx.query.walletScheduledExpenses.findMany({
          where: and(
            eq(walletScheduledExpenses.userId, userId),
            inArray(walletScheduledExpenses.id, input.expensesIds)
          ),
        });

        if (scheduledExpenses.length !== input.expensesIds.length) {
          throw new NotFoundError('One or more scheduled expenses were not found');
        }

        for (const scheduled of scheduledExpenses) {
          const previousBudgetId = scheduled.budgetId;

          if (previousBudgetId === input.budgetId) {
            continue;
          }

          if (scheduled.isPaid && scheduled.expenseId) {
            const [linkedExpense] = await tx
              .select()
              .from(walletExpenses)
              .where(eq(walletExpenses.id, scheduled.expenseId));

            if (!linkedExpense) {
              throw new NotFoundError('Linked expense not found for paid scheduled expense');
            }

            const effect = budgetEffect(
              parseFloat(linkedExpense.credit),
              parseFloat(linkedExpense.debit)
            );

            if (previousBudgetId) {
              await tx
                .update(walletBudgets)
                .set({ balance: sql`balance - ${effect}` })
                .where(eq(walletBudgets.id, previousBudgetId));
            }

            await tx
              .update(walletBudgets)
              .set({ balance: sql`balance + ${effect}` })
              .where(eq(walletBudgets.id, input.budgetId));

            await tx
              .update(walletExpenses)
              .set({ budgetId: input.budgetId, updatedAt: new Date() })
              .where(eq(walletExpenses.id, scheduled.expenseId));
          }

          await tx
            .update(walletScheduledExpenses)
            .set({ budgetId: input.budgetId, updatedAt: new Date() })
            .where(eq(walletScheduledExpenses.id, scheduled.id));
        }

        return;
      }

      const expenses = await tx.query.walletExpenses.findMany({
        where: and(
          eq(walletExpenses.userId, userId),
          inArray(walletExpenses.id, input.expensesIds)
        ),
      });

      if (expenses.length !== input.expensesIds.length) {
        throw new NotFoundError('One or more expenses were not found');
      }

      for (const expense of expenses) {
        const previousBudgetId = expense.budgetId;

        if (previousBudgetId === input.budgetId) {
          continue;
        }

        const effect = budgetEffect(parseFloat(expense.credit), parseFloat(expense.debit));

        if (previousBudgetId) {
          await tx
            .update(walletBudgets)
            .set({ balance: sql`balance - ${effect}` })
            .where(eq(walletBudgets.id, previousBudgetId));
        }

        await tx
          .update(walletBudgets)
          .set({ balance: sql`balance + ${effect}` })
          .where(eq(walletBudgets.id, input.budgetId));

        await tx
          .update(walletExpenses)
          .set({ budgetId: input.budgetId, updatedAt: new Date() })
          .where(eq(walletExpenses.id, expense.id));
      }
    });

    return true;
  },
};
