import { ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { activityService } from '../../../src/services/activity.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const ACTIVITY_ID = 7;

function createActivityRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: ACTIVITY_ID,
    user_id: USER_ID,
    title: 'Deep work',
    description: null,
    status: 'pending',
    priority: 'high',
    scheduled_date: now,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('ActivityService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('getActivityById', () => {
    it('returns activity for owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createActivityRow()] });

      const activity = await activityService.getActivityById(String(ACTIVITY_ID), USER_ID);

      expect(activity.id).toBe(String(ACTIVITY_ID));
      expect(activity.title).toBe('Deep work');
      expect(activity.priority).toBe('high');
    });

    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createActivityRow({ user_id: 2 })],
      });

      await expect(activityService.getActivityById(String(ACTIVITY_ID), USER_ID)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('completeActivity', () => {
    it('marks activity as completed', async () => {
      const now = new Date();
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createActivityRow()] })
        .mockResolvedValueOnce({
          rows: [createActivityRow({ status: 'completed', completed_at: now })],
        });

      const activity = await activityService.completeActivity(String(ACTIVITY_ID), USER_ID);

      expect(activity.status).toBe('completed');
      expect(activity.completedAt).toEqual(now);
    });
  });

  describe('deleteActivity', () => {
    it('throws NotFoundError when missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(activityService.deleteActivity(String(ACTIVITY_ID), USER_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
