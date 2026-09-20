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
