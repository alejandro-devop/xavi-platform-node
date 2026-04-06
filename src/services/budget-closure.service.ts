import { and, eq, gte, lte } from 'drizzle-orm';
import { BadRequestError } from '../shared/errors';
import { getDb } from '../shared/database/drizzle';
import { walletBudgetClosures } from '../shared/database/schema';

export const budgetClosureService = {
  async isBudgetDateClosed(
    userId: number,
    budgetId: string,
    date: string,
    tx?: any
  ): Promise<boolean> {
    const db = tx || getDb();

    const records = await db.query.walletBudgetClosures.findMany({
      where: and(
        eq(walletBudgetClosures.userId, userId),
        eq(walletBudgetClosures.budgetId, budgetId),
        lte(walletBudgetClosures.periodStart, date),
        gte(walletBudgetClosures.periodEnd, date)
      ),
      limit: 1,
    });

    return records.length > 0;
  },

  async assertBudgetDateOpen(
    userId: number,
    budgetId: string | null | undefined,
    date: string,
    action: string,
    tx?: any
  ): Promise<void> {
    if (!budgetId) return;

    const isClosed = await this.isBudgetDateClosed(userId, budgetId, date, tx);
    if (isClosed) {
      throw new BadRequestError(`Cannot ${action}: budget period is closed`);
    }
  },
};
