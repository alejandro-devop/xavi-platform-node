import { updateUserSettingsInputSchema } from '../../../src/validators/schemas/user-settings.schemas';

describe('user settings Vida day hours validation', () => {
  it('accepts HH:mm for both hours', () => {
    const parsed = updateUserSettingsInputSchema.parse({
      vidaDayStartTime: '06:30',
      vidaDayEndTime: '23:00',
    });

    expect(parsed.vidaDayStartTime).toBe('06:30');
    expect(parsed.vidaDayEndTime).toBe('23:00');
  });

  it('accepts null to clear both hours', () => {
    const parsed = updateUserSettingsInputSchema.parse({
      vidaDayStartTime: null,
      vidaDayEndTime: null,
    });

    expect(parsed.vidaDayStartTime).toBeNull();
    expect(parsed.vidaDayEndTime).toBeNull();
  });

  it('leaves both hours untouched when they are not sent', () => {
    const parsed = updateUserSettingsInputSchema.parse({ hideHiddenHabits: true });

    expect(parsed.vidaDayStartTime).toBeUndefined();
    expect(parsed.vidaDayEndTime).toBeUndefined();
  });

  it('rejects an invalid HH:mm value', () => {
    for (const value of ['6:30', 'noche', '0630']) {
      expect(() => updateUserSettingsInputSchema.parse({ vidaDayStartTime: value })).toThrow();
      expect(() => updateUserSettingsInputSchema.parse({ vidaDayEndTime: value })).toThrow();
    }
  });
});

describe('user settings Vida Pomodoro validation', () => {
  const CAT_A = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';
  const CAT_B = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c';

  function pomodoro(overrides: Record<string, unknown> = {}) {
    return {
      enabled: true,
      categoryIds: [CAT_A],
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      ...overrides,
    };
  }

  it('accepts a full Pomodoro with long break', () => {
    const parsed = updateUserSettingsInputSchema.parse({ vidaPomodoro: pomodoro() });

    expect(parsed.vidaPomodoro).toEqual(pomodoro());
  });

  it('accepts a Pomodoro without long break (both null or both omitted)', () => {
    const withNulls = updateUserSettingsInputSchema.parse({
      vidaPomodoro: pomodoro({ longBreakMinutes: null, longBreakEvery: null }),
    });
    expect(withNulls.vidaPomodoro?.longBreakMinutes).toBeNull();
    expect(withNulls.vidaPomodoro?.longBreakEvery).toBeNull();

    const { longBreakMinutes: _m, longBreakEvery: _e, ...withoutLongBreak } = pomodoro();
    const omitted = updateUserSettingsInputSchema.parse({ vidaPomodoro: withoutLongBreak });
    expect(omitted.vidaPomodoro?.longBreakMinutes).toBeNull();
    expect(omitted.vidaPomodoro?.longBreakEvery).toBeNull();
  });

  it('accepts the range limits', () => {
    expect(() =>
      updateUserSettingsInputSchema.parse({
        vidaPomodoro: pomodoro({
          workMinutes: 5,
          breakMinutes: 1,
          longBreakMinutes: 1,
          longBreakEvery: 2,
        }),
      })
    ).not.toThrow();
    expect(() =>
      updateUserSettingsInputSchema.parse({
        vidaPomodoro: pomodoro({
          workMinutes: 240,
          breakMinutes: 60,
          longBreakMinutes: 120,
          longBreakEvery: 10,
        }),
      })
    ).not.toThrow();
  });

  it('accepts null to clear and leaves it untouched when omitted', () => {
    expect(updateUserSettingsInputSchema.parse({ vidaPomodoro: null }).vidaPomodoro).toBeNull();

    const omitted = updateUserSettingsInputSchema.parse({ hideHiddenHabits: true });
    expect('vidaPomodoro' in omitted).toBe(false);
  });

  it('removes duplicated categories', () => {
    const parsed = updateUserSettingsInputSchema.parse({
      vidaPomodoro: pomodoro({ categoryIds: [CAT_A, CAT_B, CAT_A] }),
    });

    expect(parsed.vidaPomodoro?.categoryIds).toEqual([CAT_A, CAT_B]);
  });

  it('accepts an empty category list', () => {
    const parsed = updateUserSettingsInputSchema.parse({
      vidaPomodoro: pomodoro({ categoryIds: [] }),
    });

    expect(parsed.vidaPomodoro?.categoryIds).toEqual([]);
  });

  it.each([
    ['workMinutes below 5', { workMinutes: 4 }],
    ['workMinutes above 240', { workMinutes: 241 }],
    ['workMinutes decimal', { workMinutes: 25.5 }],
    ['breakMinutes below 1', { breakMinutes: 0 }],
    ['breakMinutes above 60', { breakMinutes: 61 }],
    ['longBreakMinutes below 1', { longBreakMinutes: 0 }],
    ['longBreakMinutes above 120', { longBreakMinutes: 121 }],
    ['longBreakEvery below 2', { longBreakEvery: 1 }],
    ['longBreakEvery above 10', { longBreakEvery: 11 }],
    ['numeric category id', { categoryIds: ['42'] }],
    ['non-uuid category id', { categoryIds: ['casa'] }],
    ['more than 50 categories', { categoryIds: Array.from({ length: 51 }, () => CAT_A) }],
    ['missing enabled', { enabled: undefined }],
  ])('rejects %s', (_label, overrides) => {
    expect(() =>
      updateUserSettingsInputSchema.parse({ vidaPomodoro: pomodoro(overrides) })
    ).toThrow();
  });

  it('rejects a long break with only one of its two fields', () => {
    expect(() =>
      updateUserSettingsInputSchema.parse({
        vidaPomodoro: pomodoro({ longBreakMinutes: 15, longBreakEvery: null }),
      })
    ).toThrow(/both set or both null/);
    expect(() =>
      updateUserSettingsInputSchema.parse({
        vidaPomodoro: pomodoro({ longBreakMinutes: null, longBreakEvery: 4 }),
      })
    ).toThrow(/both set or both null/);

    const { longBreakEvery: _e, ...onlyMinutes } = pomodoro();
    expect(() => updateUserSettingsInputSchema.parse({ vidaPomodoro: onlyMinutes })).toThrow(
      /both set or both null/
    );
  });
});
