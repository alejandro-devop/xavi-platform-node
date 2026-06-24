import { gql } from 'graphql-tag';

export const userSettingsTypeDefs = gql`
  type UserSettings {
    userId: Int!
    hideHiddenHabits: Boolean!
    sleepActivityCategoryId: ID
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  extend type Query {
    mySettings: UserSettings!
  }

  extend type Mutation {
    updateMySettings(input: UpdateUserSettingsInput!): UserSettings!
  }

  input UpdateUserSettingsInput {
    hideHiddenHabits: Boolean
    sleepActivityCategoryId: ID
  }
`;
