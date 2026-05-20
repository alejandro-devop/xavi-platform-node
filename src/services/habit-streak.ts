export type HabitStreakFields = {
  is_counter: boolean;
  is_timer: boolean;
  is_incremental: boolean;
  is_decremental: boolean;
  daily_goal: number;
  timer_goal: number;
  times_goal: number;
  target_count: number;
  streak: number;
  max_streak: number;
  days: number;
  end_date: Date | string | null;
};

export type FollowUpStreakFields = {
  count: number;
  time: number;
};

/** Effective daily goal for streak checks (0 = no streak per spec). */
export function getEffectiveGoal(habit: HabitStreakFields): number {
  if (habit.is_timer) {
    return habit.timer_goal;
  }
  if (habit.is_incremental || habit.is_decremental) {
    return habit.times_goal;
  }
  if (habit.is_counter) {
    return habit.daily_goal > 0 ? habit.daily_goal : habit.target_count;
  }
  return habit.daily_goal > 0 ? habit.daily_goal : habit.target_count;
}

export function isFollowUpGoalMet(habit: HabitStreakFields, followUp: FollowUpStreakFields): boolean {
  const goal = getEffectiveGoal(habit);
  if (goal <= 0) {
    return false;
  }
  if (habit.is_timer) {
    return followUp.time >= goal;
  }
  return followUp.count >= goal;
}

export function applyAccomplishedStreak(habit: HabitStreakFields): {
  streak: number;
  max_streak: number;
  days: number;
} {
  const streak = habit.streak + 1;
  const max_streak = Math.max(habit.max_streak, streak);
  return {
    streak,
    max_streak,
    days: habit.days + 1,
  };
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export function applyFailedStreak(
  habit: HabitStreakFields,
  followUpDate: string
): { streak: number; end_date: string } {
  const extensionDays = habit.days > 0 ? habit.days : 0;
  return {
    streak: 0,
    end_date: addDaysToDateString(followUpDate, extensionDays),
  };
}

/**
 * Recompute streak from non-archived accomplished follow-ups (by date, consecutive).
 * Used after follow-up delete when full recalc is needed.
 */
export function recalculateStreakFromDates(accomplishedDates: string[]): {
  streak: number;
  max_streak: number;
} {
  if (accomplishedDates.length === 0) {
    return { streak: 0, max_streak: 0 };
  }

  const sorted = [...accomplishedDates].sort((a, b) => b.localeCompare(a));
  let currentRun = 1;
  let maxRun = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
    const curr = new Date(sorted[i] + 'T00:00:00Z');
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else if (diffDays > 1) {
      maxRun = Math.max(maxRun, currentRun);
      currentRun = 1;
    }
  }

  maxRun = Math.max(maxRun, currentRun);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const latest = new Date(sorted[0] + 'T00:00:00Z');
  latest.setHours(0, 0, 0, 0);

  let activeStreak = 0;
  if (latest.getTime() === today.getTime() || latest.getTime() === yesterday.getTime()) {
    activeStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
      const curr = new Date(sorted[i] + 'T00:00:00Z');
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        activeStreak++;
      } else {
        break;
      }
    }
  }

  return { streak: activeStreak, max_streak: maxRun };
}
