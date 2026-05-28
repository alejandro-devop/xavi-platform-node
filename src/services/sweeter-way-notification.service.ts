import { getDbPool } from '../shared/database/pool';
import { NotFoundError, ForbiddenError } from '../shared/errors';
import {
  SWNotification,
  SWUserPreferences,
  NotificationType,
  EntityType,
  CreateNotificationInput,
  UpdatePreferencesInput,
} from '../types/services/sweeter-way.types';

function mapNotificationRow(row: Record<string, unknown>): SWNotification {
  return {
    id: row.id as string,
    recipientId: row.recipient_id as number,
    actorId: row.actor_id as number,
    type: row.type as NotificationType,
    entityType: row.entity_type as EntityType,
    entityId: row.entity_id as string,
    readAt: row.read_at as Date | null,
    payload: row.payload as Record<string, unknown> | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function mapPreferencesRow(row: Record<string, unknown>): SWUserPreferences {
  return {
    id: row.id as string,
    userId: row.user_id as number,
    emailNotifications: row.email_notifications as boolean,
    inAppNotifications: row.in_app_notifications as boolean,
    pushToken: row.push_token as string | null,
    pushNotificationsEnabled: row.push_notifications_enabled as boolean,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export const swNotificationService = {
  async createNotification(input: CreateNotificationInput): Promise<SWNotification> {
    const db = getDbPool();
    const payload = input.payload ? JSON.stringify(input.payload) : null;
    const result = await db.query(
      `INSERT INTO sw_notifications
         (recipient_id, actor_id, type, entity_type, entity_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.recipientId, input.actorId, input.type, input.entityType, input.entityId, payload]
    );
    return mapNotificationRow(result.rows[0]);
  },

  async getMyNotifications(userId: number, unreadOnly = false): Promise<SWNotification[]> {
    const db = getDbPool();
    const query = unreadOnly
      ? `SELECT * FROM sw_notifications WHERE recipient_id = $1 AND read_at IS NULL ORDER BY created_at DESC`
      : `SELECT * FROM sw_notifications WHERE recipient_id = $1 ORDER BY created_at DESC`;
    const result = await db.query(query, [userId]);
    return result.rows.map(mapNotificationRow);
  },

  async markNotificationsRead(ids: string[], userId: number): Promise<number> {
    const db = getDbPool();
    const result = await db.query(
      `UPDATE sw_notifications
       SET read_at = NOW(), updated_at = NOW()
       WHERE id = ANY($1::uuid[]) AND recipient_id = $2 AND read_at IS NULL
       RETURNING id`,
      [ids, userId]
    );
    return result.rowCount ?? 0;
  },

  async getMyPreferences(userId: number): Promise<SWUserPreferences> {
    return this._getOrCreatePreferences(userId);
  },

  async updatePreferences(userId: number, input: UpdatePreferencesInput): Promise<SWUserPreferences> {
    const db = getDbPool();
    const prefs = await this._getOrCreatePreferences(userId);

    const updates: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (input.emailNotifications !== undefined) {
      updates.push(`email_notifications = $${i++}`);
      params.push(input.emailNotifications);
    }
    if (input.inAppNotifications !== undefined) {
      updates.push(`in_app_notifications = $${i++}`);
      params.push(input.inAppNotifications);
    }
    if (input.pushToken !== undefined) {
      updates.push(`push_token = $${i++}`);
      params.push(input.pushToken);
    }
    if (input.pushNotificationsEnabled !== undefined) {
      updates.push(`push_notifications_enabled = $${i++}`);
      params.push(input.pushNotificationsEnabled);
    }

    if (updates.length === 0) return prefs;

    params.push(prefs.id);
    const result = await db.query(
      `UPDATE sw_user_preferences SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      params
    );
    return mapPreferencesRow(result.rows[0]);
  },

  async _getOrCreatePreferences(userId: number): Promise<SWUserPreferences> {
    const db = getDbPool();
    const existing = await db.query(
      'SELECT * FROM sw_user_preferences WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) return mapPreferencesRow(existing.rows[0]);

    const created = await db.query(
      'INSERT INTO sw_user_preferences (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return mapPreferencesRow(created.rows[0]);
  },
};
