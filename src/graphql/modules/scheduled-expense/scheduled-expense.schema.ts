import { gql } from 'graphql-tag';

export const scheduledExpenseTypeDefs = gql`
  type WalletScheduledExpense {
    id: ID!
    userId: ID!
    walletId: ID!
    categoryId: ID
    budgetId: ID
    frequencyId: ID
    description: String!
    amount: Decimal!
    date: Date!

    # Auto-generation
    parentId: ID

    # Payment tracking
    isPaid: Boolean!
    paidDate: DateTime
    expenseId: ID

    isIncome: Boolean!
    isOutcome: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    wallet: Wallet
    category: WalletExpenseCategory
    budget: WalletBudget
    frequency: WalletFrequency
    parent: WalletScheduledExpense
    children: [WalletScheduledExpense!]
    expense: WalletExpense
  }

  extend type Query {
    walletScheduledExpense(id: ID!): WalletScheduledExpense
    walletScheduledExpenses(
      walletId: ID
      categoryId: ID
      budgetId: ID
      isPaid: Boolean
      isIncome: Boolean
      isOutcome: Boolean
    ): [WalletScheduledExpense!]!
  }

  extend type Mutation {
    walletScheduledExpenseAdd(input: WalletScheduledExpenseInput!): WalletScheduledExpense!
    walletScheduledExpenseUpdate(
      id: ID!
      input: WalletScheduledExpenseUpdateInput!
    ): WalletScheduledExpense!
    walletScheduledExpenseRemove(id: ID!): Boolean!
    walletPayScheduled(input: PayScheduledInput!): WalletScheduledExpense!
    walletCancelScheduled(id: ID!): WalletScheduledExpense!
  }

  input WalletScheduledExpenseInput {
    walletId: ID!
    categoryId: ID
    budgetId: ID
    frequencyId: ID
    description: String!
    amount: Decimal!
    date: Date!
    isIncome: Boolean
    isOutcome: Boolean
  }

  input WalletScheduledExpenseUpdateInput {
    walletId: ID
    categoryId: ID
    budgetId: ID
    frequencyId: ID
    description: String
    amount: Decimal
    date: Date
    isIncome: Boolean
    isOutcome: Boolean
  }

  input PayScheduledInput {
    id: ID!
    date: Date
    debit: Decimal
    credit: Decimal
    walletId: ID
  }
`;
