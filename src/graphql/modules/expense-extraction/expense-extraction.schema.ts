import { gql } from 'graphql-tag';

export const expenseExtractionTypeDefs = gql`
  """
  Draft expense extracted from a receipt photo or screenshot.
  Nothing is persisted — the user reviews and confirms via walletExpenseAdd.
  """
  type WalletExpenseExtraction {
    amount: Float
    currency: String
    "Transaction date as YYYY-MM-DD, null when not visible in the image"
    date: String
    merchant: String
    description: String!
    "Suggested category id from the user's own categories, null when none fits"
    categoryId: ID
    isIncome: Boolean!
    confidence: WalletExpenseExtractionConfidence!
  }

  enum WalletExpenseExtractionConfidence {
    high
    medium
    low
  }

  input WalletExpenseExtractionInput {
    "Plain base64 image data (no data: URI prefix)"
    imageBase64: String!
    "One of: image/jpeg, image/png, image/webp, image/gif"
    mediaType: String!
  }

  extend type Mutation {
    walletExpenseExtractFromImage(input: WalletExpenseExtractionInput!): WalletExpenseExtraction!
  }
`;
