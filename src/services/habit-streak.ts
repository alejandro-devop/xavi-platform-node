export type HabitStreakFields = {
  habit_type: 'boolean' | 'count' | 'time';
  daily_goal: number;
  timer_goal: number;
  target_count: number;
  period_days: number;
  restart_count: number;
  streak: number;
  max_streak: number;
  days: number;
  end_date: Date | string | null;
};

export type FollowUpStreakFields = {
  count: number;
  time: number;
};

export function getEffectiveGoal(habit: HabitStreakFields): number {
  switch (habit.habit_type) {
    case 'time':
      return habit.timer_goal;
    case 'count':
      return habit.daily_goal > 0 ? habit.daily_goal : habit.target_count;
    case 'boolean':
    default:
      return 1;
  }
}

export function isFollowUpGoalMet(habit: HabitStreakFields, followUp: FollowUpStreakFields): boolean {
  const goal = getEffectiveGoal(habit);
  if (goal <= 0) return false;
  if (habit.habit_type === 'time') return followUp.time >= goal;
  return followUp.count >= goal;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export function applyFailedStreak(
  habit: HabitStreakFields,
  followUpDate: string
): { streak: 0; end_date: string | null; restart_count: number } {
  const end_date =
    habit.period_days === 0 ? null : addDaysToDateString(followUpDate, habit.period_days);
  return {
    streak: 0,
    end_date,
    restart_count: habit.restart_count + 1,
  };
}

export function applyLifelineToEndDate(
  habit: Pick<HabitStreakFields, 'end_date'>
): { end_date: string | null } {
  if (habit.end_date === null) return { end_date: null };
  const dateStr =
    habit.end_date instanceof Date
      ? habit.end_date.toISOString().split('T')[0]
      : String(habit.end_date).split('T')[0];
  return { end_date: addDaysToDateString(dateStr, 1) };
}

/**
 * ¿El follow-up que se registra es el más reciente del hábito (la "frontera"),
 * o se está rellenando un día pasado (back-fill)?
 *
 * Los efectos de "reinicio" al fallar/usar comodín (archivar historial, resetear
 * `end_date`, incrementar `restart_count`) solo tienen sentido en la frontera: un
 * fallo registrado en un día pasado NO debe reiniciar la racha actual ni archivar
 * los logros posteriores. La racha en sí se recalcula siempre desde los logs.
 *
 * `latestLoggedDate` es el `MAX(completed_date)` (no archivado) del hábito, ya
 * incluyendo el log recién escrito. Fechas en formato `YYYY-MM-DD` (comparación
 * lexicográfica = cronológica).
 */
export function isFrontierFollowUp(date: string, latestLoggedDate: string | null): boolean {
  return latestLoggedDate === null || date >= latestLoggedDate;
}
