/**
 * Clean slate: borra o reinicia de golpe los datos de finanzas del usuario.
 */

/** Qué hacer con billeteras o tarjetas. */
export type CleanSlateMode = 'KEEP' | 'RESET_BALANCES' | 'DELETE';

export interface WalletCleanSlateInput {
  /** Movimientos, transferencias, cargos y pagos de tarjeta. */
  transactions?: boolean;
  scheduledExpenses?: boolean;
  /** Solo las del usuario: las de sistema se conservan. */
  categories?: boolean;
  budgets?: boolean;
  /** Listas de compras y catálogo. */
  shopping?: boolean;
  wallets?: CleanSlateMode;
  creditCards?: CleanSlateMode;
}

export interface WalletCleanSlateResult {
  transactions: number;
  transfers: number;
  creditCardCharges: number;
  creditCardPayments: number;
  scheduledExpenses: number;
  categories: number;
  budgets: number;
  shoppingLists: number;
  catalogItems: number;
  walletsDeleted: number;
  walletsReset: number;
  creditCardsDeleted: number;
  creditCardsReset: number;
}
