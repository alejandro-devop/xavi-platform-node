import {
  calendarDaysBetween,
  computeSessionXp,
  levelFromXp,
  nextStreak,
  WORKOUT_LEVEL_THRESHOLDS,
} from '../../../src/services/workout-game';

describe('workout-game', () => {
  describe('computeSessionXp', () => {
    it('returns 0 without valid sets', () => {
      expect(computeSessionXp(0, 500)).toBe(0);
    });

    it('awards base + set bonus + volume bonus', () => {
      // 50 + min(50, 4*5)=20 + min(100, floor(250/100)*5)=10 → 80
      expect(computeSessionXp(4, 250)).toBe(80);
    });

    it('caps set and volume bonuses', () => {
      // 50 + 50 + 100 = 200
      expect(computeSessionXp(20, 10_000)).toBe(200);
    });
  });

  describe('levelFromXp', () => {
    it('starts at level 1', () => {
      expect(levelFromXp(0)).toEqual({
        level: 1,
        xpIntoLevel: 0,
        xpForNextLevel: WORKOUT_LEVEL_THRESHOLDS[1]! - WORKOUT_LEVEL_THRESHOLDS[0]!,
      });
    });

    it('crosses into level 2 at 100 XP', () => {
      const info = levelFromXp(100);
      expect(info.level).toBe(2);
      expect(info.xpIntoLevel).toBe(0);
      expect(info.xpForNextLevel).toBe(WORKOUT_LEVEL_THRESHOLDS[2]! - WORKOUT_LEVEL_THRESHOLDS[1]!);
    });

    it('reports 0 xpForNextLevel at max threshold', () => {
      const max = WORKOUT_LEVEL_THRESHOLDS[WORKOUT_LEVEL_THRESHOLDS.length - 1]!;
      const info = levelFromXp(max + 50);
      expect(info.level).toBe(WORKOUT_LEVEL_THRESHOLDS.length);
      expect(info.xpForNextLevel).toBe(0);
      expect(info.xpIntoLevel).toBe(50);
    });
  });

  describe('nextStreak', () => {
    it('starts at 1', () => {
      expect(nextStreak(null, '2026-07-17', 0)).toBe(1);
    });

    it('increments on consecutive day', () => {
      expect(nextStreak('2026-07-16', '2026-07-17', 3)).toBe(4);
    });

    it('keeps streak on same day', () => {
      expect(nextStreak('2026-07-17', '2026-07-17', 3)).toBe(3);
    });

    it('resets after a gap', () => {
      expect(nextStreak('2026-07-10', '2026-07-17', 5)).toBe(1);
    });
  });

  describe('calendarDaysBetween', () => {
    it('counts calendar days', () => {
      expect(calendarDaysBetween('2026-07-16', '2026-07-17')).toBe(1);
      expect(calendarDaysBetween('2026-07-01', '2026-07-17')).toBe(16);
    });
  });
});
