import { gql } from 'graphql-tag';

export const expenseCategoryTypeDefs = gql`
  enum ExpenseCategoryType {
    income
    expense
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

  extend type Query {
    walletExpenseCategory(id: ID!): WalletExpenseCategory
    walletExpenseCategories(type: ExpenseCategoryType): [WalletExpenseCategory!]!
  }

  extend type Mutation {
    walletExpenseCategoryAdd(input: WalletExpenseCategoryInput!): WalletExpenseCategory!
    walletExpenseCategoryUpdate(
      id: ID!
      input: WalletExpenseCategoryUpdateInput!
    ): WalletExpenseCategory!
    walletExpenseCategoryRemove(id: ID!): Boolean!
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
`;
