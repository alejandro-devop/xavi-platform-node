import { syncHabitStreakFromLogs } from '../../../src/services/habit.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

describe('syncHabitStreakFromLogs', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  it('updates streak, max_streak and days from accomplished logs', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    mockDbPool.query
      .mockResolvedValueOnce({
        rows: [{ completed_date: today }, { completed_date: yesterday }],
      })
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      .mockResolvedValueOnce({ rows: [] });

    await syncHabitStreakFromLogs(10);

    expect(mockDbPool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE habits SET streak'),
      expect.arrayContaining([2, 2, 5, 10])
    );
  });
});
