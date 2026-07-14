export interface UserSettings {
  userId: number;
  hideHiddenHabits: boolean;
  sleepActivityCategoryId: string | null;
  /** Preferencia de recordatorio local diario para revisar hábitos. */
  habitReminderEnabled: boolean;
  /** Hora local "HH:mm"; null si aún no se configuró. */
  habitReminderTime: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserSettingsInput {
  hideHiddenHabits?: boolean;
  sleepActivityCategoryId?: string | null;
  habitReminderEnabled?: boolean;
  habitReminderTime?: string | null;
}
