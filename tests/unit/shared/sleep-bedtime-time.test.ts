import { extractBedtimeStartTime } from '../../../src/shared/utils/sleep-bedtime-time';

describe('extractBedtimeStartTime', () => {
  it('uses wall-clock time from offset-aware ISO strings', () => {
    expect(extractBedtimeStartTime('2024-06-01T00:00:00-05:00')).toBe('00:00:00');
    expect(extractBedtimeStartTime('2024-06-01T08:20:00-05:00')).toBe('08:20:00');
  });

  it('uses wall-clock time from naive local datetime strings', () => {
    expect(extractBedtimeStartTime('2024-06-01T00:00:00')).toBe('00:00:00');
  });

  it('uses plain HH:mm strings for follow-up start time', () => {
    expect(extractBedtimeStartTime('00:30')).toBe('00:30:00');
  });

  it('reads UTC ISO strings literally when no wall-clock field is provided', () => {
    expect(extractBedtimeStartTime('2026-06-23T05:30:00.000Z')).toBe('05:30:00');
  });
});
