import { getDb } from '../shared/database/drizzle';
import {
  walletWallets,
  walletExpenses,
  walletTransfers,
  walletScheduledExpenses,
  walletExpenseCategories,
  walletBudgets,
  walletCreditCards,
  walletCreditCardCharges,
  walletCreditCardPayments,
  shoppingLists,
  items,
} from '../shared/database/schema';
import { and, eq } from 'drizzle-orm';
import type {
  WalletCleanSlateInput,
  WalletCleanSlateResult,
} from '../types/services/wallet-clean-slate.types';

/**
 * Clean slate protocol: el usuario elige qué datos de finanzas borrar o
 * reiniciar, y todo ocurre en una sola transacción: o se aplica entero o no se
 * aplica nada.
 *
 * Reglas que no son obvias:
 * - **Borrar movimientos no mueve los saldos.** `balance` de billeteras,
 *   `currentDebt` de tarjetas y `balance` de presupuestos son columnas que se
 *   mantienen con cada movimiento, no se recalculan del historial. Si se borra
 *   el historial, el dinero que dicen tener se queda igual. Para ponerlos en
 *   cero está `RESET_BALANCES`.
 * - **Borrar billeteras arrastra** por cascada sus movimientos, transferencias,
 *   programados y presupuestos. Por eso se marcan también aquí: así el conteo
 *   dice la verdad sobre lo que desapareció.
 * - **Las categorías de sistema se conservan.** No se pueden borrar ni una a
 *   una (`expenseCategoryService.deleteCategory`).
 */
export const walletCleanSlateService = {
  async cleanSlate(userId: number, input: WalletCleanSlateInput): Promise<WalletCleanSlateResult> {
    const wallets = input.wallets ?? 'KEEP';
    const creditCards = input.creditCards ?? 'KEEP';
    const borraBilleteras = wallets === 'DELETE';

    const transactions = !!input.transactions || borraBilleteras;
    const scheduledExpenses = !!input.scheduledExpenses || borraBilleteras;
    const budgets = !!input.budgets || borraBilleteras;

    const result: WalletCleanSlateResult = {
      transactions: 0,
      transfers: 0,
      creditCardCharges: 0,
      creditCardPayments: 0,
      scheduledExpenses: 0,
      categories: 0,
      budgets: 0,
      shoppingLists: 0,
      catalogItems: 0,
      walletsDeleted: 0,
      walletsReset: 0,
      creditCardsDeleted: 0,
      creditCardsReset: 0,
    };

    const db = getDb();

    await db.transaction(async (tx) => {
      // Los pagos y cargos de tarjeta van primero: si no, la cascada desde los
      // movimientos o las tarjetas los borraría sin contarlos.
      const borrarPagosYCargos = async () => {
        const pagos = await tx
          .delete(walletCreditCardPayments)
          .where(eq(walletCreditCardPayments.userId, userId))
          .returning({ id: walletCreditCardPayments.id });
        const cargos = await tx
          .delete(walletCreditCardCharges)
          .where(eq(walletCreditCardCharges.userId, userId))
          .returning({ id: walletCreditCardCharges.id });
        result.creditCardPayments += pagos.length;
        result.creditCardCharges += cargos.length;
      };

      if (transactions) {
        await borrarPagosYCargos();

        // Incluye los dos lados de cada transferencia.
        const movimientos = await tx
          .delete(walletExpenses)
          .where(eq(walletExpenses.userId, userId))
          .returning({ id: walletExpenses.id });
        result.transactions = movimientos.length;

        const transferencias = await tx
          .delete(walletTransfers)
          .where(eq(walletTransfers.userId, userId))
          .returning({ id: walletTransfers.id });
        result.transfers = transferencias.length;
      }

      if (scheduledExpenses) {
        const programados = await tx
          .delete(walletScheduledExpenses)
          .where(eq(walletScheduledExpenses.userId, userId))
          .returning({ id: walletScheduledExpenses.id });
        result.scheduledExpenses = programados.length;
      }

      if (budgets) {
        // Los cierres de presupuesto caen por cascada.
        const presupuestos = await tx
          .delete(walletBudgets)
          .where(eq(walletBudgets.userId, userId))
          .returning({ id: walletBudgets.id });
        result.budgets = presupuestos.length;
      }

      if (input.categories) {
        const categorias = await tx
          .delete(walletExpenseCategories)
          .where(
            and(
              eq(walletExpenseCategories.userId, userId),
              eq(walletExpenseCategories.isSystem, false)
            )
          )
          .returning({ id: walletExpenseCategories.id });
        result.categories = categorias.length;
      }

      if (input.shopping) {
        // Los ítems de cada lista caen por cascada.
        const listas = await tx
          .delete(shoppingLists)
          .where(eq(shoppingLists.userId, userId))
          .returning({ id: shoppingLists.id });
        const catalogo = await tx
          .delete(items)
          .where(eq(items.userId, userId))
          .returning({ id: items.id });
        result.shoppingLists = listas.length;
        result.catalogItems = catalogo.length;
      }

      if (creditCards === 'DELETE') {
        if (!transactions) await borrarPagosYCargos();
        const tarjetas = await tx
          .delete(walletCreditCards)
          .where(eq(walletCreditCards.userId, userId))
          .returning({ id: walletCreditCards.id });
        result.creditCardsDeleted = tarjetas.length;
      } else if (creditCards === 'RESET_BALANCES') {
        const tarjetas = await tx
          .update(walletCreditCards)
          .set({ currentDebt: '0', updatedAt: new Date() })
          .where(eq(walletCreditCards.userId, userId))
          .returning({ id: walletCreditCards.id });
        result.creditCardsReset = tarjetas.length;
      }

      if (wallets === 'DELETE') {
        const billeteras = await tx
          .delete(walletWallets)
          .where(eq(walletWallets.userId, userId))
          .returning({ id: walletWallets.id });
        result.walletsDeleted = billeteras.length;
      } else if (wallets === 'RESET_BALANCES') {
        const billeteras = await tx
          .update(walletWallets)
          .set({ balance: '0', initialBalance: '0', updatedAt: new Date() })
          .where(eq(walletWallets.userId, userId))
          .returning({ id: walletWallets.id });
        result.walletsReset = billeteras.length;
      }
    });

    return result;
  },
};
