import { gql } from 'graphql-tag';

export const userSettingsTypeDefs = gql`
  type UserSettings {
    userId: Int!
    hideHiddenHabits: Boolean!
    sleepActivityCategoryId: ID
    habitReminderEnabled: Boolean!
    """
    Hora local del recordatorio diario de hábitos, formato HH:mm.
    """
    habitReminderTime: String
    dayStartReminderEnabled: Boolean!
    """
    Hora local del recordatorio diario para iniciar el día, formato HH:mm.
    """
    dayStartReminderTime: String
    """
    Carpeta de todos destino al crear tareas desde My Stand up.
    """
    standupTodoFolderId: ID
    """
    Activity canónica para el wizard Housework (organizar la casa).
    """
    houseworkActivityId: ID
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
    """
    Hora local HH:mm (o null para limpiar).
    """
    habitReminderTime: String
    dayStartReminderEnabled: Boolean
    """
    Hora local HH:mm (o null para limpiar).
    """
    dayStartReminderTime: String
    """
    ID de carpeta de todos (o null para limpiar).
    """
    standupTodoFolderId: ID
    """
    ID de Activity canónica Housework (o null para limpiar).
    """
    houseworkActivityId: ID
  }
`;
