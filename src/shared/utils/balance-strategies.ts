import { sql, eq } from 'drizzle-orm';
import { walletWallets, walletBudgets } from '../database/schema';
import { Strategy, executeStrategy } from '../patterns/strategy';

/**
 * Parameters for balance update operations
 */
export interface BalanceUpdateParams {
  /** Drizzle transaction object */
  tx: any;
  /** ID of the wallet to update */
  walletId: string;
  /** Optional budget ID to update */
  budgetId?: string | null;
  /** Credit amount (money in) */
  credit: number;
  /** Debit amount (money out) */
  debit: number;
}

/**
 * Strategy interface for balance updates
 * Uses generic Strategy pattern with BalanceUpdateParams
 */
export interface BalanceUpdateStrategy extends Strategy<BalanceUpdateParams, void> {
  /**
   * Update wallet balance
   */
  updateWalletBalance(params: BalanceUpdateParams): Promise<void>;

  /**
   * Update budget balance if budgetId is provided
   */
  updateBudgetBalance(params: BalanceUpdateParams): Promise<void>;
}

/**
 * Strategy to apply balance changes (add expense/income)
 *
 * Wallet: balance += credit - debit
 * Budget: balance += debit - credit (tracks spending against budget)
 *
 * Use cases:
 * - Creating a new expense
 * - Applying updated expense values
 * - Recording a bill payment
 */
export class ApplyBalanceStrategy implements BalanceUpdateStrategy {
  /**
   * Execute the strategy (required by Strategy interface)
   */
  async execute(params: BalanceUpdateParams): Promise<void> {
    await this.updateWalletBalance(params);
    await this.updateBudgetBalance(params);
  }

  async updateWalletBalance(params: BalanceUpdateParams): Promise<void> {
    // Wallet balance: income adds, expenses subtract
    const balanceChange = params.credit - params.debit;

    await params.tx
      .update(walletWallets)
      .set({ balance: sql`balance + ${balanceChange}` })
      .where(eq(walletWallets.id, params.walletId));
  }

  async updateBudgetBalance(params: BalanceUpdateParams): Promise<void> {
    if (!params.budgetId) return;

    // Budget balance: spending reduces available budget
    const budgetBalanceChange = params.debit - params.credit;

    await params.tx
      .update(walletBudgets)
      .set({ balance: sql`balance + ${budgetBalanceChange}` })
      .where(eq(walletBudgets.id, params.budgetId));
  }
}

/**
 * Strategy to reverse balance changes (undo expense/income)
 *
 * Wallet: balance -= credit - debit
 * Budget: balance -= debit - credit
 *
 * Use cases:
 * - Deleting an expense
 * - Reverting old values before applying new ones in update
 * - Canceling a transaction
 */
export class ReverseBalanceStrategy implements BalanceUpdateStrategy {
  /**
   * Execute the strategy (required by Strategy interface)
   */
  async execute(params: BalanceUpdateParams): Promise<void> {
    await this.updateWalletBalance(params);
    await this.updateBudgetBalance(params);
  }

  async updateWalletBalance(params: BalanceUpdateParams): Promise<void> {
    // Reverse the balance change
    const balanceChange = params.credit - params.debit;

    await params.tx
      .update(walletWallets)
      .set({ balance: sql`balance - ${balanceChange}` })
      .where(eq(walletWallets.id, params.walletId));
  }

  async updateBudgetBalance(params: BalanceUpdateParams): Promise<void> {
    if (!params.budgetId) return;

    // Reverse the budget balance change
    const budgetBalanceChange = params.debit - params.credit;

    await params.tx
      .update(walletBudgets)
      .set({ balance: sql`balance - ${budgetBalanceChange}` })
      .where(eq(walletBudgets.id, params.budgetId));
  }
}

/**
 * Execute a balance update strategy
 *
 * @param strategy - The strategy to execute (apply or reverse)
 * @param params - Parameters for the update
 *
 * @example
 * // Apply balance changes for new expense
 * await updateBalances(balanceStrategies.apply, {
 *   tx,
 *   walletId: 'wallet-uuid',
 *   budgetId: 'budget-uuid',
 *   credit: 0,
 *   debit: 50,
 * });
 *
 * @example
 * // Reverse balance changes when deleting
 * await updateBalances(balanceStrategies.reverse, {
 *   tx,
 *   walletId: expense.walletId,
 *   budgetId: expense.budgetId,
 *   credit: expense.credit,
 *   debit: expense.debit,
 * });
 */
export async function updateBalances(
  strategy: BalanceUpdateStrategy,
  params: BalanceUpdateParams
): Promise<void> {
  // Use the generic strategy executor
  await executeStrategy(strategy, params);
}

/**
 * Pre-instantiated strategies for convenience
 *
 * Note: We use explicit BalanceUpdateStrategy type instead of generic
 * StrategyCollection to preserve the specific methods (updateWalletBalance, updateBudgetBalance)
 *
 * @example
 * import { balanceStrategies, updateBalances } from './balance-strategies';
 *
 * await updateBalances(balanceStrategies.apply, params);
 * await updateBalances(balanceStrategies.reverse, params);
 */
export const balanceStrategies: Record<string, BalanceUpdateStrategy> = {
  /** Apply balance changes (create/update) */
  apply: new ApplyBalanceStrategy(),
  /** Reverse balance changes (delete/revert) */
  reverse: new ReverseBalanceStrategy(),
};
