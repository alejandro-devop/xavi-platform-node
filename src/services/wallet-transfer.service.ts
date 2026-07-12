import { getDb } from '../shared/database/drizzle';
import { walletExpenses, walletTransfers, walletWallets } from '../shared/database/schema';
import { eq, and } from 'drizzle-orm';
import { BadRequestError } from '../shared/errors';
import { checkRecordExists } from '../shared/utils/db-validators';
import { balanceStrategies, updateBalances } from '../shared/utils/balance-strategies';
import type {
  WalletTransfer,
  CreateWalletTransferInput,
} from '../types/services/wallet-transfer.types';

const mapTransfer = (row: typeof walletTransfers.$inferSelect): WalletTransfer => ({
  ...row,
  amount: parseFloat(row.amount),
});

export const walletTransferService = {
  async getTransferById(id: string, userId: number): Promise<WalletTransfer> {
    const transfer = await checkRecordExists({
      table: walletTransfers,
      idValue: id,
      scopeField: walletTransfers.userId,
      scopeValue: userId,
      notFoundMessage: 'Transfer not found',
      forbiddenMessage: 'You do not have permission to access this transfer',
    });

    return mapTransfer(transfer);
  },

  async createTransfer(
    userId: number,
    input: CreateWalletTransferInput
  ): Promise<WalletTransfer> {
    const db = getDb();

    if (input.fromWalletId === input.toWalletId) {
      throw new BadRequestError('Source and destination wallets must be different');
    }

    const fromWallet = await checkRecordExists({
      table: walletWallets,
      idValue: input.fromWalletId,
      scopeField: walletWallets.userId,
      scopeValue: userId,
      notFoundMessage: 'Source wallet not found',
      forbiddenMessage: 'You do not have permission to transfer from this wallet',
    });

    await checkRecordExists({
      table: walletWallets,
      idValue: input.toWalletId,
      scopeField: walletWallets.userId,
      scopeValue: userId,
      notFoundMessage: 'Destination wallet not found',
      forbiddenMessage: 'You do not have permission to transfer to this wallet',
    });

    const fromBalance = parseFloat(fromWallet.balance);
    if (fromBalance < input.amount) {
      throw new BadRequestError('Insufficient balance in source wallet');
    }

    const transferDate = input.date || new Date().toISOString().split('T')[0];

    const [toWallet, fromWalletRecord] = await Promise.all([
      db.query.walletWallets.findFirst({
        where: eq(walletWallets.id, input.toWalletId),
        columns: { name: true },
      }),
      db.query.walletWallets.findFirst({
        where: eq(walletWallets.id, input.fromWalletId),
        columns: { name: true },
      }),
    ]);

    const toWalletName = toWallet?.name || 'billetera';
    const fromWalletName = fromWalletRecord?.name || 'billetera';
    const description =
      input.description?.trim() || `Transferencia a ${toWalletName}`;

    const result = await db.transaction(async (tx) => {
      const [transfer] = await tx
        .insert(walletTransfers)
        .values({
          userId,
          fromWalletId: input.fromWalletId,
          toWalletId: input.toWalletId,
          amount: input.amount.toString(),
          date: transferDate,
          description,
        })
        .returning();

      await tx
        .insert(walletExpenses)
        .values({
          userId,
          walletId: input.fromWalletId,
          categoryId: null,
          budgetId: null,
          debit: input.amount.toString(),
          credit: '0',
          description,
          date: transferDate,
          isIncome: false,
          isOutcome: true,
          transferId: transfer.id,
        });

      await tx.insert(walletExpenses).values({
        userId,
        walletId: input.toWalletId,
        categoryId: null,
        budgetId: null,
        debit: '0',
        credit: input.amount.toString(),
        description: `Transferencia desde ${fromWalletName}`,
        date: transferDate,
        isIncome: true,
        isOutcome: false,
        transferId: transfer.id,
      });

      await updateBalances(balanceStrategies.apply, {
        tx,
        walletId: input.fromWalletId,
        budgetId: null,
        credit: 0,
        debit: input.amount,
      });

      await updateBalances(balanceStrategies.apply, {
        tx,
        walletId: input.toWalletId,
        budgetId: null,
        credit: input.amount,
        debit: 0,
      });

      return { transfer };
    });

    return mapTransfer(result.transfer);
  },

  async deleteTransfer(id: string, userId: number): Promise<boolean> {
    const db = getDb();
    const transfer = await this.getTransferById(id, userId);

    const linkedExpenses = await db.query.walletExpenses.findMany({
      where: and(eq(walletExpenses.transferId, id), eq(walletExpenses.userId, userId)),
    });

    if (linkedExpenses.length !== 2) {
      throw new BadRequestError('Transfer expenses are inconsistent and cannot be deleted');
    }

    await db.transaction(async (tx) => {
      for (const expense of linkedExpenses) {
        await updateBalances(balanceStrategies.reverse, {
          tx,
          walletId: expense.walletId,
          budgetId: expense.budgetId,
          credit: parseFloat(expense.credit),
          debit: parseFloat(expense.debit),
        });
      }

      await tx.delete(walletExpenses).where(eq(walletExpenses.transferId, id));
      await tx.delete(walletTransfers).where(eq(walletTransfers.id, transfer.id));
    });

    return true;
  },
};
