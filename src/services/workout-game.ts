/**
 * XP / nivel / racha — reglas puras de la capa juego (Fase 8).
 *
 * Set válido: weightKg ≥ 0 y reps ≥ 1 (ya enforced en DB).
 * Award idempotente por session_id (una vez al cerrar el follow-up).
 */

export const WORKOUT_LEVEL_THRESHOLDS: readonly number[] = [
  0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000, 6500, 8500, 11000,
] as const;

export interface WorkoutLevelInfo {
  level: number;
  xpIntoLevel: number;
  /** 0 si está en el nivel máximo definido. */
  xpForNextLevel: number;
}

/**
 * XP por sesión cerrada con ≥1 set válido.
 * base 50 + 5/set (max 50) + 5 por cada 100 kg de volumen (max 100).
 */
export function computeSessionXp(validSetCount: number, volumeKg: number): number {
  if (validSetCount < 1) return 0;
  const base = 50;
  const setBonus = Math.min(50, validSetCount * 5);
  const volumeBonus = Math.min(100, Math.floor(Math.max(0, volumeKg) / 100) * 5);
  return base + setBonus + volumeBonus;
}

export function levelFromXp(totalXp: number): WorkoutLevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  for (let i = WORKOUT_LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (xp >= WORKOUT_LEVEL_THRESHOLDS[i]!) {
      level = i + 1;
      break;
    }
  }
  const currentThreshold = WORKOUT_LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = WORKOUT_LEVEL_THRESHOLDS[level];
  const xpIntoLevel = xp - currentThreshold;
  const xpForNextLevel =
    nextThreshold === undefined ? 0 : nextThreshold - currentThreshold;
  return { level, xpIntoLevel, xpForNextLevel };
}

/** Diferencia en días de calendario (YYYY-MM-DD), b − a. */
export function calendarDaysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    throw new Error(`Invalid date for streak: ${earlier} / ${later}`);
  }
  return Math.round((b - a) / 86_400_000);
}

export function nextStreak(
  lastWorkoutDate: string | null,
  awardDate: string,
  currentStreak: number
): number {
  if (!lastWorkoutDate) return 1;
  const delta = calendarDaysBetween(lastWorkoutDate, awardDate);
  if (delta === 0) return Math.max(1, currentStreak);
  if (delta === 1) return currentStreak + 1;
  return 1;
}
