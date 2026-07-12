export interface CreditCard {
  id: string;
  userId: number;
  name: string;
  icon?: string | null;
  creditLimit: number;
  currentDebt: number;
  cutoffDay: number;
  paymentDay: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCardCharge {
  id: string;
  userId: number;
  creditCardId: string;
  categoryId?: string | null;
  description: string;
  amount: number;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCardPayment {
  id: string;
  userId: number;
  creditCardId: string;
  expenseId: string;
  amount: number;
  paidDate: string;
  createdAt: Date;
}

export interface WalletUserSettings {
  userId: number;
  creditCardPaymentCategoryId?: string | null;
  periodCutoffDay?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateWalletUserSettingsInput {
  creditCardPaymentCategoryId?: string | null;
  periodCutoffDay?: number | null;
}

export interface CreateCreditCardInput {
  name: string;
  icon?: string | null;
  creditLimit: number;
  cutoffDay: number;
  paymentDay: number;
}

export interface UpdateCreditCardInput {
  name?: string;
  icon?: string | null;
  creditLimit?: number;
  cutoffDay?: number;
  paymentDay?: number;
}

export interface CreateCreditCardChargeInput {
  creditCardId: string;
  categoryId?: string | null;
  description: string;
  amount: number;
  date?: string;
}

export interface UpdateCreditCardChargeInput {
  creditCardId?: string;
  categoryId?: string | null;
  description?: string;
  amount?: number;
  date?: string;
}

export interface GetCreditCardChargesFilter {
  creditCardId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PayCreditCardInput {
  creditCardId: string;
  walletId: string;
  amount?: number;
  paidDate?: string;
  categoryId?: string | null;
}
