import { gql } from 'graphql-tag';

export const creditCardTypeDefs = gql`
  type CreditCard {
    id: ID!
    userId: Int!
    name: String!
    icon: String
    creditLimit: Decimal!
    currentDebt: Decimal!
    availableCredit: Decimal!
    cutoffDay: Int!
    paymentDay: Int!
    createdAt: DateTime!
    updatedAt: DateTime!

    charges: [CreditCardCharge!]
  }

  type CreditCardCharge {
    id: ID!
    userId: Int!
    creditCardId: ID!
    categoryId: ID
    description: String!
    amount: Decimal!
    date: Date!
    createdAt: DateTime!
    updatedAt: DateTime!

    creditCard: CreditCard
    category: WalletExpenseCategory
  }

  type CreditCardPayment {
    id: ID!
    userId: Int!
    creditCardId: ID!
    expenseId: ID!
    amount: Decimal!
    paidDate: Date!
    createdAt: DateTime!

    creditCard: CreditCard
    expense: WalletExpense
  }

  type WalletUserSettings {
    userId: Int!
    creditCardPaymentCategoryId: ID
    periodCutoffDay: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input UpdateWalletUserSettingsInput {
    creditCardPaymentCategoryId: ID
    periodCutoffDay: Int
  }

  input CreateCreditCardInput {
    name: String!
    icon: String
    creditLimit: Decimal!
    cutoffDay: Int!
    paymentDay: Int!
  }

  input UpdateCreditCardInput {
    name: String
    icon: String
    creditLimit: Decimal
    cutoffDay: Int
    paymentDay: Int
  }

  input CreateCreditCardChargeInput {
    creditCardId: ID!
    categoryId: ID
    description: String!
    amount: Decimal!
    date: Date
  }

  input UpdateCreditCardChargeInput {
    creditCardId: ID
    categoryId: ID
    description: String
    amount: Decimal
    date: Date
  }

  input CreditCardChargesFilter {
    creditCardId: ID
    categoryId: ID
    startDate: Date
    endDate: Date
  }

  input PayCreditCardInput {
    creditCardId: ID!
    walletId: ID!
    amount: Decimal
    paidDate: Date
    categoryId: ID
  }

  extend type Query {
    creditCards: [CreditCard!]!
    creditCard(id: ID!): CreditCard!
    creditCardCharges(filter: CreditCardChargesFilter): [CreditCardCharge!]!
    creditCardCharge(id: ID!): CreditCardCharge!
    walletUserSettings: WalletUserSettings!
  }

  extend type Mutation {
    createCreditCard(input: CreateCreditCardInput!): CreditCard!
    updateCreditCard(id: ID!, input: UpdateCreditCardInput!): CreditCard!
    deleteCreditCard(id: ID!): Boolean!
    createCreditCardCharge(input: CreateCreditCardChargeInput!): CreditCardCharge!
    updateCreditCardCharge(id: ID!, input: UpdateCreditCardChargeInput!): CreditCardCharge!
    deleteCreditCardCharge(id: ID!): Boolean!
    payCreditCard(input: PayCreditCardInput!): CreditCardPayment!
    updateWalletUserSettings(input: UpdateWalletUserSettingsInput!): WalletUserSettings!
  }
`;
