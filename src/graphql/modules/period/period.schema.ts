import { gql } from 'graphql-tag';

export const periodTypeDefs = gql`
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

  extend type Query {
    walletPeriod(id: ID!): WalletPeriod
    walletPeriods: [WalletPeriod!]!
  }

  extend type Mutation {
    walletPeriodAdd(input: WalletPeriodInput!): WalletPeriod!
    walletPeriodUpdate(id: ID!, input: WalletPeriodUpdateInput!): WalletPeriod!
    walletPeriodRemove(id: ID!): Boolean!
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
