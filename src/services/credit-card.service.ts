import { getDb } from '../shared/database/drizzle';
import {
  walletCreditCards,
  walletCreditCardCharges,
  walletCreditCardPayments,
  walletUserSettings,
  walletWallets,
  walletExpenseCategories,
  walletExpenses,
} from '../shared/database/schema';
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { BadRequestError } from '../shared/errors';
import { checkRecordExists } from '../shared/utils/db-validators';
import { balanceStrategies, updateBalances } from '../shared/utils/balance-strategies';
import type {
  CreditCard,
  CreditCardCharge,
  CreditCardPayment,
  WalletUserSettings,
  UpdateWalletUserSettingsInput,
  CreateCreditCardInput,
  UpdateCreditCardInput,
  CreateCreditCardChargeInput,
  UpdateCreditCardChargeInput,
  GetCreditCardChargesFilter,
  PayCreditCardInput,
} from '../types/services/credit-card.types';

const mapCreditCard = (card: typeof walletCreditCards.$inferSelect): CreditCard => ({
  ...card,
  creditLimit: parseFloat(card.creditLimit),
  currentDebt: parseFloat(card.currentDebt),
});

const mapCharge = (charge: typeof walletCreditCardCharges.$inferSelect): CreditCardCharge => ({
  ...charge,
  amount: parseFloat(charge.amount),
});

const mapPayment = (payment: typeof walletCreditCardPayments.$inferSelect): CreditCardPayment => ({
  ...payment,
  amount: parseFloat(payment.amount),
});

async function getOrCreateWalletSettings(
  userId: number
): Promise<WalletUserSettings> {
  const db = getDb();
  const existing = await db.query.walletUserSettings.findFirst({
    where: eq(walletUserSettings.userId, userId),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(walletUserSettings)
    .values({ userId })
    .returning();

  return created;
}

async function verifyCategory(userId: number, categoryId: string) {
  await checkRecordExists({
    table: walletExpenseCategories,
    idValue: categoryId,
    scopeField: walletExpenseCategories.userId,
    scopeValue: userId,
    notFoundMessage: 'Category not found',
    forbiddenMessage: 'You do not have permission to use this category',
  });
}

export const creditCardService = {
  async getWalletSettings(userId: number): Promise<WalletUserSettings> {
    return getOrCreateWalletSettings(userId);
  },

  async updateWalletSettings(
    userId: number,
    input: UpdateWalletUserSettingsInput
  ): Promise<WalletUserSettings> {
    const db = getDb();
    await getOrCreateWalletSettings(userId);

    const updateData: Partial<typeof walletUserSettings.$inferInsert> = {};
    if (input.creditCardPaymentCategoryId !== undefined) {
      if (input.creditCardPaymentCategoryId !== null) {
        await verifyCategory(userId, input.creditCardPaymentCategoryId);
      }
      updateData.creditCardPaymentCategoryId = input.creditCardPaymentCategoryId;
    }
    if (input.periodCutoffDay !== undefined) {
      updateData.periodCutoffDay = input.periodCutoffDay;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updateData.updatedAt = new Date();

    const [settings] = await db
      .update(walletUserSettings)
      .set(updateData)
      .where(eq(walletUserSettings.userId, userId))
      .returning();

    return settings;
  },

  async getCreditCards(userId: number): Promise<CreditCard[]> {
    const db = getDb();
    const cards = await db.query.walletCreditCards.findMany({
      where: eq(walletCreditCards.userId, userId),
      orderBy: [asc(walletCreditCards.name)],
    });
    return cards.map(mapCreditCard);
  },

  async getCreditCardById(id: string, userId: number): Promise<CreditCard> {
    const card = await checkRecordExists({
      table: walletCreditCards,
      idValue: id,
      scopeField: walletCreditCards.userId,
      scopeValue: userId,
      notFoundMessage: 'Credit card not found',
      forbiddenMessage: 'You do not have permission to access this credit card',
    });
    return mapCreditCard(card);
  },

  async createCreditCard(userId: number, input: CreateCreditCardInput): Promise<CreditCard> {
    const db = getDb();
    const [card] = await db
      .insert(walletCreditCards)
      .values({
        userId,
        name: input.name,
        icon: input.icon || null,
        creditLimit: input.creditLimit.toString(),
        currentDebt: '0',
        cutoffDay: input.cutoffDay,
        paymentDay: input.paymentDay,
      })
      .returning();
    return mapCreditCard(card);
  },

  async updateCreditCard(
    id: string,
    userId: number,
    input: UpdateCreditCardInput
  ): Promise<CreditCard> {
    const db = getDb();
    await this.getCreditCardById(id, userId);

    const updateData: Partial<typeof walletCreditCards.$inferInsert> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.creditLimit !== undefined) updateData.creditLimit = input.creditLimit.toString();
    if (input.cutoffDay !== undefined) updateData.cutoffDay = input.cutoffDay;
    if (input.paymentDay !== undefined) updateData.paymentDay = input.paymentDay;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updateData.updatedAt = new Date();

    const [card] = await db
      .update(walletCreditCards)
      .set(updateData)
      .where(eq(walletCreditCards.id, id))
      .returning();

    return mapCreditCard(card);
  },

  async deleteCreditCard(id: string, userId: number): Promise<boolean> {
    const db = getDb();
    await this.getCreditCardById(id, userId);
    await db.delete(walletCreditCards).where(eq(walletCreditCards.id, id));
    return true;
  },

  async getCharges(
    userId: number,
    filter?: GetCreditCardChargesFilter
  ): Promise<CreditCardCharge[]> {
    const db = getDb();
    const conditions = [eq(walletCreditCardCharges.userId, userId)];

    if (filter?.creditCardId) {
      conditions.push(eq(walletCreditCardCharges.creditCardId, filter.creditCardId));
    }
    if (filter?.categoryId) {
      conditions.push(eq(walletCreditCardCharges.categoryId, filter.categoryId));
    }
    if (filter?.startDate) {
      conditions.push(gte(walletCreditCardCharges.date, filter.startDate));
    }
    if (filter?.endDate) {
      conditions.push(lte(walletCreditCardCharges.date, filter.endDate));
    }

    const charges = await db.query.walletCreditCardCharges.findMany({
      where: and(...conditions),
      orderBy: [desc(walletCreditCardCharges.date), desc(walletCreditCardCharges.id)],
    });

    return charges.map(mapCharge);
  },

  async getChargeById(id: string, userId: number): Promise<CreditCardCharge> {
    const charge = await checkRecordExists({
      table: walletCreditCardCharges,
      idValue: id,
      scopeField: walletCreditCardCharges.userId,
      scopeValue: userId,
      notFoundMessage: 'Credit card charge not found',
      forbiddenMessage: 'You do not have permission to access this charge',
    });
    return mapCharge(charge);
  },

  async createCharge(
    userId: number,
    input: CreateCreditCardChargeInput
  ): Promise<CreditCardCharge> {
    const db = getDb();

    await this.getCreditCardById(input.creditCardId, userId);

    if (input.amount <= 0) {
      throw new BadRequestError('Charge amount must be greater than zero');
    }

    if (input.categoryId) {
      await verifyCategory(userId, input.categoryId);
    }

    const result = await db.transaction(async (tx) => {
      const [charge] = await tx
        .insert(walletCreditCardCharges)
        .values({
          userId,
          creditCardId: input.creditCardId,
          categoryId: input.categoryId || null,
          description: input.description,
          amount: input.amount.toString(),
          date: input.date || new Date().toISOString().split('T')[0],
        })
        .returning();

      await tx
        .update(walletCreditCards)
        .set({
          currentDebt: sql`${walletCreditCards.currentDebt} + ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(walletCreditCards.id, input.creditCardId));

      return charge;
    });

    return mapCharge(result);
  },

  async updateCharge(
    id: string,
    userId: number,
    input: UpdateCreditCardChargeInput
  ): Promise<CreditCardCharge> {
    const db = getDb();
    const existing = await this.getChargeById(id, userId);

    if (input.creditCardId !== undefined && input.creditCardId !== existing.creditCardId) {
      await this.getCreditCardById(input.creditCardId, userId);
    }

    if (input.categoryId !== undefined && input.categoryId !== null) {
      await verifyCategory(userId, input.categoryId);
    }

    if (input.amount !== undefined && input.amount <= 0) {
      throw new BadRequestError('Charge amount must be greater than zero');
    }

    const result = await db.transaction(async (tx) => {
      if (input.amount !== undefined && input.amount !== existing.amount) {
        const delta = input.amount - existing.amount;
        const cardId = input.creditCardId || existing.creditCardId;

        if (delta > 0) {
          await tx
            .update(walletCreditCards)
            .set({
              currentDebt: sql`${walletCreditCards.currentDebt} + ${delta}`,
              updatedAt: new Date(),
            })
            .where(eq(walletCreditCards.id, cardId));
        } else if (delta < 0) {
          await tx
            .update(walletCreditCards)
            .set({
              currentDebt: sql`${walletCreditCards.currentDebt} - ${Math.abs(delta)}`,
              updatedAt: new Date(),
            })
            .where(eq(walletCreditCards.id, cardId));
        }
      }

      const updateData: Partial<typeof walletCreditCardCharges.$inferInsert> = {};
      if (input.creditCardId !== undefined) updateData.creditCardId = input.creditCardId;
      if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.amount !== undefined) updateData.amount = input.amount.toString();
      if (input.date !== undefined) updateData.date = input.date;
      updateData.updatedAt = new Date();

      const [charge] = await tx
        .update(walletCreditCardCharges)
        .set(updateData)
        .where(eq(walletCreditCardCharges.id, id))
        .returning();

      return charge;
    });

    return mapCharge(result);
  },

  async deleteCharge(id: string, userId: number): Promise<boolean> {
    const db = getDb();
    const existing = await this.getChargeById(id, userId);

    await db.transaction(async (tx) => {
      await tx
        .update(walletCreditCards)
        .set({
          currentDebt: sql`GREATEST(${walletCreditCards.currentDebt} - ${existing.amount}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(walletCreditCards.id, existing.creditCardId));

      await tx.delete(walletCreditCardCharges).where(eq(walletCreditCardCharges.id, id));
    });

    return true;
  },

  async payCreditCard(
    userId: number,
    input: PayCreditCardInput
  ): Promise<CreditCardPayment> {
    const db = getDb();
    const card = await this.getCreditCardById(input.creditCardId, userId);

    const paymentAmount = input.amount ?? card.currentDebt;
    const paidDate = input.paidDate || new Date().toISOString().split('T')[0];

    if (paymentAmount <= 0) {
      throw new BadRequestError('Payment amount must be greater than zero');
    }

    if (paymentAmount > card.currentDebt) {
      throw new BadRequestError('Payment amount cannot exceed current debt');
    }

    await checkRecordExists({
      table: walletWallets,
      idValue: input.walletId,
      scopeField: walletWallets.userId,
      scopeValue: userId,
      notFoundMessage: 'Wallet not found',
      forbiddenMessage: 'You do not have permission to pay from this wallet',
    });

    const settings = await getOrCreateWalletSettings(userId);
    const categoryId = input.categoryId ?? settings.creditCardPaymentCategoryId;

    if (!categoryId) {
      throw new BadRequestError(
        'A category is required for credit card payments. Please select one.'
      );
    }

    await verifyCategory(userId, categoryId);

    const description = `Pago a tarjeta de crédito - ${card.name}`;

    const result = await db.transaction(async (tx) => {
      const [expense] = await tx
        .insert(walletExpenses)
        .values({
          userId,
          walletId: input.walletId,
          categoryId,
          budgetId: null,
          debit: paymentAmount.toString(),
          credit: '0',
          description,
          date: paidDate,
          isIncome: false,
          isOutcome: true,
        })
        .returning();

      await updateBalances(balanceStrategies.apply, {
        tx,
        walletId: input.walletId,
        budgetId: null,
        credit: 0,
        debit: paymentAmount,
      });

      const [payment] = await tx
        .insert(walletCreditCardPayments)
        .values({
          userId,
          creditCardId: input.creditCardId,
          expenseId: expense.id,
          amount: paymentAmount.toString(),
          paidDate,
        })
        .returning();

      await tx
        .update(walletCreditCards)
        .set({
          currentDebt: sql`GREATEST(${walletCreditCards.currentDebt} - ${paymentAmount}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(walletCreditCards.id, input.creditCardId));

      if (input.categoryId) {
        await tx
          .insert(walletUserSettings)
          .values({
            userId,
            creditCardPaymentCategoryId: input.categoryId,
          })
          .onConflictDoUpdate({
            target: walletUserSettings.userId,
            set: {
              creditCardPaymentCategoryId: input.categoryId,
              updatedAt: new Date(),
            },
          });
      }

      return payment;
    });

    return mapPayment(result);
  },
};
