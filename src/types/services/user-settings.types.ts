export interface UserSettings {
  userId: number;
  hideHiddenHabits: boolean;
  sleepActivityCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserSettingsInput {
  hideHiddenHabits?: boolean;
  sleepActivityCategoryId?: string | null;
}
