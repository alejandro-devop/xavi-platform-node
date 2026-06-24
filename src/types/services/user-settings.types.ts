export interface UserSettings {
  userId: number;
  hideHiddenHabits: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserSettingsInput {
  hideHiddenHabits?: boolean;
}
