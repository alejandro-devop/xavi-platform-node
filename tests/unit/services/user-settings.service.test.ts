import { userSettingsService } from '../../../src/services/user-settings.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';
import { ForbiddenError, NotFoundError } from '../../../src/shared/errors';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/services/activity-category.service', () => ({
  activityCategoryService: {
    getCategoryById: jest.fn(),
  },
}));

jest.mock('../../../src/services/activity.service', () => ({
  activityService: {
    getActivityById: jest.fn(),
  },
}));

jest.mock('../../../src/services/todo-folder.service', () => ({
  todoFolderService: {
    getFolderById: jest.fn(),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';
import { activityService } from '../../../src/services/activity.service';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;
const mockGetActivityById = activityService.getActivityById as jest.MockedFunction<
  typeof activityService.getActivityById
>;

const USER_ID = 1;
const ACTIVITY_ID = '42';

function createSettingsRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-16T12:00:00Z');
  return {
    user_id: USER_ID,
    hide_hidden_habits: true,
    sleep_activity_category_id: null,
    habit_reminder_enabled: false,
    habit_reminder_time: null,
    day_start_reminder_enabled: false,
    day_start_reminder_time: null,
    standup_todo_folder_id: null,
    housework_activity_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('UserSettingsService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
    mockGetActivityById.mockReset();
  });

  describe('getMySettings', () => {
    it('maps day start reminder fields with HH:mm time', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [
          createSettingsRow({
            day_start_reminder_enabled: true,
            day_start_reminder_time: '07:30:00',
          }),
        ],
      });

      const settings = await userSettingsService.getMySettings(USER_ID);

      expect(settings.dayStartReminderEnabled).toBe(true);
      expect(settings.dayStartReminderTime).toBe('07:30');
    });

    it('maps houseworkActivityId as string ID', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createSettingsRow({ housework_activity_id: 42 })],
      });

      const settings = await userSettingsService.getMySettings(USER_ID);

      expect(settings.houseworkActivityId).toBe('42');
    });
  });

  describe('updateMySettings', () => {
    it('updates day start reminder fields dynamically', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createSettingsRow()] }) // getOrCreate
        .mockResolvedValueOnce({
          rows: [
            createSettingsRow({
              day_start_reminder_enabled: true,
              day_start_reminder_time: '07:30:00',
            }),
          ],
        });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        dayStartReminderEnabled: true,
        dayStartReminderTime: '07:30',
      });

      expect(settings.dayStartReminderEnabled).toBe(true);
      expect(settings.dayStartReminderTime).toBe('07:30');

      const [sql, params] = mockDbPool.query.mock.calls[1];
      expect(sql).toContain('day_start_reminder_enabled = $1');
      expect(sql).toContain('day_start_reminder_time = $2');
      expect(params).toEqual([true, '07:30', USER_ID]);
    });

    it('clears the reminder time with null', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createSettingsRow()] })
        .mockResolvedValueOnce({ rows: [createSettingsRow()] });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        dayStartReminderTime: null,
      });

      expect(settings.dayStartReminderTime).toBeNull();
      const [, params] = mockDbPool.query.mock.calls[1];
      expect(params).toEqual([null, USER_ID]);
    });

    it('sets houseworkActivityId after validating ownership', async () => {
      mockGetActivityById.mockResolvedValueOnce({ id: ACTIVITY_ID } as never);
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createSettingsRow()] })
        .mockResolvedValueOnce({
          rows: [createSettingsRow({ housework_activity_id: 42 })],
        });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        houseworkActivityId: ACTIVITY_ID,
      });

      expect(mockGetActivityById).toHaveBeenCalledWith(ACTIVITY_ID, USER_ID);
      expect(settings.houseworkActivityId).toBe('42');
      const [sql, params] = mockDbPool.query.mock.calls[1];
      expect(sql).toContain('housework_activity_id = $1');
      expect(params).toEqual([42, USER_ID]);
    });

    it('clears houseworkActivityId with null without validating activity', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createSettingsRow({ housework_activity_id: 42 })] })
        .mockResolvedValueOnce({ rows: [createSettingsRow()] });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        houseworkActivityId: null,
      });

      expect(mockGetActivityById).not.toHaveBeenCalled();
      expect(settings.houseworkActivityId).toBeNull();
      const [, params] = mockDbPool.query.mock.calls[1];
      expect(params).toEqual([null, USER_ID]);
    });

    it('rejects houseworkActivityId that does not belong to the user', async () => {
      mockGetActivityById.mockRejectedValueOnce(
        new ForbiddenError('You do not have permission to access this activity')
      );
      mockDbPool.query.mockResolvedValueOnce({ rows: [createSettingsRow()] });

      await expect(
        userSettingsService.updateMySettings(USER_ID, { houseworkActivityId: ACTIVITY_ID })
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(mockDbPool.query).toHaveBeenCalledTimes(1);
    });

    it('rejects missing housework activity', async () => {
      mockGetActivityById.mockRejectedValueOnce(new NotFoundError('Activity not found'));
      mockDbPool.query.mockResolvedValueOnce({ rows: [createSettingsRow()] });

      await expect(
        userSettingsService.updateMySettings(USER_ID, { houseworkActivityId: '999' })
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
