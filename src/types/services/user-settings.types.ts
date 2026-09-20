export interface UserSettings {
  userId: number;
  hideHiddenHabits: boolean;
  sleepActivityCategoryId: string | null;
  /** Preferencia de recordatorio local diario para revisar hábitos. */
  habitReminderEnabled: boolean;
  /** Hora local "HH:mm"; null si aún no se configuró. */
  habitReminderTime: string | null;
  /** Preferencia de recordatorio local diario para iniciar/planear el día. */
  dayStartReminderEnabled: boolean;
  /** Hora local "HH:mm"; null si aún no se configuró. */
  dayStartReminderTime: string | null;
  /** Carpeta de todos destino al crear tareas desde My Stand up. */
  standupTodoFolderId: string | null;
  /** Activity canónica para el wizard Housework (organizar casa). */
  houseworkActivityId: string | null;
  /** Hora local "HH:mm" en que empieza el día de Vida; null → el cliente usa 06:30. */
  vidaDayStartTime: string | null;
  /** Hora local "HH:mm" en que termina el día de Vida; null → el cliente usa 23:00. */
  vidaDayEndTime: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserSettingsInput {
  hideHiddenHabits?: boolean;
  sleepActivityCategoryId?: string | null;
  habitReminderEnabled?: boolean;
  habitReminderTime?: string | null;
  dayStartReminderEnabled?: boolean;
  dayStartReminderTime?: string | null;
  standupTodoFolderId?: string | null;
  houseworkActivityId?: string | null;
  /** Hora local "HH:mm" de inicio del día de Vida; null limpia el valor. */
  vidaDayStartTime?: string | null;
  /** Hora local "HH:mm" de fin del día de Vida; null limpia el valor. */
  vidaDayEndTime?: string | null;
}
