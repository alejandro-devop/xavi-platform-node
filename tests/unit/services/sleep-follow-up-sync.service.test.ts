import { activityFollowUpService } from '../../../src/services/activity-follow-up.service';
import { activityService } from '../../../src/services/activity.service';
import { sleepFollowUpSyncService } from '../../../src/services/sleep-follow-up-sync.service';
import { userSettingsService } from '../../../src/services/user-settings.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/services/user-settings.service', () => ({
  userSettingsService: {
    getMySettings: jest.fn(),
  },
}));

jest.mock('../../../src/services/activity.service', () => ({
  activityService: {
    createActivity: jest.fn(),
  },
}));

jest.mock('../../../src/services/activity-follow-up.service', () => ({
  activityFollowUpService: {
    createFollowUp: jest.fn(),
    updateFollowUp: jest.fn(),
    deleteFollowUp: jest.fn(),
    parseFollowUpId: (id: string) => parseInt(id, 10),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;
const mockUserSettings = userSettingsService as jest.Mocked<typeof userSettingsService>;
const mockActivityService = activityService as jest.Mocked<typeof activityService>;
const mockFollowUpService = activityFollowUpService as jest.Mocked<typeof activityFollowUpService>;

const USER_ID = 1;
const CATEGORY_ID = 'cat-1';

function createSleepRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    user_id: USER_ID,
    sleep_date: '2024-06-01',
    bedtime: new Date(2024, 5, 1, 0, 0, 0),
    duration_minutes: 480,
    notes: 'Deep sleep',
    activity_follow_up_id: null,
    ...overrides,
  };
}

describe('sleepFollowUpSyncService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  it('skips follow-up creation when sleep category is not configured', async () => {
    mockUserSettings.getMySettings.mockResolvedValue({
      userId: USER_ID,
      hideHiddenHabits: true,
      sleepActivityCategoryId: null,
      habitReminderEnabled: false,
      habitReminderTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sleepFollowUpSyncService.createFollowUpForSleepLog(USER_ID, createSleepRow());

    expect(mockFollowUpService.createFollowUp).not.toHaveBeenCalled();
  });

  it('creates follow-up and links it to the sleep log', async () => {
    mockUserSettings.getMySettings.mockResolvedValue({
      userId: USER_ID,
      hideHiddenHabits: true,
      sleepActivityCategoryId: CATEGORY_ID,
      habitReminderEnabled: false,
      habitReminderTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] });
    mockFollowUpService.createFollowUp.mockResolvedValue({
      id: '99',
      activityId: '42',
      userId: USER_ID,
      date: '2024-06-01',
      startTime: '00:30:00',
      durationMinutes: 480,
      isOpen: false,
      endTime: '08:30:00',
      endDate: '2024-06-01',
      endDateTime: '2024-06-01T08:30:00',
      notes: 'Sueño: Deep sleep',
      linkedTodoId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sleepFollowUpSyncService.createFollowUpForSleepLog(USER_ID, createSleepRow(), {
      bedtimeStartTime: '00:30',
    });

    expect(mockFollowUpService.createFollowUp).toHaveBeenCalledWith(USER_ID, {
      activityId: '42',
      date: '2024-06-01',
      startTime: '00:30:00',
      durationMinutes: 480,
      notes: 'Sueño: Deep sleep',
    });
    expect(mockDbPool.query).toHaveBeenCalledWith(
      'UPDATE sleep_logs SET activity_follow_up_id = $1, updated_at = NOW() WHERE id = $2',
      [99, 10]
    );
  });

  it('creates sleep activity when missing in configured category', async () => {
    mockUserSettings.getMySettings.mockResolvedValue({
      userId: USER_ID,
      hideHiddenHabits: true,
      sleepActivityCategoryId: CATEGORY_ID,
      habitReminderEnabled: false,
      habitReminderTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDbPool.query.mockResolvedValueOnce({ rows: [] });
    mockActivityService.createActivity.mockResolvedValue({
      id: '77',
      userId: USER_ID,
      title: 'Sueño',
      description: 'Tiempo de sueño registrado automáticamente',
      status: 'in_progress',
      priority: 'low',
      categoryId: CATEGORY_ID,
      scheduledDate: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockFollowUpService.createFollowUp.mockResolvedValue({
      id: '99',
      activityId: '77',
      userId: USER_ID,
      date: '2024-06-01',
      startTime: '22:00:00',
      durationMinutes: 480,
      isOpen: false,
      endTime: '06:00:00',
      endDate: '2024-06-02',
      endDateTime: '2024-06-02T06:00:00',
      notes: 'Registro automático de sueño',
      linkedTodoId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sleepFollowUpSyncService.createFollowUpForSleepLog(USER_ID, createSleepRow({ notes: null }));

    expect(mockActivityService.createActivity).toHaveBeenCalledWith(USER_ID, {
      title: 'Sueño',
      description: 'Tiempo de sueño registrado automáticamente',
      categoryId: CATEGORY_ID,
      status: 'in_progress',
      priority: 'low',
    });
  });

  it('deletes linked follow-up when sleep log is removed', async () => {
    await sleepFollowUpSyncService.deleteFollowUpForSleepLog(
      USER_ID,
      createSleepRow({ activity_follow_up_id: 55 })
    );

    expect(mockFollowUpService.deleteFollowUp).toHaveBeenCalledWith('55', USER_ID);
  });
});
