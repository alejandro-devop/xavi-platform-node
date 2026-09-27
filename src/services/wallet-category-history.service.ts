import { getDb } from '../shared/database/drizzle';
import { walletExpenses, walletScheduledExpenses } from '../shared/database/schema';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import type { WalletCategoryHistoryEntry } from '../types/services/wallet-category-history.types';

/** Tope de filas: de sobra para sugerir y liviano para el teléfono. */
export const CATEGORY_HISTORY_LIMIT = 2000;

/**
 * Suma los usos de las dos fuentes por (descripción, categoría) y deja
 * primero lo usado más recientemente.
 */
export function mergeCategoryHistory(
  ...sources: WalletCategoryHistoryEntry[][]
): WalletCategoryHistoryEntry[] {
  const merged = new Map<string, WalletCategoryHistoryEntry>();
  for (const rows of sources) {
    for (const row of rows) {
      if (!row.description) continue;
      const key = `${row.description}\u0000${row.categoryId}`;
      const prev = merged.get(key);
      if (!prev) {
        merged.set(key, { ...row });
        continue;
      }
      prev.uses += row.uses;
      if (row.lastUsed > prev.lastUsed) prev.lastUsed = row.lastUsed;
    }
  }
  return [...merged.values()]
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed) || b.uses - a.uses)
    .slice(0, CATEGORY_HISTORY_LIMIT);
}

/**
 * Con qué categoría ha guardado el usuario cada descripción, en sus
 * movimientos y en sus programados. Solo lectura; la sugerencia en sí se
 * calcula en el cliente, sin volver a llamar al servidor por cada letra.
 *
 * Una serie de programados cuenta una vez (no una por mes): si no, un
 * arriendo mensual de hace años pesaría más que cualquier gasto real.
 */
export class WalletCategoryHistoryService {
  async history(userId: number): Promise<WalletCategoryHistoryEntry[]> {
    const db = getDb();

    const expenseDescription = sql<string>`lower(trim(${walletExpenses.description}))`;
    const expenses = await db
      .select({
        description: expenseDescription,
        categoryId: sql<string>`${walletExpenses.categoryId}`,
        uses: sql<number>`count(*)::int`,
        lastUsed: sql<string>`max(${walletExpenses.date})::text`,
      })
      .from(walletExpenses)
      .where(and(eq(walletExpenses.userId, userId), isNotNull(walletExpenses.categoryId)))
      .groupBy(expenseDescription, walletExpenses.categoryId);

    const scheduledDescription = sql<string>`lower(trim(${walletScheduledExpenses.description}))`;
    const scheduled = await db
      .select({
        description: scheduledDescription,
        categoryId: sql<string>`${walletScheduledExpenses.categoryId}`,
        uses: sql<number>`count(distinct coalesce(${walletScheduledExpenses.parentId}, ${walletScheduledExpenses.id}))::int`,
        lastUsed: sql<string>`max(${walletScheduledExpenses.dueDate})::text`,
      })
      .from(walletScheduledExpenses)
      .where(
        and(
          eq(walletScheduledExpenses.userId, userId),
          isNotNull(walletScheduledExpenses.categoryId)
        )
      )
      .groupBy(scheduledDescription, walletScheduledExpenses.categoryId);

    return mergeCategoryHistory(expenses, scheduled);
  }
}

export const walletCategoryHistoryService = new WalletCategoryHistoryService();
