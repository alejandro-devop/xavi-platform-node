import { gql } from 'graphql-tag';

export const budgetTypeDefs = gql`
  type WalletBudget {
    id: ID!
    userId: ID!
    walletId: ID
    frequencyId: ID
    name: String!
    description: String
    icon: String
    amount: Decimal!
    balance: Decimal!
    startDate: Date!
    endDate: Date!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    wallet: Wallet
    frequency: WalletFrequency
    expenses: [WalletExpense!]
    followUps: [WalletBudgetFollowUp!]
  }

  type WalletBudgetFollowUp {
    id: ID!
    budgetId: ID!
    userId: ID!
    notes: String
    closureDate: Date!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    budget: WalletBudget
  }

  type WalletBudgetClosure {
    id: ID!
    budgetId: ID!
    userId: ID!
    periodStart: Date!
    periodEnd: Date!
    plannedAmount: Decimal!
    spentAmount: Decimal!
    remainingAmount: Decimal!
    overspentAmount: Decimal!
    expensesCount: Int!
    notes: String
    closedAt: DateTime!
    createdAt: DateTime!

    budget: WalletBudget
  }

  extend type Query {
    walletBudget(id: ID!): WalletBudget
    walletBudgets(walletId: ID, isActive: Boolean): [WalletBudget!]!
    walletBudgetFollowUp(id: ID!): WalletBudgetFollowUp
    walletBudgetFollowUps(budgetId: ID!): [WalletBudgetFollowUp!]!
    walletBudgetClosures(budgetId: ID!): [WalletBudgetClosure!]!
  }

  extend type Mutation {
    walletBudgetAdd(input: WalletBudgetInput!): WalletBudget!
    walletBudgetUpdate(id: ID!, input: WalletBudgetUpdateInput!): WalletBudget!
    walletBudgetRemove(id: ID!): Boolean!
    applyBudgetToExpenses(expensesIds: [ID!]!, budgetId: ID!, scheduled: Boolean): Boolean!
    closeBudgetPeriod(input: CloseBudgetPeriodInput!): WalletBudgetClosure!
    closeBudgetPeriods(inputs: [CloseBudgetPeriodInput!]!): [WalletBudgetClosure!]!
    walletBudgetFollowUpAdd(input: WalletBudgetFollowUpInput!): WalletBudgetFollowUp!
    walletBudgetFollowUpUpdate(
      id: ID!
      input: WalletBudgetFollowUpUpdateInput!
    ): WalletBudgetFollowUp!
    walletBudgetFollowUpRemove(id: ID!): Boolean!
  }

  input WalletBudgetInput {
    walletId: ID
    frequencyId: ID
    name: String!
    description: String
    icon: String
    amount: Decimal!
    startDate: Date!
    endDate: Date!
    isActive: Boolean
  }

  input WalletBudgetUpdateInput {
    walletId: ID
    frequencyId: ID
    name: String
    description: String
    icon: String
    amount: Decimal
    balance: Decimal
    startDate: Date
    endDate: Date
    isActive: Boolean
  }

  input WalletBudgetFollowUpInput {
    budgetId: ID!
    notes: String
    closureDate: Date!
  }

  input WalletBudgetFollowUpUpdateInput {
    notes: String
    closureDate: Date
  }

  input CloseBudgetPeriodInput {
    budgetId: ID!
    notes: String
  }
`;
