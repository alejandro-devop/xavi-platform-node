/** Parse HH:mm or HH:mm:ss to minutes since midnight. */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(':').map((p) => parseInt(p, 10));
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const seconds = parts[2] ?? 0;
  return hours * 60 + minutes + Math.floor(seconds / 60);
}

/** Format minutes since midnight as HH:mm:ss (wraps at 24h). */
function formatMinutesToTime(totalMinutes: number): string {
  const minsInDay = 24 * 60;
  const wrapped = ((totalMinutes % minsInDay) + minsInDay) % minsInDay;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ActivityFollowUpEndComputed = {
  endDate: string;
  endTime: string;
  endDateTime: string;
};

/**
 * End time is not stored in DB; derived from date + start_time + duration_minutes.
 */
export function computeActivityFollowUpEnd(
  date: string,
  startTime: string,
  durationMinutes: number
): ActivityFollowUpEndComputed {
  const normalizedStart =
    startTime.length === 5 && startTime.includes(':') ? `${startTime}:00` : startTime;
  const startMins = parseTimeToMinutes(normalizedStart);
  const endMins = startMins + durationMinutes;
  const dayOffset = Math.floor(endMins / (24 * 60));
  const endDate = dayOffset > 0 ? addDaysToDateString(date, dayOffset) : date;
  const endTime = formatMinutesToTime(endMins);
  const endDateTime = `${endDate}T${endTime}`;
  return { endDate, endTime, endDateTime };
}

/** Normalize DB TIME / string to HH:mm:ss for API. */
export function formatStartTimeForApi(startTime: string | Date): string {
  if (startTime instanceof Date) {
    return startTime.toISOString().slice(11, 19);
  }
  const s = String(startTime);
  if (s.length === 5 && s.includes(':')) {
    return `${s}:00`;
  }
  return s.length >= 8 ? s.slice(0, 8) : s;
}
