import { gql } from 'graphql-tag';

export const expenseExtractionTypeDefs = gql`
  """
  Draft expense extracted from a receipt photo or screenshot.
  Nothing is persisted — the user reviews and confirms via walletExpenseAdd.
  """
  type WalletExpenseExtraction {
    "Amount in the currency printed on the image (not converted to COP)"
    amount: Float
    "ISO 4217 code of that currency (e.g. COP, USD), null when it cannot be determined"
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
    "Optional note from the user about the expense (max 300 chars), used to pick the category and write the description"
    note: String
  }

  extend type Mutation {
    walletExpenseExtractFromImage(input: WalletExpenseExtractionInput!): WalletExpenseExtraction!
  }
`;
