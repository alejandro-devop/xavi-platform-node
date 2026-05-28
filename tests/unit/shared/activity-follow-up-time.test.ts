import {
  computeActivityFollowUpEnd,
  formatStartTimeForApi,
} from '../../../src/shared/utils/activity-follow-up-time';

describe('activity-follow-up-time', () => {
  it('computes end time on same day', () => {
    const end = computeActivityFollowUpEnd('2026-05-20', '09:30:00', 90);
    expect(end.endDate).toBe('2026-05-20');
    expect(end.endTime).toBe('11:00:00');
    expect(end.endDateTime).toBe('2026-05-20T11:00:00');
  });

  it('computes end date when crossing midnight', () => {
    const end = computeActivityFollowUpEnd('2026-05-20', '23:00:00', 120);
    expect(end.endDate).toBe('2026-05-21');
    expect(end.endTime).toBe('01:00:00');
  });

  it('normalizes HH:mm start time', () => {
    const end = computeActivityFollowUpEnd('2026-05-20', '09:30', 30);
    expect(end.endTime).toBe('10:00:00');
  });

  it('formats short time strings for API', () => {
    expect(formatStartTimeForApi('09:15')).toBe('09:15:00');
    expect(formatStartTimeForApi('09:15:30')).toBe('09:15:30');
  });
});
