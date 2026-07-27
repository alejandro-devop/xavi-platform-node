import { activityCategoryService } from './activity-category.service';
import { activityService } from './activity.service';
import { todoFolderService } from './todo-folder.service';
import { getDbPool } from '../shared/database/pool';
import type { UpdateUserSettingsInput, UserSettings } from '../types/services/user-settings.types';

type UserSettingsRow = {
  user_id: number;
  hide_hidden_habits: boolean;
  sleep_activity_category_id: string | null;
  habit_reminder_enabled: boolean;
  habit_reminder_time: string | Date | null;
  day_start_reminder_enabled: boolean;
  day_start_reminder_time: string | Date | null;
  standup_todo_folder_id: number | null;
  housework_activity_id: number | null;
  created_at: Date;
  updated_at: Date;
};

function formatTime(value: string | Date | null): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 5);
  return value.toTimeString().slice(0, 5);
}

function mapRow(row: UserSettingsRow): UserSettings {
  return {
    userId: row.user_id,
    hideHiddenHabits: row.hide_hidden_habits,
    sleepActivityCategoryId: row.sleep_activity_category_id,
    habitReminderEnabled: row.habit_reminder_enabled,
    habitReminderTime: formatTime(row.habit_reminder_time),
    dayStartReminderEnabled: row.day_start_reminder_enabled,
    dayStartReminderTime: formatTime(row.day_start_reminder_time),
    standupTodoFolderId:
      row.standup_todo_folder_id != null ? String(row.standup_todo_folder_id) : null,
    houseworkActivityId:
      row.housework_activity_id != null ? String(row.housework_activity_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOrCreateSettings(userId: number): Promise<UserSettings> {
  const db = getDbPool();
  const existing = await db.query<UserSettingsRow>(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [userId]
  );
  if (existing.rows.length > 0) return mapRow(existing.rows[0]);

  const created = await db.query<UserSettingsRow>(
    'INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *',
    [userId]
  );
  return mapRow(created.rows[0]);
}

export const userSettingsService = {
  async getMySettings(userId: number): Promise<UserSettings> {
    return getOrCreateSettings(userId);
  },

  async shouldHideHiddenHabits(userId: number): Promise<boolean> {
    const settings = await getOrCreateSettings(userId);
    return settings.hideHiddenHabits;
  },

  async updateMySettings(userId: number, input: UpdateUserSettingsInput): Promise<UserSettings> {
    const db = getDbPool();
    await getOrCreateSettings(userId);

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.hideHiddenHabits !== undefined) {
      updates.push(`hide_hidden_habits = $${paramIndex}`);
      params.push(input.hideHiddenHabits);
      paramIndex++;
    }

    if (input.sleepActivityCategoryId !== undefined) {
      if (input.sleepActivityCategoryId !== null) {
        await activityCategoryService.getCategoryById(input.sleepActivityCategoryId, userId);
      }
      updates.push(`sleep_activity_category_id = $${paramIndex}`);
      params.push(input.sleepActivityCategoryId);
      paramIndex++;
    }

    if (input.habitReminderEnabled !== undefined) {
      updates.push(`habit_reminder_enabled = $${paramIndex}`);
      params.push(input.habitReminderEnabled);
      paramIndex++;
    }

    if (input.habitReminderTime !== undefined) {
      updates.push(`habit_reminder_time = $${paramIndex}`);
      params.push(input.habitReminderTime);
      paramIndex++;
    }

    if (input.dayStartReminderEnabled !== undefined) {
      updates.push(`day_start_reminder_enabled = $${paramIndex}`);
      params.push(input.dayStartReminderEnabled);
      paramIndex++;
    }

    if (input.dayStartReminderTime !== undefined) {
      updates.push(`day_start_reminder_time = $${paramIndex}`);
      params.push(input.dayStartReminderTime);
      paramIndex++;
    }

    if (input.standupTodoFolderId !== undefined) {
      if (input.standupTodoFolderId !== null) {
        await todoFolderService.getFolderById(input.standupTodoFolderId, userId);
      }
      updates.push(`standup_todo_folder_id = $${paramIndex}`);
      params.push(
        input.standupTodoFolderId === null ? null : parseInt(input.standupTodoFolderId, 10)
      );
      paramIndex++;
    }

    if (input.houseworkActivityId !== undefined) {
      if (input.houseworkActivityId !== null) {
        await activityService.getActivityById(input.houseworkActivityId, userId);
      }
      updates.push(`housework_activity_id = $${paramIndex}`);
      params.push(
        input.houseworkActivityId === null ? null : parseInt(input.houseworkActivityId, 10)
      );
      paramIndex++;
    }

    if (updates.length === 0) {
      return getOrCreateSettings(userId);
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    const result = await db.query<UserSettingsRow>(
      `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      params
    );
    return mapRow(result.rows[0]);
  },
};
