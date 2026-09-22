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
    vida_day_start_time: null,
    vida_day_end_time: null,
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

    it('maps the Vida day hours with HH:mm time', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [
          createSettingsRow({
            vida_day_start_time: '06:30:00',
            vida_day_end_time: '23:00:00',
          }),
        ],
      });

      const settings = await userSettingsService.getMySettings(USER_ID);

      expect(settings.vidaDayStartTime).toBe('06:30');
      expect(settings.vidaDayEndTime).toBe('23:00');
    });

    it('leaves the Vida day hours null when they are not configured', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createSettingsRow()] });

      const settings = await userSettingsService.getMySettings(USER_ID);

      expect(settings.vidaDayStartTime).toBeNull();
      expect(settings.vidaDayEndTime).toBeNull();
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

    it('updates the Vida day hours dynamically', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createSettingsRow()] }) // getOrCreate
        .mockResolvedValueOnce({
          rows: [
            createSettingsRow({
              vida_day_start_time: '06:30:00',
              vida_day_end_time: '23:00:00',
            }),
          ],
        });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        vidaDayStartTime: '06:30',
        vidaDayEndTime: '23:00',
      });

      expect(settings.vidaDayStartTime).toBe('06:30');
      expect(settings.vidaDayEndTime).toBe('23:00');

      const [sql, params] = mockDbPool.query.mock.calls[1];
      expect(sql).toContain('vida_day_start_time = $1');
      expect(sql).toContain('vida_day_end_time = $2');
      expect(params).toEqual(['06:30', '23:00', USER_ID]);
    });

    it('clears the Vida day hours with null', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({
          rows: [
            createSettingsRow({
              vida_day_start_time: '06:30:00',
              vida_day_end_time: '23:00:00',
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [createSettingsRow()] });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        vidaDayStartTime: null,
        vidaDayEndTime: null,
      });

      expect(settings.vidaDayStartTime).toBeNull();
      expect(settings.vidaDayEndTime).toBeNull();
      const [, params] = mockDbPool.query.mock.calls[1];
      expect(params).toEqual([null, null, USER_ID]);
    });

    it('updates the Vida night, crossing midnight', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createSettingsRow()] }).mockResolvedValueOnce({
        rows: [
          createSettingsRow({
            vida_night_bed_time: '23:00:00',
            vida_night_wake_time: '05:00:00',
            vida_night_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
          }),
        ],
      });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        vidaNightBedTime: '23:00',
        vidaNightWakeTime: '05:00',
        vidaNightDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
      });

      expect(settings.vidaNightBedTime).toBe('23:00');
      expect(settings.vidaNightWakeTime).toBe('05:00');
      expect(settings.vidaNightDays).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'sunday',
      ]);

      const [sql, params] = mockDbPool.query.mock.calls[1];
      expect(sql).toContain('vida_night_bed_time = $1');
      expect(sql).toContain('vida_night_wake_time = $2');
      expect(sql).toContain('vida_night_days = $3');
      expect(params).toEqual([
        '23:00',
        '05:00',
        ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
        USER_ID,
      ]);
    });

    // La noche que **no** cruza la medianoche: acostarse a la 1:00 y levantarse
    // a las 6:40 es una noche entera dentro del mismo día. El servidor no
    // compara una hora con la otra, y este test existe para que nadie añada esa
    // comparación «arreglando» algo.
    it('accepts a Vida night that does not cross midnight', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createSettingsRow()] }).mockResolvedValueOnce({
        rows: [
          createSettingsRow({
            vida_night_bed_time: '01:00:00',
            vida_night_wake_time: '06:40:00',
          }),
        ],
      });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        vidaNightBedTime: '01:00',
        vidaNightWakeTime: '06:40',
      });

      expect(settings.vidaNightBedTime).toBe('01:00');
      expect(settings.vidaNightWakeTime).toBe('06:40');
      const [, params] = mockDbPool.query.mock.calls[1];
      expect(params).toEqual(['01:00', '06:40', USER_ID]);
    });

    it('clears the Vida night with null', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({
          rows: [
            createSettingsRow({
              vida_night_bed_time: '23:00:00',
              vida_night_wake_time: '05:00:00',
              vida_night_days: ['monday'],
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [createSettingsRow()] });

      const settings = await userSettingsService.updateMySettings(USER_ID, {
        vidaNightBedTime: null,
        vidaNightWakeTime: null,
        vidaNightDays: null,
      });

      expect(settings.vidaNightBedTime).toBeNull();
      expect(settings.vidaNightWakeTime).toBeNull();
      expect(settings.vidaNightDays).toBeNull();
      const [, params] = mockDbPool.query.mock.calls[1];
      expect(params).toEqual([null, null, null, USER_ID]);
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
