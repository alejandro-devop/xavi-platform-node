import { gql } from 'graphql-tag';

export const expenseTypeDefs = gql`
  type WalletExpense {
    id: ID!
    userId: ID!
    walletId: ID!
    categoryId: ID
    budgetId: ID
    date: Date!
    description: String!
    debit: Decimal!
    credit: Decimal!
    isIncome: Boolean!
    isOutcome: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    wallet: Wallet
    category: WalletExpenseCategory
    budget: WalletBudget
  }

  extend type Query {
    walletExpense(id: ID!): WalletExpense
    walletExpenses(
      walletId: ID
      categoryId: ID
      budgetId: ID
      startDate: Date
      endDate: Date
      isIncome: Boolean
      isOutcome: Boolean
    ): [WalletExpense!]!
  }

  extend type Mutation {
    walletExpenseAdd(input: WalletExpenseInput!): WalletExpense!
    walletExpenseUpdate(id: ID!, input: WalletExpenseUpdateInput!): WalletExpense!
    walletExpenseRemove(id: ID!): Boolean!
  }

  input WalletExpenseInput {
    walletId: ID!
    categoryId: ID
    budgetId: ID
    date: Date!
    description: String!
    debit: Decimal
    credit: Decimal
    isIncome: Boolean
    isOutcome: Boolean
  }

  input WalletExpenseUpdateInput {
    walletId: ID
    categoryId: ID
    budgetId: ID
    date: Date
    description: String
    debit: Decimal
    credit: Decimal
    isIncome: Boolean
    isOutcome: Boolean
  }
`;
