/**
 * Puesta al día (FEAT-024, 2026-09-24).
 *
 * Esta suite llevaba meses sin compilar: afirmaba sobre la forma vieja del
 * hábito (`is_counter` / `is_timer` / `is_incremental` / `is_decremental`) y
 * sobre dos exports que **ya no existen** en `src/services/habit-streak.ts`:
 *
 *  - `applyAccomplishedStreak(habit)` → la racha ya no se incrementa en
 *    memoria: se **recalcula desde los logs** en `syncHabitStreakFromLogs`
 *    (`src/services/habit.service.ts`), cubierta por
 *    `src/services/habit-streak.test.ts` (casos 1, 2, 3, 6 y 11).
 *  - `recalculateStreakFromDates(dates)` → esa aritmética vive hoy en SQL,
 *    dentro de la misma `syncHabitStreakFromLogs`.
 *
 * Sus dos casos no se han «traducido»: su sujeto desapareció del código. Lo
 * que sí se conserva y se pone al día es lo que esta suite cubre y ninguna
 * otra: `isFollowUpGoalMet` para los tres `habit_type`.
 */
import {
  applyFailedStreak,
  getEffectiveGoal,
  isFollowUpGoalMet,
} from '../../../src/services/habit-streak';
import type { HabitStreakFields } from '../../../src/services/habit-streak';

// El hábito de referencia: contador con meta diaria de 8.
const baseHabit: HabitStreakFields = {
  habit_type: 'count',
  daily_goal: 8,
  timer_goal: 0,
  target_count: 8,
  period_days: 30,
  restart_count: 0,
  streak: 3,
  max_streak: 5,
  days: 10,
  end_date: null,
};

describe('habit-streak', () => {
  it('getEffectiveGoal uses timer_goal when habit_type is time', () => {
    expect(getEffectiveGoal({ ...baseHabit, habit_type: 'time', timer_goal: 30 })).toBe(30);
  });

  it('isFollowUpGoalMet returns false when goal is 0', () => {
    expect(
      isFollowUpGoalMet({ ...baseHabit, daily_goal: 0, target_count: 0 }, { count: 5, time: 0 })
    ).toBe(false);
  });

  it('isFollowUpGoalMet for a count habit compares count', () => {
    expect(isFollowUpGoalMet(baseHabit, { count: 8, time: 0 })).toBe(true);
    expect(isFollowUpGoalMet(baseHabit, { count: 7, time: 0 })).toBe(false);
  });

  it('isFollowUpGoalMet for a time habit compares time, not count', () => {
    const timed: HabitStreakFields = { ...baseHabit, habit_type: 'time', timer_goal: 1800 };
    expect(isFollowUpGoalMet(timed, { count: 99, time: 1799 })).toBe(false);
    expect(isFollowUpGoalMet(timed, { count: 0, time: 1800 })).toBe(true);
  });

  it('isFollowUpGoalMet for a boolean habit needs one single count', () => {
    const flag: HabitStreakFields = { ...baseHabit, habit_type: 'boolean' };
    expect(isFollowUpGoalMet(flag, { count: 0, time: 0 })).toBe(false);
    expect(isFollowUpGoalMet(flag, { count: 1, time: 0 })).toBe(true);
  });

  it('applyFailedStreak resets streak and extends end_date by period_days', () => {
    // Ojo: la versión vieja de este caso pasaba `days: 7` y esperaba +7 días.
    // Hoy el periodo sale de `period_days`, no de `days` (los días registrados).
    const result = applyFailedStreak({ ...baseHabit, period_days: 7, days: 999 }, '2026-05-19');
    expect(result.streak).toBe(0);
    expect(result.end_date).toBe('2026-05-26');
    expect(result.restart_count).toBe(baseHabit.restart_count + 1);
  });

  it('applyFailedStreak ignores days: only period_days moves end_date', () => {
    const a = applyFailedStreak({ ...baseHabit, period_days: 7, days: 0 }, '2026-05-19');
    const b = applyFailedStreak({ ...baseHabit, period_days: 7, days: 400 }, '2026-05-19');
    expect(a.end_date).toBe(b.end_date);
  });
});
