import {
  vidaItemCreateInputSchema,
  vidaItemUpdateInputSchema,
} from '../../../src/validators/schemas/vida.schemas';

const ITEM_ID = '018f0000-0000-7000-8000-000000000001';

describe('vida item schedule validation', () => {
  describe('create', () => {
    it('accepts an item without startTime nor durationMinutes', () => {
      const parsed = vidaItemCreateInputSchema.parse({
        activityId: '7',
        days: ['monday'],
      });

      expect(parsed.startTime).toBeUndefined();
      expect(parsed.durationMinutes).toBeUndefined();
    });

    it('accepts HH:mm and a positive duration', () => {
      const parsed = vidaItemCreateInputSchema.parse({
        activityId: '7',
        days: ['monday'],
        startTime: '07:30',
        durationMinutes: 45,
      });

      expect(parsed.startTime).toBe('07:30');
      expect(parsed.durationMinutes).toBe(45);
    });

    it('rejects an invalid HH:mm startTime', () => {
      for (const startTime of ['7:30', '24:00', '07:60', 'mañana', '0730']) {
        expect(() =>
          vidaItemCreateInputSchema.parse({
            activityId: '7',
            days: ['monday'],
            startTime,
          })
        ).toThrow();
      }
    });

    it('rejects a non-positive or fractional durationMinutes', () => {
      for (const durationMinutes of [0, -15, 12.5]) {
        expect(() =>
          vidaItemCreateInputSchema.parse({
            activityId: '7',
            days: ['monday'],
            durationMinutes,
          })
        ).toThrow();
      }
    });
  });

  describe('update', () => {
    it('accepts startTime alone as the only changed field', () => {
      const parsed = vidaItemUpdateInputSchema.parse({ id: ITEM_ID, startTime: '21:15' });
      expect(parsed.startTime).toBe('21:15');
    });

    it('accepts durationMinutes alone as the only changed field', () => {
      const parsed = vidaItemUpdateInputSchema.parse({ id: ITEM_ID, durationMinutes: 30 });
      expect(parsed.durationMinutes).toBe(30);
    });

    it('accepts null to clear both fields', () => {
      const parsed = vidaItemUpdateInputSchema.parse({
        id: ITEM_ID,
        startTime: null,
        durationMinutes: null,
      });

      expect(parsed.startTime).toBeNull();
      expect(parsed.durationMinutes).toBeNull();
    });

    it('rejects an invalid HH:mm startTime', () => {
      expect(() => vidaItemUpdateInputSchema.parse({ id: ITEM_ID, startTime: '25:00' })).toThrow();
    });

    it('rejects a non-positive durationMinutes', () => {
      expect(() => vidaItemUpdateInputSchema.parse({ id: ITEM_ID, durationMinutes: 0 })).toThrow();
    });

    it('still requires at least one field to update', () => {
      expect(() => vidaItemUpdateInputSchema.parse({ id: ITEM_ID })).toThrow();
    });
  });
});
