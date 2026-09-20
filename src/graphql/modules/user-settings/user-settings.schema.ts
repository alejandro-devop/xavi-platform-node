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
    """
    Hora local en que empieza el día de Vida, formato HH:mm. Si es null el cliente usa 06:30.
    """
    vidaDayStartTime: String
    """
    Hora local en que termina el día de Vida, formato HH:mm. Si es null el cliente usa 23:00.
    """
    vidaDayEndTime: String
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
    """
    Hora local HH:mm en que empieza el día de Vida (o null para limpiar).
    """
    vidaDayStartTime: String
    """
    Hora local HH:mm en que termina el día de Vida (o null para limpiar).
    """
    vidaDayEndTime: String
  }
`;
