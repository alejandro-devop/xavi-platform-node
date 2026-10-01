import { gql } from 'graphql-tag';

export const userSettingsTypeDefs = gql`
  """
  Pomodoro de Vida. longBreakMinutes y longBreakEvery van juntos: los dos o ninguno.
  """
  type VidaPomodoro {
    enabled: Boolean!
    """
    Categorías de actividad en las que se ofrece el Pomodoro.
    """
    categoryIds: [ID!]!
    workMinutes: Int!
    breakMinutes: Int!
    longBreakMinutes: Int
    longBreakEvery: Int
  }

  input VidaPomodoroInput {
    enabled: Boolean!
    """
    UUIDs de categorías de actividad (máx. 50; los repetidos se quitan).
    """
    categoryIds: [ID!]!
    """
    Minutos de trabajo por bloque, 5..240.
    """
    workMinutes: Int!
    """
    Minutos de descanso corto, 1..60.
    """
    breakMinutes: Int!
    """
    Minutos de descanso largo, 1..120. Junto con longBreakEvery, o los dos null.
    """
    longBreakMinutes: Int
    """
    Cada cuántos bloques toca el descanso largo, 2..10.
    """
    longBreakEvery: Int
  }

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
    """
    Hora local a la que se acuesta, formato HH:mm. Null si aún no configuró su noche.
    """
    vidaNightBedTime: String
    """
    Hora local a la que se levanta, formato HH:mm. **Puede ser anterior a
    vidaNightBedTime**: una noche que cruza la medianoche («23:00 → 05:00») y una que
    no la cruza («01:00 → 06:40») son las dos legales, y el servidor no compara una
    con otra.
    """
    vidaNightWakeTime: String
    """
    Noches en las que aplica, nombradas por el día en que se acuesta. Null: todas.
    """
    vidaNightDays: [VidaDayOfWeek!]
    """
    Pomodoro de Vida. Null si aún no lo configuró.
    """
    vidaPomodoro: VidaPomodoro
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
    """
    Hora local HH:mm a la que se acuesta (o null para limpiar).
    """
    vidaNightBedTime: String
    """
    Hora local HH:mm a la que se levanta (o null para limpiar). **No tiene que ser
    posterior a vidaNightBedTime.**
    """
    vidaNightWakeTime: String
    """
    Noches en las que aplica, por el día en que se acuesta (o null para limpiar).
    """
    vidaNightDays: [VidaDayOfWeek!]
    """
    Pomodoro de Vida, entero: reemplaza al anterior (o null para limpiar).
    """
    vidaPomodoro: VidaPomodoroInput
  }
`;
