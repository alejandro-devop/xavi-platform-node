import { creditCardService } from '../../../services/credit-card.service';
import { expenseCategoryService } from '../../../services/expense-category.service';
import { expenseService } from '../../../services/expense.service';
import { withErrorHandling, requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  creditCardIdSchema,
  creditCardChargeIdSchema,
  createCreditCardInputSchema,
  updateCreditCardInputSchema,
  createCreditCardChargeInputSchema,
  updateCreditCardChargeInputSchema,
  creditCardChargesFilterArgsSchema,
  payCreditCardInputSchema,
  updateWalletUserSettingsInputSchema,
} from '../../../validators/schemas/credit-card.schemas';

export const creditCardResolvers = {
  Query: {
    creditCards: withErrorHandling(async (_: any, __: any, context: any) => {
      requireAuth(context, 'creditCards');
      return await creditCardService.getCreditCards(context.user.id);
    }, 'creditCards'),

    creditCard: withValidatedResolver(
      creditCardIdSchema,
      async (_: any, { id }: { id: string }, context: any) => {
        requireAuth(context, 'creditCard');
        return await creditCardService.getCreditCardById(id, context.user.id);
      },
      'creditCard'
    ),

    creditCardCharges: withValidatedResolver(
      creditCardChargesFilterArgsSchema,
      async (_: any, { filter }: { filter?: any }, context: any) => {
        requireAuth(context, 'creditCardCharges');
        return await creditCardService.getCharges(context.user.id, filter);
      },
      'creditCardCharges'
    ),

    creditCardCharge: withValidatedResolver(
      creditCardChargeIdSchema,
      async (_: any, { id }: { id: string }, context: any) => {
        requireAuth(context, 'creditCardCharge');
        return await creditCardService.getChargeById(id, context.user.id);
      },
      'creditCardCharge'
    ),

    walletUserSettings: withErrorHandling(async (_: any, __: any, context: any) => {
      requireAuth(context, 'walletUserSettings');
      return await creditCardService.getWalletSettings(context.user.id);
    }, 'walletUserSettings'),
  },

  Mutation: {
    createCreditCard: withValidatedResolver(
      createCreditCardInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'createCreditCard');
        return await creditCardService.createCreditCard(context.user.id, input);
      },
      'createCreditCard'
    ),

    updateCreditCard: withValidatedResolver(
      updateCreditCardInputSchema,
      async (_: any, { id, input }: any, context: any) => {
        requireAuth(context, 'updateCreditCard');
        return await creditCardService.updateCreditCard(id, context.user.id, input);
      },
      'updateCreditCard'
    ),

    deleteCreditCard: withValidatedResolver(
      creditCardIdSchema,
      async (_: any, { id }: any, context: any) => {
        requireAuth(context, 'deleteCreditCard');
        return await creditCardService.deleteCreditCard(id, context.user.id);
      },
      'deleteCreditCard'
    ),

    createCreditCardCharge: withValidatedResolver(
      createCreditCardChargeInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'createCreditCardCharge');
        return await creditCardService.createCharge(context.user.id, input);
      },
      'createCreditCardCharge'
    ),

    updateCreditCardCharge: withValidatedResolver(
      updateCreditCardChargeInputSchema,
      async (_: any, { id, input }: any, context: any) => {
        requireAuth(context, 'updateCreditCardCharge');
        return await creditCardService.updateCharge(id, context.user.id, input);
      },
      'updateCreditCardCharge'
    ),

    deleteCreditCardCharge: withValidatedResolver(
      creditCardChargeIdSchema,
      async (_: any, { id }: any, context: any) => {
        requireAuth(context, 'deleteCreditCardCharge');
        return await creditCardService.deleteCharge(id, context.user.id);
      },
      'deleteCreditCardCharge'
    ),

    payCreditCard: withValidatedResolver(
      payCreditCardInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'payCreditCard');
        return await creditCardService.payCreditCard(context.user.id, input);
      },
      'payCreditCard'
    ),

    updateWalletUserSettings: withValidatedResolver(
      updateWalletUserSettingsInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'updateWalletUserSettings');
        return await creditCardService.updateWalletSettings(context.user.id, input);
      },
      'updateWalletUserSettings'
    ),
  },

  CreditCard: {
    availableCredit: (parent: any) => {
      const limit = parseFloat(parent.creditLimit);
      const debt = parseFloat(parent.currentDebt);
      return Math.max(limit - debt, 0);
    },

    charges: async (parent: any, _: any, context: any) => {
      try {
        return await creditCardService.getCharges(context.user.id, {
          creditCardId: parent.id,
        });
      } catch {
        return [];
      }
    },
  },

  CreditCardCharge: {
    creditCard: async (parent: any, _: any, context: any) => {
      if (!parent.creditCardId) return null;
      try {
        return await creditCardService.getCreditCardById(parent.creditCardId, context.user.id);
      } catch {
        return null;
      }
    },

    category: async (parent: any, _: any, context: any) => {
      if (!parent.categoryId) return null;
      try {
        return await expenseCategoryService.getCategoryById(parent.categoryId, context.user.id);
      } catch {
        return null;
      }
    },
  },

  CreditCardPayment: {
    creditCard: async (parent: any, _: any, context: any) => {
      if (!parent.creditCardId) return null;
      try {
        return await creditCardService.getCreditCardById(parent.creditCardId, context.user.id);
      } catch {
        return null;
      }
    },

    expense: async (parent: any, _: any, context: any) => {
      if (!parent.expenseId) return null;
      try {
        return await expenseService.getExpenseById(parent.expenseId, context.user.id);
      } catch {
        return null;
      }
    },
  },
};
