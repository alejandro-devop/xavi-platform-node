import { ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { routineService } from '../../../src/services/routine.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const ROUTINE_ID = 5;

function createRoutineRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: ROUTINE_ID,
    user_id: USER_ID,
    name: 'Morning',
    description: null,
    days_of_week: ['monday', 'wednesday'],
    time_of_day: 'morning',
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('RoutineService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('getRoutineById', () => {
    it('returns routine with steps for owner', async () => {
      const now = new Date();
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createRoutineRow()] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              routine_id: ROUTINE_ID,
              title: 'Meditate',
              description: null,
              duration_minutes: 10,
              order_index: 0,
              created_at: now,
              updated_at: now,
            },
          ],
        });

      const routine = await routineService.getRoutineById(String(ROUTINE_ID), USER_ID);

      expect(routine.name).toBe('Morning');
      expect(routine.steps).toHaveLength(1);
      expect(routine.steps![0].title).toBe('Meditate');
    });

    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createRoutineRow({ user_id: 2 })],
      });

      await expect(routineService.getRoutineById(String(ROUTINE_ID), USER_ID)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('setRoutineActive', () => {
    it('deactivates other routines and activates target', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createRoutineRow()] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createRoutineRow({ is_active: true })] });

      const routine = await routineService.setRoutineActive(String(ROUTINE_ID), USER_ID);

      expect(mockDbPool.query).toHaveBeenNthCalledWith(
        2,
        'UPDATE routines SET is_active = FALSE WHERE user_id = $1',
        [USER_ID]
      );
      expect(routine.isActive).toBe(true);
    });
  });

  describe('deleteRoutine', () => {
    it('throws NotFoundError when missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(routineService.deleteRoutine(String(ROUTINE_ID), USER_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
