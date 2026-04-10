import { gql } from 'graphql-tag';

export const scheduledExpenseTypeDefs = gql`
  enum RepeatType {
    none
    daily
    weekly
    biweekly
    monthly
  }

  type ScheduledExpense {
    id: ID!
    userId: Int!
    walletId: ID!
    categoryId: ID
    budgetId: ID
    parentId: ID
    expenseId: ID
    amount: Float!
    description: String!
    dueDate: String!
    isPaid: Boolean!
    paidDate: String
    repeatType: RepeatType
    endDate: String
    createdAt: String!
    updatedAt: String!

    # Relations
    wallet: Wallet
    category: WalletExpenseCategory
    budget: WalletBudget
    parent: ScheduledExpense
    expense: WalletExpense
  }

  input CreateScheduledExpenseInput {
    walletId: ID!
    categoryId: ID
    budgetId: ID
    amount: Float!
    description: String!
    dueDate: String!
    repeatType: RepeatType
    endDate: String
  }

  input UpdateScheduledExpenseInput {
    walletId: ID
    categoryId: ID
    budgetId: ID
    amount: Float
    description: String
  }

  input ScheduledExpenseFilter {
    walletId: ID
    categoryId: ID
    budgetId: ID
    parentId: ID
    isPaid: Boolean
    startDate: String
    endDate: String
  }

  input PayScheduledExpenseInput {
    id: ID!
    amountPaid: Float
    paidDate: String
  }

  input BulkUpdateScheduledExpensesInput {
    parentId: ID!
    amount: Float
    description: String
    categoryId: ID
    budgetId: ID
  }

  input BulkDeleteScheduledExpensesInput {
    parentId: ID!
  }

  extend type Query {
    scheduledExpenses(filter: ScheduledExpenseFilter): [ScheduledExpense!]!
    scheduledExpense(id: ID!): ScheduledExpense!
  }

  extend type Mutation {
    createScheduledExpense(input: CreateScheduledExpenseInput!): [ScheduledExpense!]!
    updateScheduledExpense(id: ID!, input: UpdateScheduledExpenseInput!): ScheduledExpense!
    bulkUpdateScheduledExpenses(input: BulkUpdateScheduledExpensesInput!): [ScheduledExpense!]!
    deleteScheduledExpense(id: ID!): Boolean!
    bulkDeleteScheduledExpenses(input: BulkDeleteScheduledExpensesInput!): Boolean!
    payScheduledExpense(input: PayScheduledExpenseInput!): ScheduledExpense!
    revertScheduledExpensePayment(id: ID!): ScheduledExpense!
    cleanSlateScheduledExpenses: Boolean!
  }
`;
