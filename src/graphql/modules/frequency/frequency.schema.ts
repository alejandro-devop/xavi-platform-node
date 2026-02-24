import { gql } from 'graphql-tag';

export const frequencyTypeDefs = gql`
  enum FrequencyType {
    Daily
    Weekly
    Monthly
    Yearly
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

  extend type Query {
    walletFrequency(id: ID!): WalletFrequency
    walletFrequencies: [WalletFrequency!]!
  }

  extend type Mutation {
    walletFrequencyAdd(input: WalletFrequencyInput!): WalletFrequency!
    walletFrequencyUpdate(id: ID!, input: WalletFrequencyUpdateInput!): WalletFrequency!
    walletFrequencyRemove(id: ID!): Boolean!
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
`;
