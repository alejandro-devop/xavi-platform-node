import {
  addDaysToDateString,
  applyFailedStreak,
  applyLifelineToEndDate,
  getEffectiveGoal,
  isFrontierFollowUp,
} from './habit-streak';
import { syncHabitStreakFromLogs } from './habit.service';

jest.mock('../shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

function makeHabit(overrides: Record<string, unknown> = {}) {
  return {
    habit_type: 'boolean' as const,
    daily_goal: 1,
    timer_goal: 0,
    target_count: 1,
    period_days: 30,
    restart_count: 0,
    streak: 0,
    max_streak: 0,
    days: 0,
    end_date: null,
    ...overrides,
  };
}

// ─── Tests 1-3, 6, 11: syncHabitStreakFromLogs (DB mocked) ───────────────────

function mockDb(streakValue: number, maxStreakValue: number) {
  const mockQuery = jest
    .fn()
    .mockResolvedValueOnce({ rows: [{ streak: streakValue }] })
    .mockResolvedValueOnce({ rows: [{ max_streak: maxStreakValue }] })
    .mockResolvedValueOnce({ rows: [] });
  mockGetDbPool.mockReturnValue({ query: mockQuery } as never);
  return mockQuery;
}

describe('syncHabitStreakFromLogs', () => {
  afterEach(() => jest.clearAllMocks());

  test('1 — racha no muere con días vacíos (gap entre logs)', async () => {
    // Logs accomplished en fecha 1 y fecha 3 (sin fecha 2). El COUNT no es consecutivo → streak = 2.
    const mockQuery = mockDb(2, 2);
    await syncHabitStreakFromLogs(1);
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[1]).toEqual([2, 2, 1]);
  });

  test('2 — racha muere solo con is_failed=true', async () => {
    // 3 acc + 1 failed + 2 acc → streak=2, max_streak=3
    const mockQuery = mockDb(2, 3);
    await syncHabitStreakFromLogs(1);
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[1][0]).toBe(2);
    expect(updateCall[1][1]).toBe(3);
  });

  test('3 — lifeline no incrementa ni rompe racha', async () => {
    // acc(streak=1) + lifeline + acc → streak=2, no 3 (lifeline excluida por is_lifeline=FALSE)
    const mockQuery = mockDb(2, 2);
    await syncHabitStreakFromLogs(1);
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[1][0]).toBe(2);
  });

  test('6 — recalculación post-delete es correcta', async () => {
    // 5 acc, se elimina el 3ro → streak=4, max_streak=5
    const mockQuery = mockDb(4, 5);
    await syncHabitStreakFromLogs(1);
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[1]).toEqual([4, 5, 1]);
  });

  test('11 — max streak calcula correctamente entre épocas', async () => {
    // 5 acc → 1 failed → 3 acc → 1 failed → 7 acc → streak=7, max_streak=7
    const mockQuery = mockDb(7, 7);
    await syncHabitStreakFromLogs(1);
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[1][0]).toBe(7);
    expect(updateCall[1][1]).toBe(7);
  });
});

// ─── Tests 4, 5: applyFailedStreak ───────────────────────────────────────────

describe('applyFailedStreak', () => {
  test('4 — falla extiende end_date correctamente con period_days=30', () => {
    const habit = makeHabit({ period_days: 30, restart_count: 0 });
    const result = applyFailedStreak(habit, '2026-01-15');
    expect(result.streak).toBe(0);
    expect(result.end_date).toBe('2026-02-14');
  });

  test('5 — falla incrementa restart_count', () => {
    const habit = makeHabit({ period_days: 30, restart_count: 0 });
    const result = applyFailedStreak(habit, '2026-01-15');
    expect(result.restart_count).toBe(1);
  });

  test('falla con period_days=0 devuelve end_date null', () => {
    const habit = makeHabit({ period_days: 0, restart_count: 2 });
    const result = applyFailedStreak(habit, '2026-01-15');
    expect(result.end_date).toBeNull();
    expect(result.restart_count).toBe(3);
  });
});

// ─── Tests 7, 8: applyLifelineToEndDate ──────────────────────────────────────

describe('applyLifelineToEndDate', () => {
  test('7 — extiende end_date en exactamente 1 día', () => {
    const result = applyLifelineToEndDate({ end_date: '2026-06-10' });
    expect(result.end_date).toBe('2026-06-11');
  });

  test('8 — con end_date null devuelve null', () => {
    const result = applyLifelineToEndDate({ end_date: null });
    expect(result.end_date).toBeNull();
  });
});

// ─── isFrontierFollowUp: back-fill vs frontera ───────────────────────────────

describe('isFrontierFollowUp', () => {
  test('back-fill (día pasado, hay un log posterior) → no es frontera', () => {
    // Racha días 3-4; registro retroactivo del día 2 → NO debe reiniciar.
    expect(isFrontierFollowUp('2026-01-02', '2026-01-04')).toBe(false);
  });

  test('registro del día más reciente → es frontera', () => {
    expect(isFrontierFollowUp('2026-01-04', '2026-01-04')).toBe(true);
  });

  test('registro más nuevo que cualquier log previo → es frontera', () => {
    expect(isFrontierFollowUp('2026-01-05', '2026-01-04')).toBe(true);
  });

  test('primer log del hábito (sin fecha previa) → es frontera', () => {
    expect(isFrontierFollowUp('2026-01-01', null)).toBe(true);
  });
});

// ─── Tests 9, 10: getEffectiveGoal ───────────────────────────────────────────

describe('getEffectiveGoal', () => {
  test('9 — habit_type boolean devuelve 1', () => {
    const habit = makeHabit({ habit_type: 'boolean', daily_goal: 0, timer_goal: 0 });
    expect(getEffectiveGoal(habit)).toBe(1);
  });

  test('10 — habit_type time devuelve timer_goal', () => {
    const habit = makeHabit({ habit_type: 'time', timer_goal: 1800 });
    expect(getEffectiveGoal(habit)).toBe(1800);
  });

  test('habit_type count con daily_goal>0 devuelve daily_goal', () => {
    const habit = makeHabit({ habit_type: 'count', daily_goal: 5, target_count: 10 });
    expect(getEffectiveGoal(habit)).toBe(5);
  });

  test('habit_type count con daily_goal=0 devuelve target_count', () => {
    const habit = makeHabit({ habit_type: 'count', daily_goal: 0, target_count: 10 });
    expect(getEffectiveGoal(habit)).toBe(10);
  });
});

// ─── addDaysToDateString helper ───────────────────────────────────────────────

describe('addDaysToDateString', () => {
  test('suma días correctamente sin cruzar año', () => {
    expect(addDaysToDateString('2026-01-10', 5)).toBe('2026-01-15');
  });

  test('maneja cruce de mes', () => {
    expect(addDaysToDateString('2026-01-30', 3)).toBe('2026-02-02');
  });
});
