import { formatStartTimeForApi } from './activity-follow-up-time';

/**
 * Extracts wall-clock start time (HH:mm:ss) from a sleep bedtime value.
 * Prefers the literal time in offset-aware / naive ISO strings from the client.
 */
export function extractBedtimeStartTime(bedtime: Date | string): string {
  if (typeof bedtime === 'string') {
    const wallClockMatch = bedtime.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (wallClockMatch) {
      const seconds = wallClockMatch[3] ?? '00';
      return formatStartTimeForApi(`${wallClockMatch[1]}:${wallClockMatch[2]}:${seconds}`);
    }

    const isoMatch = bedtime.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (isoMatch) {
      const seconds = isoMatch[3] ?? '00';
      return formatStartTimeForApi(`${isoMatch[1]}:${isoMatch[2]}:${seconds}`);
    }

    const parsed = new Date(bedtime);
    if (!Number.isNaN(parsed.getTime())) {
      const hours = String(parsed.getHours()).padStart(2, '0');
      const minutes = String(parsed.getMinutes()).padStart(2, '0');
      return formatStartTimeForApi(`${hours}:${minutes}`);
    }
    return '00:00:00';
  }

  const hours = String(bedtime.getHours()).padStart(2, '0');
  const minutes = String(bedtime.getMinutes()).padStart(2, '0');
  return formatStartTimeForApi(`${hours}:${minutes}`);
}
