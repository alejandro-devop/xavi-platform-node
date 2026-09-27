import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '../shared/database/drizzle';
import {
  walletCreditCardCharges,
  walletCreditCards,
  walletExpenseCategories,
  walletExpenses,
  walletWallets,
} from '../shared/database/schema';
import { BadRequestError } from '../shared/errors';
import { creditCardService } from './credit-card.service';
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
  /**
   * La billetera elegida: la que se nombró a Siri («…con Efectivo») o la que
   * el teléfono aprendió para esa tarjeta de Apple Pay. Manda sobre cardName.
   */
  walletId?: string;
  /**
   * Una tarjeta de crédito: entonces no es un gasto de billetera sino un
   * **cargo a la tarjeta** (sube la deuda, no baja ningún saldo).
   */
  creditCardId?: string;
}

export interface CaptureResult {
  id: string;
  amount: number;
  description: string;
  /** Dónde quedó: el nombre de la billetera o de la tarjeta. */
  walletName: string;
  kind: 'expense' | 'charge';
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

    const categorias = await db
      .select({ id: walletExpenseCategories.id, name: walletExpenseCategories.name })
      .from(walletExpenseCategories)
      .where(
        and(eq(walletExpenseCategories.userId, userId), eq(walletExpenseCategories.type, 'expense'))
      );
    const historial = await walletCategoryHistoryService.history(userId);
    const [sugerida] = suggestCategories(input.description, historial, categorias, 1);

    if (input.creditCardId) {
      return this.cargo(userId, input, sugerida?.categoryId ?? null);
    }

    const wallets = await db
      .select({ id: walletWallets.id, name: walletWallets.name, isMain: walletWallets.isMain })
      .from(walletWallets)
      .where(eq(walletWallets.userId, userId))
      .orderBy(asc(walletWallets.createdAt));
    const elegida = input.walletId ? wallets.find((w) => w.id === input.walletId) : undefined;
    if (input.walletId && !elegida) throw new BadRequestError('Wallet not found');
    const wallet = elegida ?? pickWallet(wallets, input.cardName);
    if (!wallet) throw new BadRequestError('No wallet to capture the expense into');

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
      kind: 'expense',
      categoryName: categoria?.name ?? null,
      duplicate,
    };
  },

  /**
   * Un cargo a la tarjeta de crédito. Los cargos no tienen `capture_ref` (sin
   * migración): un reintento se reconoce como el mismo cargo —tarjeta, monto,
   * descripción y fecha— creado en los últimos 30 minutos.
   */
  async cargo(
    userId: number,
    input: CaptureInput,
    categoryId: string | null
  ): Promise<CaptureResult> {
    const db = getDb();
    const [tarjeta] = await db
      .select({ id: walletCreditCards.id, name: walletCreditCards.name })
      .from(walletCreditCards)
      .where(
        and(eq(walletCreditCards.userId, userId), eq(walletCreditCards.id, input.creditCardId!))
      );
    if (!tarjeta) throw new BadRequestError('Credit card not found');

    const fecha = input.date ?? new Date().toISOString().split('T')[0];
    const [previo] = await db
      .select()
      .from(walletCreditCardCharges)
      .where(
        and(
          eq(walletCreditCardCharges.userId, userId),
          eq(walletCreditCardCharges.creditCardId, tarjeta.id),
          eq(walletCreditCardCharges.description, input.description),
          eq(walletCreditCardCharges.amount, input.amount.toFixed(2)),
          eq(walletCreditCardCharges.date, fecha),
          // En Postgres: created_at no tiene zona y una fecha de JS va en UTC.
          gte(walletCreditCardCharges.createdAt, sql`now() - interval '30 minutes'`)
        )
      );

    const charge =
      previo ??
      (await creditCardService.createCharge(userId, {
        creditCardId: tarjeta.id,
        categoryId,
        description: input.description,
        amount: input.amount,
        date: fecha,
      }));

    const catId = (charge as { categoryId?: string | null }).categoryId ?? null;
    const [categoria] = catId
      ? await db
          .select({ name: walletExpenseCategories.name })
          .from(walletExpenseCategories)
          .where(eq(walletExpenseCategories.id, catId))
      : [];
    return {
      id: charge.id,
      amount: input.amount,
      description: input.description,
      walletName: tarjeta.name,
      kind: 'charge',
      categoryName: categoria?.name ?? null,
      duplicate: Boolean(previo),
    };
  },
};
