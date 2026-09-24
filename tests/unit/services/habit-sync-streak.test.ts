/**
 * Puesta al día (FEAT-024, 2026-09-24).
 *
 * Esta suite sí compilaba, pero afirmaba sobre una implementación que ya no
 * existe: daba por hecho que `syncHabitStreakFromLogs` leía **las fechas** de
 * los logs (`rows: [{ completed_date }]`) y contaba la racha en JavaScript, y
 * que el UPDATE final recibía `days` **como parámetro**
 * (`arrayContaining([2, 2, 5, 10])`).
 *
 * Hoy la racha se calcula en SQL: una consulta para `streak` (logros desde el
 * último `is_failed`), otra para `max_streak` (el máximo entre épocas) y un
 * UPDATE que recibe solo `[streak, max_streak, habitId]` y resuelve `days`
 * con una subconsulta. Las afirmaciones se reescriben contra eso.
 */
import { syncHabitStreakFromLogs } from '../../../src/services/habit.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const HABIT_ID = 10;

describe('syncHabitStreakFromLogs', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  it('updates streak, max_streak and days from accomplished logs', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [{ streak: 2 }] })
      .mockResolvedValueOnce({ rows: [{ max_streak: 5 }] })
      .mockResolvedValueOnce({ rows: [] });

    await syncHabitStreakFromLogs(HABIT_ID);

    expect(mockDbPool.query).toHaveBeenCalledTimes(3);
    expect(mockDbPool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE habits'),
      [2, 5, HABIT_ID]
    );

    // `days` ya no viaja como parámetro: lo cuenta la propia sentencia.
    const updateSql = String(mockDbPool.query.mock.calls[2][0]);
    expect(updateSql).toContain('days = (SELECT COUNT(*) FROM habit_logs');
    expect(updateSql).toContain('max_streak = GREATEST(max_streak, $2)');
  });

  it('counts the streak only from the last failure onwards', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [{ streak: 0 }] })
      .mockResolvedValueOnce({ rows: [{ max_streak: 9 }] })
      .mockResolvedValueOnce({ rows: [] });

    await syncHabitStreakFromLogs(HABIT_ID);

    const streakSql = String(mockDbPool.query.mock.calls[0][0]);
    expect(streakSql).toContain('is_accomplished = TRUE');
    expect(streakSql).toContain('is_lifeline = FALSE');
    expect(streakSql).toContain('is_failed = TRUE');

    // Un max_streak histórico mayor que la racha viva no se pierde.
    expect(mockDbPool.query).toHaveBeenNthCalledWith(3, expect.any(String), [0, 9, HABIT_ID]);
  });
});
