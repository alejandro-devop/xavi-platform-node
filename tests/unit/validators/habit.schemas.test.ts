import {
  habitFollowUpAddInputSchema,
  habitFollowUpEditInputSchema,
} from '../../../src/validators/schemas/habit.schemas';

describe('habit follow-up timeOfDay validation', () => {
  it('accepts HH:mm when adding a follow-up', () => {
    const parsed = habitFollowUpAddInputSchema.parse({
      habitId: '5',
      date: '2026-09-24',
      timeOfDay: '22:15',
    });

    expect(parsed.timeOfDay).toBe('22:15');
  });

  it('accepts a follow-up without timeOfDay, as every client sent until now', () => {
    const parsed = habitFollowUpAddInputSchema.parse({ habitId: '5', isAccomplished: true });

    expect(parsed.timeOfDay).toBeUndefined();
  });

  it('accepts null when adding: there is no earlier time to keep, so it means "no time"', () => {
    const parsed = habitFollowUpAddInputSchema.parse({ habitId: '5', timeOfDay: null });

    expect(parsed.timeOfDay).toBeNull();
  });

  it('rejects impossible or malformed clock times', () => {
    for (const bad of ['24:00', '99:99', '7:5', '22h15', '']) {
      expect(habitFollowUpAddInputSchema.safeParse({ habitId: '5', timeOfDay: bad }).success).toBe(
        false
      );
    }
  });

  it('lets an edit carry only the id and the time', () => {
    const parsed = habitFollowUpEditInputSchema.parse({ id: '12', timeOfDay: '07:05' });

    expect(parsed).toEqual({ id: '12', timeOfDay: '07:05' });
  });

  it('lets an edit carry only the id and an empty time, which is how a time gets erased', () => {
    const parsed = habitFollowUpEditInputSchema.parse({ id: '12', timeOfDay: null });

    expect(parsed).toEqual({ id: '12', timeOfDay: null });
  });

  it('tells apart "the field did not travel" from "it travelled empty"', () => {
    const untouched = habitFollowUpEditInputSchema.parse({ id: '12', notes: 'otra cosa' });
    const cleared = habitFollowUpEditInputSchema.parse({ id: '12', timeOfDay: null });

    expect(untouched.timeOfDay).toBeUndefined();
    expect(cleared.timeOfDay).toBeNull();
  });

  it('still requires at least one field besides the id', () => {
    expect(habitFollowUpEditInputSchema.safeParse({ id: '12' }).success).toBe(false);
  });
});
