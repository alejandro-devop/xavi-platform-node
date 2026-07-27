import { BadRequestError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
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
    category_id: null,
    scheduled_date: now,
    completed_at: null,
    is_workout: false,
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

  describe('subtasks', () => {
    const SUBTASK_ID = 3;

    function createSubtaskRow(overrides: Record<string, unknown> = {}) {
      const now = new Date('2024-06-01T12:00:00Z');
      return {
        id: SUBTASK_ID,
        activity_id: ACTIVITY_ID,
        title: 'Sacar la basura',
        is_completed: false,
        order_index: 0,
        created_at: now,
        updated_at: now,
        ...overrides,
      };
    }

    describe('createSubtask', () => {
      it('creates a subtask for an owned activity', async () => {
        mockDbPool.query
          .mockResolvedValueOnce({ rows: [createActivityRow()] })
          .mockResolvedValueOnce({ rows: [createSubtaskRow()] });

        const subtask = await activityService.createSubtask(USER_ID, {
          activityId: String(ACTIVITY_ID),
          title: 'Sacar la basura',
        });

        expect(subtask.id).toBe(String(SUBTASK_ID));
        expect(subtask.activityId).toBe(String(ACTIVITY_ID));
        expect(subtask.isCompleted).toBe(false);
      });

      it('throws ForbiddenError for non-owner', async () => {
        mockDbPool.query.mockResolvedValueOnce({ rows: [createActivityRow({ user_id: 2 })] });

        await expect(
          activityService.createSubtask(USER_ID, {
            activityId: String(ACTIVITY_ID),
            title: 'Sacar la basura',
          })
        ).rejects.toThrow(ForbiddenError);
      });
    });

    describe('updateSubtask', () => {
      it('marks a subtask as completed', async () => {
        mockDbPool.query
          .mockResolvedValueOnce({ rows: [createActivityRow()] })
          .mockResolvedValueOnce({ rows: [{ id: SUBTASK_ID }] })
          .mockResolvedValueOnce({ rows: [createSubtaskRow({ is_completed: true })] });

        const subtask = await activityService.updateSubtask(
          String(ACTIVITY_ID),
          String(SUBTASK_ID),
          USER_ID,
          { isCompleted: true }
        );

        expect(subtask.isCompleted).toBe(true);
        expect(mockDbPool.query).toHaveBeenLastCalledWith(
          expect.stringContaining('is_completed = $1'),
          [true, SUBTASK_ID]
        );
      });

      it('throws NotFoundError when subtask belongs to another activity', async () => {
        mockDbPool.query
          .mockResolvedValueOnce({ rows: [createActivityRow()] })
          .mockResolvedValueOnce({ rows: [] });

        await expect(
          activityService.updateSubtask(String(ACTIVITY_ID), String(SUBTASK_ID), USER_ID, {
            isCompleted: true,
          })
        ).rejects.toThrow(NotFoundError);
      });

      it('throws BadRequestError when no fields provided', async () => {
        mockDbPool.query
          .mockResolvedValueOnce({ rows: [createActivityRow()] })
          .mockResolvedValueOnce({ rows: [{ id: SUBTASK_ID }] });

        await expect(
          activityService.updateSubtask(String(ACTIVITY_ID), String(SUBTASK_ID), USER_ID, {})
        ).rejects.toThrow(BadRequestError);
      });
    });

    describe('deleteSubtask', () => {
      it('deletes an existing subtask', async () => {
        mockDbPool.query
          .mockResolvedValueOnce({ rows: [createActivityRow()] })
          .mockResolvedValueOnce({ rows: [{ id: SUBTASK_ID }] });

        const result = await activityService.deleteSubtask(
          String(ACTIVITY_ID),
          String(SUBTASK_ID),
          USER_ID
        );

        expect(result).toBe(true);
      });

      it('throws NotFoundError when missing', async () => {
        mockDbPool.query
          .mockResolvedValueOnce({ rows: [createActivityRow()] })
          .mockResolvedValueOnce({ rows: [] });

        await expect(
          activityService.deleteSubtask(String(ACTIVITY_ID), String(SUBTASK_ID), USER_ID)
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('listSubtasksForActivity / loadSubtasksCounts', () => {
      it('lists subtasks ordered by order_index', async () => {
        mockDbPool.query.mockResolvedValueOnce({
          rows: [createSubtaskRow(), createSubtaskRow({ id: 4, order_index: 1 })],
        });

        const subtasks = await activityService.listSubtasksForActivity(ACTIVITY_ID);

        expect(subtasks).toHaveLength(2);
        expect(mockDbPool.query).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY order_index ASC'),
          [ACTIVITY_ID]
        );
      });

      it('aggregates counts per activity', async () => {
        mockDbPool.query.mockResolvedValueOnce({
          rows: [{ activity_id: ACTIVITY_ID, total: '3', completed: '2' }],
        });

        const counts = await activityService.loadSubtasksCounts([ACTIVITY_ID]);

        expect(counts.get(ACTIVITY_ID)).toEqual({ total: 3, completed: 2 });
      });

      it('returns empty map without querying for no ids', async () => {
        const counts = await activityService.loadSubtasksCounts([]);

        expect(counts.size).toBe(0);
        expect(mockDbPool.query).not.toHaveBeenCalled();
      });
    });
  });
});
