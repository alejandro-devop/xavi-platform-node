import {
  vidaGoalCategorySetInputSchema,
  vidaGoalDaysSetInputSchema,
  vidaItemCreateInputSchema,
  vidaItemUpdateInputSchema,
} from '../../../src/validators/schemas/vida.schemas';

const ITEM_ID = '018f0000-0000-7000-8000-000000000001';
const CATEGORY_ID = '018f0000-0000-7000-8000-0000000000a9';
const GOAL_ID = '018f0000-0000-7000-8000-0000000000b3';

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

describe('vidaGoalCategorySetInputSchema', () => {
  it('accepts attaching without an explicit goal', () => {
    const parsed = vidaGoalCategorySetInputSchema.parse({
      categoryId: CATEGORY_ID,
      attached: true,
    });

    expect(parsed.attached).toBe(true);
    expect(parsed.goalId).toBeUndefined();
  });

  it('accepts detaching', () => {
    const parsed = vidaGoalCategorySetInputSchema.parse({
      categoryId: CATEGORY_ID,
      attached: false,
    });

    expect(parsed.attached).toBe(false);
  });

  it('accepts an explicit goalId', () => {
    const parsed = vidaGoalCategorySetInputSchema.parse({
      categoryId: CATEGORY_ID,
      attached: true,
      goalId: GOAL_ID,
    });

    expect(parsed.goalId).toBe(GOAL_ID);
  });

  it('rejects a missing attached', () => {
    expect(() => vidaGoalCategorySetInputSchema.parse({ categoryId: CATEGORY_ID })).toThrow();
  });

  it('rejects a categoryId that is not a UUID', () => {
    expect(() =>
      vidaGoalCategorySetInputSchema.parse({ categoryId: 'nope', attached: true })
    ).toThrow();
  });
});

describe('vidaGoalDaysSetInputSchema', () => {
  it('accepts the five working days', () => {
    const parsed = vidaGoalDaysSetInputSchema.parse({
      goalId: GOAL_ID,
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    });

    expect(parsed.activeDays).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  });

  it('accepts a single day', () => {
    expect(
      vidaGoalDaysSetInputSchema.parse({ goalId: GOAL_ID, activeDays: ['sunday'] }).activeDays
    ).toEqual(['sunday']);
  });

  it('rejects an empty array: a goal with no days could never be measured', () => {
    expect(() => vidaGoalDaysSetInputSchema.parse({ goalId: GOAL_ID, activeDays: [] })).toThrow(
      /At least one day is required/
    );
  });

  it('rejects duplicates', () => {
    expect(() =>
      vidaGoalDaysSetInputSchema.parse({ goalId: GOAL_ID, activeDays: ['monday', 'monday'] })
    ).toThrow(/duplicates/);
  });

  it('rejects an unknown day', () => {
    expect(() =>
      vidaGoalDaysSetInputSchema.parse({ goalId: GOAL_ID, activeDays: ['lunes'] })
    ).toThrow();
  });

  it('rejects a goalId that is not a UUID, and a missing activeDays', () => {
    expect(() =>
      vidaGoalDaysSetInputSchema.parse({ goalId: 'nope', activeDays: ['monday'] })
    ).toThrow();
    expect(() => vidaGoalDaysSetInputSchema.parse({ goalId: GOAL_ID })).toThrow();
  });
});
