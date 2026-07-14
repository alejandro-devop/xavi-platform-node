import { gql } from 'graphql-tag';

export const userSettingsTypeDefs = gql`
  type UserSettings {
    userId: Int!
    hideHiddenHabits: Boolean!
    sleepActivityCategoryId: ID
    habitReminderEnabled: Boolean!
    """Hora local del recordatorio diario de hábitos, formato HH:mm."""
    habitReminderTime: String
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
    habitReminderEnabled: Boolean
    """Hora local HH:mm (o null para limpiar)."""
    habitReminderTime: String
  }
`;
