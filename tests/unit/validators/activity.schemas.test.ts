import { activityFollowUpEditInputSchema } from '../../../src/validators/schemas/activity.schemas';

const FOLLOW_UP_ID = '3';

describe('activityFollowUpEditInputSchema — durationMinutes', () => {
  it('drops the key when the field is absent (meaning: do not touch it)', () => {
    const parsed = activityFollowUpEditInputSchema.parse({
      id: FOLLOW_UP_ID,
      notes: 'una nota',
    });

    expect('durationMinutes' in parsed).toBe(false);
    expect(parsed.durationMinutes).toBeUndefined();
  });

  it('keeps an explicit null (meaning: reopen the session)', () => {
    const parsed = activityFollowUpEditInputSchema.parse({
      id: FOLLOW_UP_ID,
      durationMinutes: null,
    });

    expect('durationMinutes' in parsed).toBe(true);
    expect(parsed.durationMinutes).toBeNull();
  });

  it('accepts a positive duration (meaning: close the session)', () => {
    const parsed = activityFollowUpEditInputSchema.parse({
      id: FOLLOW_UP_ID,
      durationMinutes: 45,
    });

    expect(parsed.durationMinutes).toBe(45);
  });

  it('rejects zero, negatives, decimals and more than a day', () => {
    for (const durationMinutes of [0, -30, 12.5, 24 * 60 + 1]) {
      expect(() =>
        activityFollowUpEditInputSchema.parse({ id: FOLLOW_UP_ID, durationMinutes })
      ).toThrow();
    }
  });

  it('counts an explicit null as a field present for the "at least one field" rule', () => {
    expect(() => activityFollowUpEditInputSchema.parse({ id: FOLLOW_UP_ID })).toThrow(
      /At least one field/
    );

    expect(() =>
      activityFollowUpEditInputSchema.parse({ id: FOLLOW_UP_ID, durationMinutes: null })
    ).not.toThrow();
  });
});

describe('activityFollowUpEditInputSchema — pomodoroBlocks / pomodoroBreaks', () => {
  it('accepts the counts on their own as the field to update', () => {
    const parsed = activityFollowUpEditInputSchema.parse({
      id: FOLLOW_UP_ID,
      pomodoroBlocks: 4,
    });
    expect(parsed.pomodoroBlocks).toBe(4);

    expect(() =>
      activityFollowUpEditInputSchema.parse({ id: FOLLOW_UP_ID, pomodoroBreaks: 0 })
    ).not.toThrow();
  });

  it('keeps an explicit null and counts it for the "at least one field" rule', () => {
    const parsed = activityFollowUpEditInputSchema.parse({
      id: FOLLOW_UP_ID,
      pomodoroBlocks: null,
      pomodoroBreaks: null,
    });

    expect(parsed.pomodoroBlocks).toBeNull();
    expect(parsed.pomodoroBreaks).toBeNull();
  });

  it('drops the keys when absent', () => {
    const parsed = activityFollowUpEditInputSchema.parse({ id: FOLLOW_UP_ID, notes: 'x' });

    expect('pomodoroBlocks' in parsed).toBe(false);
    expect('pomodoroBreaks' in parsed).toBe(false);
  });

  it('rejects negatives, decimals and more than 100', () => {
    for (const value of [-1, 2.5, 101]) {
      expect(() =>
        activityFollowUpEditInputSchema.parse({ id: FOLLOW_UP_ID, pomodoroBlocks: value })
      ).toThrow();
      expect(() =>
        activityFollowUpEditInputSchema.parse({ id: FOLLOW_UP_ID, pomodoroBreaks: value })
      ).toThrow();
    }
  });
});
