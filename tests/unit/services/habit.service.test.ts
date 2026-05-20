import { ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { calculateCurrentStreak, habitService } from '../../../src/services/habit.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/services/habit-category.service', () => ({
  habitCategoryService: {
    getCategoryById: jest.fn(),
    ensureDefaultCategoryId: jest.fn().mockResolvedValue('cat-uuid-1'),
  },
}));

jest.mock('../../../src/services/habit-measure.service', () => ({
  habitMeasureService: {
    getMeasureById: jest.fn(),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const OTHER_USER_ID = 2;
const HABIT_ID = 10;

function createHabitRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: HABIT_ID,
    user_id: USER_ID,
    name: 'Exercise',
    description: null,
    frequency: 'daily',
    target_count: 1,
    icon: null,
    color: null,
    is_active: true,
    order_index: 0,
    start_date: null,
    end_date: null,
    should_avoid: false,
    should_keep: true,
    is_counter: true,
    is_timer: false,
    is_incremental: false,
    is_decremental: false,
    days: 0,
    streak: 0,
    max_streak: 0,
    daily_goal: 1,
    timer_goal: 0,
    times_goal: 0,
    step: null,
    category_id: 'cat-uuid-1',
    measure_id: null,
    activity_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function createLogRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: 1,
    habit_id: HABIT_ID,
    user_id: USER_ID,
    completed_date: '2024-06-01',
    count: 1,
    time: 0,
    notes: null,
    story: null,
    archived: false,
    is_accomplished: true,
    is_failed: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('calculateCurrentStreak', () => {
  it('returns 0 when there are no dates', () => {
    expect(calculateCurrentStreak([])).toBe(0);
  });

  it('counts consecutive days when the latest log is today', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    expect(calculateCurrentStreak([today, yesterday])).toBe(2);
  });
});

describe('HabitService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('getHabitById', () => {
    it('returns habit for owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createHabitRow()] });

      const habit = await habitService.getHabitById(String(HABIT_ID), USER_ID);

      expect(habit.id).toBe(String(HABIT_ID));
      expect(habit.streak).toBe(0);
      expect(habit.categoryId).toBe('cat-uuid-1');
    });

    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createHabitRow({ user_id: OTHER_USER_ID })],
      });

      await expect(habitService.getHabitById(String(HABIT_ID), USER_ID)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('throws NotFoundError when habit does not exist', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(habitService.getHabitById(String(HABIT_ID), USER_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('addHabitLog', () => {
    it('creates log when date is available', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createHabitRow()] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createLogRow()] })
        .mockResolvedValueOnce({ rows: [{ completed_date: '2024-06-01' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const log = await habitService.addHabitLog(String(HABIT_ID), USER_ID, {
        completedDate: '2024-06-01',
        count: 1,
      });

      expect(log.habitId).toBe(String(HABIT_ID));
      expect(log.isAccomplished).toBe(true);
    });
  });

  describe('getHabitStats', () => {
    it('computes stats including persisted streak', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createHabitRow({ streak: 5, max_streak: 10 })] })
        .mockResolvedValueOnce({ rows: [{ total: '2', total_count: '3' }] })
        .mockResolvedValueOnce({
          rows: [{ completed_date: today }, { completed_date: yesterday }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const stats = await habitService.getHabitStats(String(HABIT_ID), USER_ID);

      expect(stats.streak).toBe(5);
      expect(stats.maxStreak).toBe(10);
      expect(stats.currentStreak).toBe(5);
    });
  });
});
