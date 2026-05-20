import {
  applyAccomplishedStreak,
  applyFailedStreak,
  getEffectiveGoal,
  isFollowUpGoalMet,
  recalculateStreakFromDates,
} from '../../../src/services/habit-streak';

const baseHabit = {
  is_counter: true,
  is_timer: false,
  is_incremental: false,
  is_decremental: false,
  daily_goal: 8,
  timer_goal: 0,
  times_goal: 0,
  target_count: 8,
  streak: 3,
  max_streak: 5,
  days: 10,
  end_date: null,
};

describe('habit-streak', () => {
  it('getEffectiveGoal uses timer_goal when is_timer', () => {
    expect(
      getEffectiveGoal({ ...baseHabit, is_timer: true, is_counter: false, timer_goal: 30 })
    ).toBe(30);
  });

  it('isFollowUpGoalMet returns false when goal is 0', () => {
    expect(isFollowUpGoalMet({ ...baseHabit, daily_goal: 0, target_count: 0 }, { count: 5, time: 0 })).toBe(
      false
    );
  });

  it('isFollowUpGoalMet for counter compares count', () => {
    expect(isFollowUpGoalMet(baseHabit, { count: 8, time: 0 })).toBe(true);
    expect(isFollowUpGoalMet(baseHabit, { count: 7, time: 0 })).toBe(false);
  });

  it('applyAccomplishedStreak increments streak and max', () => {
    const result = applyAccomplishedStreak(baseHabit);
    expect(result.streak).toBe(4);
    expect(result.max_streak).toBe(5);
    expect(result.days).toBe(11);
  });

  it('applyFailedStreak resets streak and extends end_date', () => {
    const result = applyFailedStreak({ ...baseHabit, days: 7 }, '2026-05-19');
    expect(result.streak).toBe(0);
    expect(result.end_date).toBe('2026-05-26');
  });

  it('recalculateStreakFromDates returns 0 for empty', () => {
    expect(recalculateStreakFromDates([])).toEqual({ streak: 0, max_streak: 0 });
  });
});
