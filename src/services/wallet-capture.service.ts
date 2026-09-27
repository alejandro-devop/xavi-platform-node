import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../shared/database/drizzle';
import { walletExpenseCategories, walletExpenses, walletWallets } from '../shared/database/schema';
import { BadRequestError } from '../shared/errors';
import { expenseService } from './expense.service';
import { walletCategoryHistoryService } from './wallet-category-history.service';
import { palabrasClave, suggestCategories } from './category-suggester';

export type CaptureSource = 'apple_pay' | 'siri' | 'shortcut';

export interface CaptureInput {
  amount: number;
  description: string;
  /** Id que genera el teléfono. El mismo ref no crea un segundo gasto. */
  ref: string;
  source: CaptureSource;
  /** YYYY-MM-DD del teléfono. Sin ella, hoy en el servidor. */
  date?: string;
  /** El nombre de la tarjeta que da Apple Pay («Bancolombia Débito»). */
  cardName?: string;
}

export interface CaptureResult {
  id: string;
  amount: number;
  description: string;
  walletName: string;
  categoryName: string | null;
  /** Ya existía un gasto con este ref: no se creó otro. */
  duplicate: boolean;
}

interface WalletRow {
  id: string;
  name: string;
  isMain: boolean;
}

/**
 * La billetera de una captura: la que más se parece al nombre de la tarjeta
 * («Bancolombia Débito» → «Bancolombia»); si no, la principal (★); si no, la
 * más antigua.
 */
export function pickWallet(wallets: WalletRow[], cardName?: string): WalletRow | undefined {
  if (wallets.length === 0) return undefined;
  if (cardName) {
    const tarjeta = new Set(palabrasClave(cardName));
    let mejor: WalletRow | undefined;
    let puntos = 0;
    for (const w of wallets) {
      const coinciden = palabrasClave(w.name).filter((p) => p.length >= 3 && tarjeta.has(p)).length;
      if (coinciden > puntos) {
        mejor = w;
        puntos = coinciden;
      }
    }
    if (mejor) return mejor;
  }
  return wallets.find((w) => w.isMain) ?? wallets[0];
}

/**
 * Anotar un gasto desde fuera de la app (Siri, la automatización de Apple Pay
 * en Atajos). No hay pantalla donde elegir nada, así que todo se decide aquí:
 * la billetera con [pickWallet] y la categoría con la primera sugerencia del
 * historial. Si nada se parece, el gasto queda sin categoría —mejor eso que
 * una inventada—.
 */
export const walletCaptureService = {
  async capture(userId: number, input: CaptureInput): Promise<CaptureResult> {
    const db = getDb();

    const [existente] = await db
      .select()
      .from(walletExpenses)
      .where(and(eq(walletExpenses.userId, userId), eq(walletExpenses.captureRef, input.ref)));
    if (existente) return this.resultado(existente, true);

    const wallets = await db
      .select({ id: walletWallets.id, name: walletWallets.name, isMain: walletWallets.isMain })
      .from(walletWallets)
      .where(eq(walletWallets.userId, userId))
      .orderBy(asc(walletWallets.createdAt));
    const wallet = pickWallet(wallets, input.cardName);
    if (!wallet) throw new BadRequestError('No wallet to capture the expense into');

    const categorias = await db
      .select({ id: walletExpenseCategories.id, name: walletExpenseCategories.name })
      .from(walletExpenseCategories)
      .where(
        and(eq(walletExpenseCategories.userId, userId), eq(walletExpenseCategories.type, 'expense'))
      );
    const historial = await walletCategoryHistoryService.history(userId);
    const [sugerida] = suggestCategories(input.description, historial, categorias, 1);

    const creado = await expenseService.createExpense(userId, {
      walletId: wallet.id,
      categoryId: sugerida?.categoryId ?? null,
      description: input.description,
      debit: input.amount,
      credit: 0,
      date: input.date,
    });

    const [marcado] = await db
      .update(walletExpenses)
      .set({ source: input.source, captureRef: input.ref })
      .where(eq(walletExpenses.id, creado.id))
      .returning();

    return this.resultado(marcado, false);
  },

  async resultado(
    expense: typeof walletExpenses.$inferSelect,
    duplicate: boolean
  ): Promise<CaptureResult> {
    const db = getDb();
    const [wallet] = await db
      .select({ name: walletWallets.name })
      .from(walletWallets)
      .where(eq(walletWallets.id, expense.walletId));
    const [categoria] = expense.categoryId
      ? await db
          .select({ name: walletExpenseCategories.name })
          .from(walletExpenseCategories)
          .where(eq(walletExpenseCategories.id, expense.categoryId))
      : [];
    return {
      id: expense.id,
      amount: parseFloat(String(expense.debit)),
      description: expense.description,
      walletName: wallet?.name ?? '',
      categoryName: categoria?.name ?? null,
      duplicate,
    };
  },
};
