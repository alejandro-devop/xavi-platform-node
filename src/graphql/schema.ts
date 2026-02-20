import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar Date
  scalar JSON
  scalar Decimal

  # ============================================
  # QUERIES
  # ============================================
  type Query {
    # Health check
    health: Health!

    # Wallet queries
    wallet(id: ID!): Wallet
    wallets: [Wallet!]!

    # Expense Category queries
    walletExpenseCategory(id: ID!): WalletExpenseCategory
    walletExpenseCategories: [WalletExpenseCategory!]!

    # Expense queries
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

    # Scheduled Expense queries
    walletScheduledExpense(id: ID!): WalletScheduledExpense
    walletScheduledExpenses(
      walletId: ID
      categoryId: ID
      budgetId: ID
      isPaid: Boolean
      parentId: ID
    ): [WalletScheduledExpense!]!

    # Budget queries
    walletBudget(id: ID!): WalletBudget
    walletBudgets(walletId: ID, isActive: Boolean): [WalletBudget!]!

    # Budget Follow-up queries
    budgetFollowUp(id: ID!): WalletBudgetFollowUp
    budgetFollowUps(budgetId: ID): [WalletBudgetFollowUp!]!

    # Frequency queries
    walletFrequency(id: ID!): WalletFrequency
    walletFrequencies: [WalletFrequency!]!

    # Period queries
    walletPeriod(id: ID!): WalletPeriod
    walletPeriods: [WalletPeriod!]!
  }

  # ============================================
  # MUTATIONS
  # ============================================
  type Mutation {
    # Wallet CRUD
    walletAdd(input: WalletInput!): Wallet!
    walletUpdate(id: ID!, input: WalletUpdateInput!): Wallet!
    walletRemove(id: ID!): Boolean!
    walletCleanSlate: Boolean! # Delete all wallets for user
    # Expense Category CRUD
    walletExpenseCategoryAdd(input: WalletExpenseCategoryInput!): WalletExpenseCategory!
    walletExpenseCategoryUpdate(
      id: ID!
      input: WalletExpenseCategoryUpdateInput!
    ): WalletExpenseCategory!
    walletExpenseCategoryRemove(id: ID!): Boolean!

    # Expense CRUD
    walletExpenseAdd(input: WalletExpenseInput!): WalletExpense!
    walletExpenseUpdate(id: ID!, input: WalletExpenseUpdateInput!): WalletExpense!
    walletExpenseRemove(id: ID!): Boolean!

    # Scheduled Expense CRUD + Advanced
    walletScheduledExpenseAdd(input: WalletScheduledExpenseInput!): WalletScheduledExpense!
    walletScheduledExpenseUpdate(
      id: ID!
      input: WalletScheduledExpenseUpdateInput!
    ): WalletScheduledExpense!
    walletScheduledExpenseRemove(id: ID!): Boolean!
    walletPayScheduled(input: PayScheduledInput!): WalletScheduledExpense! # ADVANCED
    walletCancelScheduled(id: ID!): WalletScheduledExpense! # ADVANCED
    # Budget CRUD
    walletBudgetAdd(input: WalletBudgetInput!): WalletBudget!
    walletBudgetUpdate(id: ID!, input: WalletBudgetUpdateInput!): WalletBudget!
    walletBudgetRemove(id: ID!): Boolean!
    applyBudgetToExpenses(expensesIds: [ID!]!, budgetId: ID!, scheduled: Boolean): Boolean! # ADVANCED BULK
    # Budget Follow-up CRUD
    walletBudgetFollowUpAdd(input: WalletBudgetFollowUpInput!): WalletBudgetFollowUp!
    walletBudgetFollowUpUpdate(
      id: ID!
      input: WalletBudgetFollowUpUpdateInput!
    ): WalletBudgetFollowUp!
    walletBudgetFollowUpRemove(id: ID!): Boolean!

    # Frequency CRUD
    walletFrequencyAdd(input: WalletFrequencyInput!): WalletFrequency!
    walletFrequencyUpdate(id: ID!, input: WalletFrequencyUpdateInput!): WalletFrequency!
    walletFrequencyRemove(id: ID!): Boolean!

    # Period CRUD
    walletPeriodAdd(input: WalletPeriodInput!): WalletPeriod!
    walletPeriodUpdate(id: ID!, input: WalletPeriodUpdateInput!): WalletPeriod!
    walletPeriodRemove(id: ID!): Boolean!
  }

  # ============================================
  # TYPES
  # ============================================

  type Health {
    status: String!
    timestamp: DateTime!
  }

  type Wallet {
    id: ID!
    userId: ID!
    name: String!
    icon: String
    initialBalance: Decimal!
    balance: Decimal!
    isMain: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    expenses: [WalletExpense!]
    scheduledExpenses: [WalletScheduledExpense!]
    budgets: [WalletBudget!]
  }

  type WalletExpenseCategory {
    id: ID!
    userId: ID!
    name: String!
    type: ExpenseCategoryType!
    description: String
    color: String
    icon: String
    isSystem: Boolean!
    isTransaction: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

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

  type WalletFrequency {
    id: ID!
    userId: ID!
    name: String!
    description: String
    frequencyType: FrequencyType!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WalletPeriod {
    id: ID!
    userId: ID!
    name: String!
    description: String
    startDate: Date!
    endDate: Date!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # ============================================
  # ENUMS
  # ============================================

  enum ExpenseCategoryType {
    income
    expense
  }

  enum FrequencyType {
    Daily
    Weekly
    Monthly
    Yearly
  }

  # ============================================
  # INPUTS
  # ============================================

  input WalletInput {
    name: String!
    icon: String
    initialBalance: Decimal
    balance: Decimal
    isMain: Boolean
  }

  input WalletUpdateInput {
    name: String
    icon: String
    balance: Decimal
    isMain: Boolean
  }

  input WalletExpenseCategoryInput {
    name: String!
    type: ExpenseCategoryType!
    description: String
    color: String
    icon: String
    isTransaction: Boolean
  }

  input WalletExpenseCategoryUpdateInput {
    name: String
    type: ExpenseCategoryType
    description: String
    color: String
    icon: String
    isTransaction: Boolean
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

  input WalletFrequencyInput {
    name: String!
    description: String
    frequencyType: FrequencyType!
  }

  input WalletFrequencyUpdateInput {
    name: String
    description: String
    frequencyType: FrequencyType
  }

  input WalletPeriodInput {
    name: String!
    description: String
    startDate: Date!
    endDate: Date!
  }

  input WalletPeriodUpdateInput {
    name: String
    description: String
    startDate: Date
    endDate: Date
  }
`;
