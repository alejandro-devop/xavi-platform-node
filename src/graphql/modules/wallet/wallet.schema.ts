import { gql } from 'graphql-tag';

export const walletTypeDefs = gql`
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

  extend type Query {
    wallet(id: ID!): Wallet
    wallets: [Wallet!]!
  }

  extend type Mutation {
    walletAdd(input: WalletInput!): Wallet!
    walletUpdate(id: ID!, input: WalletUpdateInput!): Wallet!
    walletRemove(id: ID!): Boolean!
    walletCleanSlate: Boolean!
  }

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
`;
