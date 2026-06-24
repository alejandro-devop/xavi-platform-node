import { getDbPool } from '../shared/database/pool';
import type { UpdateUserSettingsInput, UserSettings } from '../types/services/user-settings.types';

type UserSettingsRow = {
  user_id: number;
  hide_hidden_habits: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: UserSettingsRow): UserSettings {
  return {
    userId: row.user_id,
    hideHiddenHabits: row.hide_hidden_habits,
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

    if (input.hideHiddenHabits === undefined) {
      return getOrCreateSettings(userId);
    }

    const result = await db.query<UserSettingsRow>(
      `UPDATE user_settings
       SET hide_hidden_habits = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [input.hideHiddenHabits, userId]
    );
    return mapRow(result.rows[0]);
  },
};
