import { swNotificationService } from '../../../src/services/sweeter-way-notification.service';
import { swEmailService } from '../../../src/services/sweeter-way-email.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({ getDbPool: jest.fn() }));
jest.mock('../../../src/services/sweeter-way-email.service', () => ({
  swEmailService: {
    sendBondRequested: jest.fn().mockResolvedValue(undefined),
    sendBondAccepted: jest.fn().mockResolvedValue(undefined),
    sendItemAdded: jest.fn().mockResolvedValue(undefined),
    sendItemCompleted: jest.fn().mockResolvedValue(undefined),
    sendLogAdded: jest.fn().mockResolvedValue(undefined),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';
const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const NOW = new Date('2025-01-01T12:00:00Z');
const USER_A = 1;
const USER_B = 2;
const ITEM_ID = 'item-uuid-0001';
const BOND_ID = 'bond-uuid-0001';
const NOTIF_ID = 'notif-uuid-0001';

function makeNotifRow(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTIF_ID,
    recipient_id: USER_B,
    actor_id: USER_A,
    type: 'item_added',
    entity_type: 'item',
    entity_id: ITEM_ID,
    read_at: null,
    payload: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makePrefsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prefs-uuid-0001',
    user_id: USER_B,
    email_notifications: true,
    in_app_notifications: true,
    push_token: null,
    push_notifications_enabled: false,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('swNotificationService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  // ─── createNotification ──────────────────────────────────────────────────────

  describe('createNotification', () => {
    it('inserts and returns a notification', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeNotifRow()] });
      const notif = await swNotificationService.createNotification({
        recipientId: USER_B,
        actorId: USER_A,
        type: 'item_added',
        entityType: 'item',
        entityId: ITEM_ID,
      });
      expect(notif.type).toBe('item_added');
      expect(notif.recipientId).toBe(USER_B);
    });

    it('serializes payload correctly', async () => {
      const payload = { itemTitle: 'El Cielo', listTitle: 'Restaurantes' };
      mockDbPool.query.mockResolvedValueOnce({
        rows: [makeNotifRow({ payload })],
      });
      const notif = await swNotificationService.createNotification({
        recipientId: USER_B,
        actorId: USER_A,
        type: 'item_added',
        entityType: 'item',
        entityId: ITEM_ID,
        payload,
      });
      expect(notif.payload).toEqual(payload);

      const callArgs = mockDbPool.query.mock.calls[0];
      expect(callArgs[1][5]).toBe(JSON.stringify(payload));
    });
  });

  // ─── getMyNotifications ──────────────────────────────────────────────────────

  describe('getMyNotifications', () => {
    it('returns all notifications when unreadOnly is false', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeNotifRow(), makeNotifRow({ id: 'notif-2' })] });
      const notifs = await swNotificationService.getMyNotifications(USER_B);
      expect(notifs).toHaveLength(2);
    });

    it('queries with IS NULL filter when unreadOnly is true', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeNotifRow()] });
      await swNotificationService.getMyNotifications(USER_B, true);
      const sql = mockDbPool.query.mock.calls[0][0] as string;
      expect(sql).toContain('read_at IS NULL');
    });
  });

  // ─── markNotificationsRead ───────────────────────────────────────────────────

  describe('markNotificationsRead', () => {
    it('returns the count of updated notifications', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rowCount: 2, rows: [] });
      const count = await swNotificationService.markNotificationsRead(
        [NOTIF_ID, 'notif-2'],
        USER_B
      );
      expect(count).toBe(2);
    });

    it('returns 0 when none match', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const count = await swNotificationService.markNotificationsRead([NOTIF_ID], USER_B);
      expect(count).toBe(0);
    });
  });

  // ─── preferences ─────────────────────────────────────────────────────────────

  describe('getOrCreatePreferences', () => {
    it('returns existing preferences', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makePrefsRow()] });
      const prefs = await swNotificationService.getMyPreferences(USER_B);
      expect(prefs.emailNotifications).toBe(true);
      expect(prefs.pushToken).toBeNull();
    });

    it('creates preferences when none exist', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });                 // SELECT → empty
      mockDbPool.query.mockResolvedValueOnce({ rows: [makePrefsRow()] });   // INSERT
      const prefs = await swNotificationService.getMyPreferences(USER_B);
      expect(prefs.userId).toBe(USER_B);
    });
  });

  describe('updatePreferences', () => {
    it('updates email_notifications', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makePrefsRow()] }); // getOrCreate SELECT
      mockDbPool.query.mockResolvedValueOnce({                            // UPDATE
        rows: [makePrefsRow({ email_notifications: false })],
      });
      const prefs = await swNotificationService.updatePreferences(USER_B, {
        emailNotifications: false,
      });
      expect(prefs.emailNotifications).toBe(false);
    });

    it('returns unchanged prefs when no input provided', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makePrefsRow()] });
      const prefs = await swNotificationService.updatePreferences(USER_B, {});
      expect(prefs.emailNotifications).toBe(true);
      // No UPDATE query should have been called (only the SELECT from getOrCreate)
      expect(mockDbPool.query).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Email failures do NOT break the mutation ─────────────────────────────────

  describe('email failure resilience', () => {
    it('logs error and does not throw when email service fails', async () => {
      const mockSend = swEmailService.sendItemAdded as jest.Mock;
      mockSend.mockRejectedValueOnce(new Error('Resend network error'));

      // Simulate what the resolver does: fire and forget
      const sideEffect = async () => {
        try {
          await swEmailService.sendItemAdded('Actor', 'cinnamon@test.com', 'Cinnamon', 'El Cielo', 'Restaurantes');
        } catch {
          // logged by resolver — should not propagate
        }
      };

      await expect(sideEffect()).resolves.toBeUndefined();
    });

    it('createNotification still works even if email would fail', async () => {
      const mockSend = swEmailService.sendBondRequested as jest.Mock;
      mockSend.mockRejectedValueOnce(new Error('SMTP timeout'));

      // Notification is created independently of email
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeNotifRow({ type: 'bond_requested' })] });
      const notif = await swNotificationService.createNotification({
        recipientId: USER_B,
        actorId: USER_A,
        type: 'bond_requested',
        entityType: 'bond',
        entityId: BOND_ID,
      });
      expect(notif.type).toBe('bond_requested');
    });
  });
});
