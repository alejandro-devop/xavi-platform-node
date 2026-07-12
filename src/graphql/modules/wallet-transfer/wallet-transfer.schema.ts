import { gql } from 'graphql-tag';

export const walletTransferTypeDefs = gql`
  type WalletTransfer {
    id: ID!
    userId: Int!
    fromWalletId: ID!
    toWalletId: ID!
    amount: Decimal!
    date: Date!
    description: String!
    createdAt: DateTime!

    fromWallet: Wallet
    toWallet: Wallet
  }

  input CreateWalletTransferInput {
    fromWalletId: ID!
    toWalletId: ID!
    amount: Decimal!
    date: Date
    description: String
  }

  extend type Query {
    walletTransfer(id: ID!): WalletTransfer
  }

  extend type Mutation {
    walletTransferCreate(input: CreateWalletTransferInput!): WalletTransfer!
    walletTransferRemove(id: ID!): Boolean!
  }
`;
