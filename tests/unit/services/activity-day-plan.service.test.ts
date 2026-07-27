import { BadRequestError, NotFoundError } from '../../../src/shared/errors';
import { activityDayPlanService } from '../../../src/services/activity-day-plan.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const ACTIVITY_ID = 7;
const ITEM_ID = 21;
const DATE = '2026-07-16';

function createItemRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-16T12:00:00Z');
  return {
    id: ITEM_ID,
    user_id: USER_ID,
    activity_id: ACTIVITY_ID,
    date: '2026-07-16',
    start_time: '08:30:00',
    end_time: '09:45:00',
    order_index: 0,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('ActivityDayPlanService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    resetAllMocks();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    mockDbPool.connect.mockResolvedValue(mockClient as never);
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('getDayPlan', () => {
    it('returns items with HH:mm times and YYYY-MM-DD date', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createItemRow()] });

      const items = await activityDayPlanService.getDayPlan(USER_ID, DATE);

      expect(items).toHaveLength(1);
      expect(items[0].startTime).toBe('08:30');
      expect(items[0].endTime).toBe('09:45');
      expect(items[0].date).toBe(DATE);
      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY start_time ASC'),
        [USER_ID, DATE]
      );
    });

    it('formats Date-typed date columns', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createItemRow({ date: new Date('2026-07-16T00:00:00Z') })],
      });

      const items = await activityDayPlanService.getDayPlan(USER_ID, DATE);

      expect(items[0].date).toBe(DATE);
    });
  });

  describe('setDayPlan', () => {
    it('rejects duplicate activities in the same plan', async () => {
      await expect(
        activityDayPlanService.setDayPlan(USER_ID, DATE, [
          { activityId: '7', startTime: '08:00', endTime: '09:00' },
          { activityId: '7', startTime: '10:00', endTime: '11:00' },
        ])
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects activities not owned by the user', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID }] });

      await expect(
        activityDayPlanService.setDayPlan(USER_ID, DATE, [
          { activityId: '7', startTime: '08:00', endTime: '09:00' },
          { activityId: '8', startTime: '10:00', endTime: '11:00' },
        ])
      ).rejects.toThrow(BadRequestError);
    });

    it('replaces the plan transactionally and preserves completed_at', async () => {
      const completedAt = new Date('2026-07-16T09:00:00Z');
      mockDbPool.query.mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID }] }); // ownership
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ activity_id: ACTIVITY_ID, completed_at: completedAt }],
        }) // existing
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [createItemRow({ completed_at: completedAt })] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const items = await activityDayPlanService.setDayPlan(USER_ID, DATE, [
        { activityId: String(ACTIVITY_ID), startTime: '08:30', endTime: '09:45' },
      ]);

      expect(items).toHaveLength(1);
      expect(items[0].completedAt).toEqual(completedAt);

      const insertCall = mockClient.query.mock.calls[3];
      expect(insertCall[0]).toContain('INSERT INTO activity_day_plan_items');
      expect(insertCall[1]).toEqual([
        USER_ID,
        ACTIVITY_ID,
        DATE,
        '08:30',
        '09:45',
        0,
        completedAt,
        null,
      ]);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rolls back when an insert fails', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID }] });
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // existing
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockRejectedValueOnce(new Error('boom')); // INSERT

      await expect(
        activityDayPlanService.setDayPlan(USER_ID, DATE, [
          { activityId: String(ACTIVITY_ID), startTime: '08:30', endTime: '09:45' },
        ])
      ).rejects.toThrow('boom');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('addDayPlanItem', () => {
    it('inserts a single item with next orderIndex', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID }] }) // ownership
        .mockResolvedValueOnce({ rows: [] }) // duplicate check
        .mockResolvedValueOnce({ rows: [{ max: 2 }] }) // max order
        .mockResolvedValueOnce({ rows: [createItemRow({ order_index: 3 })] }); // insert

      const item = await activityDayPlanService.addDayPlanItem(USER_ID, {
        date: DATE,
        activityId: String(ACTIVITY_ID),
        startTime: '08:30',
        endTime: '09:45',
      });

      expect(item.orderIndex).toBe(3);
      const insertCall = mockDbPool.query.mock.calls[3];
      expect(insertCall[0]).toContain('INSERT INTO activity_day_plan_items');
      expect(insertCall[1]).toEqual([
        USER_ID,
        ACTIVITY_ID,
        DATE,
        '08:30',
        '09:45',
        3,
        null,
      ]);
    });

    it('rejects when activity is already in the plan', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID }] })
        .mockResolvedValueOnce({ rows: [{ id: ITEM_ID }] });

      await expect(
        activityDayPlanService.addDayPlanItem(USER_ID, {
          date: DATE,
          activityId: String(ACTIVITY_ID),
          startTime: '08:30',
          endTime: '09:45',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('updateDayPlanItem', () => {
    it('builds a dynamic update and marks completion', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createItemRow({ completed_at: new Date() })],
      });

      const item = await activityDayPlanService.updateDayPlanItem(USER_ID, String(ITEM_ID), {
        startTime: '09:00',
        isCompleted: true,
      });

      expect(item.completedAt).not.toBeNull();
      const [sql, params] = mockDbPool.query.mock.calls[0];
      expect(sql).toContain('start_time = $1::time');
      expect(sql).toContain('completed_at = NOW()');
      expect(params).toEqual(['09:00', ITEM_ID, USER_ID]);
    });

    it('clears completed_at when isCompleted is false', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createItemRow()] });

      await activityDayPlanService.updateDayPlanItem(USER_ID, String(ITEM_ID), {
        isCompleted: false,
      });

      const [sql] = mockDbPool.query.mock.calls[0];
      expect(sql).toContain('completed_at = NULL');
    });

    it('throws BadRequestError when no fields provided', async () => {
      await expect(
        activityDayPlanService.updateDayPlanItem(USER_ID, String(ITEM_ID), {})
      ).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when item does not exist for user', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        activityDayPlanService.updateDayPlanItem(USER_ID, String(ITEM_ID), { isCompleted: true })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeDayPlanItem', () => {
    it('removes an owned item', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [{ id: ITEM_ID }] });

      const result = await activityDayPlanService.removeDayPlanItem(USER_ID, String(ITEM_ID));

      expect(result).toBe(true);
    });

    it('throws NotFoundError when missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        activityDayPlanService.removeDayPlanItem(USER_ID, String(ITEM_ID))
      ).rejects.toThrow(NotFoundError);
    });
  });
});
