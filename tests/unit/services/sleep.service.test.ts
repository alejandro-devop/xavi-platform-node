import { BadRequestError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { sleepService } from '../../../src/services/sleep.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/services/sleep-follow-up-sync.service', () => ({
  sleepFollowUpSyncService: {
    createFollowUpForSleepLog: jest.fn().mockResolvedValue(undefined),
    updateFollowUpForSleepLog: jest.fn().mockResolvedValue(undefined),
    deleteFollowUpForSleepLog: jest.fn().mockResolvedValue(undefined),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const SLEEP_LOG_ID = 5;

function createSleepLogRow(overrides: Record<string, unknown> = {}) {
  const sleepDate = new Date('2024-06-01');
  const bedtime = new Date('2024-05-31T23:00:00.000Z');
  const wakeTime = new Date('2024-06-01T07:00:00.000Z');
  const now = new Date('2024-06-01T08:00:00.000Z');
  return {
    id: SLEEP_LOG_ID,
    user_id: USER_ID,
    sleep_date: sleepDate,
    bedtime,
    wake_time: wakeTime,
    duration_minutes: 480,
    quality: 'good',
    mood_on_waking: 'refreshed',
    notes: null,
    activity_follow_up_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('SleepService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('createSleepLog', () => {
    it('creates log with calculated duration', async () => {
      const row = createSleepLogRow();
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [row] });

      const log = await sleepService.createSleepLog(USER_ID, {
        sleepDate: '2024-06-01',
        bedtime: '2024-05-31T23:00:00.000Z',
        wakeTime: '2024-06-01T07:00:00.000Z',
        quality: 'good',
      });

      expect(log.id).toBe(String(SLEEP_LOG_ID));
      expect(log.durationMinutes).toBe(480);
      expect(log.durationHours).toBe('8.0');
    });

    it('throws BadRequestError when wake time is before bedtime', async () => {
      await expect(
        sleepService.createSleepLog(USER_ID, {
          sleepDate: '2024-06-01',
          bedtime: '2024-06-01T08:00:00.000Z',
          wakeTime: '2024-06-01T07:00:00.000Z',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getSleepLogById', () => {
    it('returns log for owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createSleepLogRow()] });

      const log = await sleepService.getSleepLogById(String(SLEEP_LOG_ID), USER_ID);

      expect(log.quality).toBe('good');
      expect(log.moodOnWaking).toBe('refreshed');
    });

    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createSleepLogRow({ user_id: 2 })],
      });

      await expect(sleepService.getSleepLogById(String(SLEEP_LOG_ID), USER_ID)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('listSleepLogs', () => {
    it('returns paginated collection with total count', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [createSleepLogRow()] });

      const collection = await sleepService.listSleepLogs(USER_ID);

      expect(collection.sleepLogs).toHaveLength(1);
      expect(collection.total).toBe(1);
      expect(collection.limit).toBe(30);
    });
  });

  describe('getSleepStats', () => {
    it('returns aggregated stats', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [
          {
            total_nights: '3',
            avg_duration: '450',
            min_duration: '420',
            max_duration: '480',
            poor_quality: '0',
            fair_quality: '1',
            good_quality: '2',
            excellent_quality: '0',
          },
        ],
      });

      const stats = await sleepService.getSleepStats(USER_ID, {
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      });

      expect(stats.totalNights).toBe(3);
      expect(stats.avgDurationMinutes).toBe(450);
      expect(stats.qualityDistribution.good).toBe(2);
      expect(stats.period.startDate).toEqual(new Date('2024-06-01'));
    });
  });

  describe('deleteSleepLog', () => {
    it('throws NotFoundError when missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(sleepService.deleteSleepLog(String(SLEEP_LOG_ID), USER_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
