import { getDbPool } from '../shared/database/pool';
import { extractBedtimeStartTime } from '../shared/utils/sleep-bedtime-time';
import { activityFollowUpService } from './activity-follow-up.service';
import { activityService } from './activity.service';
import { userSettingsService } from './user-settings.service';

const SLEEP_ACTIVITY_TITLE = 'Sueño';

type SleepLogSyncRow = {
  id: number;
  user_id: number;
  sleep_date: Date | string;
  bedtime: Date;
  duration_minutes: number;
  notes: string | null;
  activity_follow_up_id: number | null;
};

type SleepFollowUpSyncOptions = {
  bedtimeStartTime?: string;
  bedtimeRaw?: string | Date;
};

function resolveBedtimeStartTime(
  row: SleepLogSyncRow,
  options: SleepFollowUpSyncOptions = {}
): string {
  if (options.bedtimeStartTime) {
    return extractBedtimeStartTime(options.bedtimeStartTime);
  }
  const bedtimeSource = options.bedtimeRaw ?? row.bedtime;
  return extractBedtimeStartTime(bedtimeSource);
}

function formatSleepDate(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

async function findSleepActivityId(userId: number, categoryId: string): Promise<string | null> {
  const db = getDbPool();
  const result = await db.query<{ id: number }>(
    `SELECT id FROM activities
     WHERE user_id = $1 AND category_id = $2 AND title = $3
     LIMIT 1`,
    [userId, categoryId, SLEEP_ACTIVITY_TITLE]
  );
  return result.rows[0] ? String(result.rows[0].id) : null;
}

async function getOrCreateSleepActivity(userId: number, categoryId: string): Promise<string> {
  const existingId = await findSleepActivityId(userId, categoryId);
  if (existingId) {
    return existingId;
  }

  const activity = await activityService.createActivity(userId, {
    title: SLEEP_ACTIVITY_TITLE,
    description: 'Tiempo de sueño registrado automáticamente',
    categoryId,
    status: 'in_progress',
    priority: 'low',
  });
  return activity.id;
}

async function linkFollowUpToSleepLog(sleepLogId: number, followUpId: number): Promise<void> {
  await getDbPool().query(
    'UPDATE sleep_logs SET activity_follow_up_id = $1, updated_at = NOW() WHERE id = $2',
    [followUpId, sleepLogId]
  );
}

async function resolveSleepActivityId(userId: number): Promise<string | null> {
  const settings = await userSettingsService.getMySettings(userId);
  if (!settings.sleepActivityCategoryId) {
    return null;
  }
  return getOrCreateSleepActivity(userId, settings.sleepActivityCategoryId);
}

function buildFollowUpInput(
  row: SleepLogSyncRow,
  activityId: string,
  options: SleepFollowUpSyncOptions = {}
) {
  return {
    activityId,
    date: formatSleepDate(row.sleep_date),
    startTime: resolveBedtimeStartTime(row, options),
    durationMinutes: row.duration_minutes,
    notes: row.notes ? `Sueño: ${row.notes}` : 'Registro automático de sueño',
  };
}

async function createFollowUpForSleepLog(
  userId: number,
  row: SleepLogSyncRow,
  options: SleepFollowUpSyncOptions = {}
): Promise<void> {
  const activityId = await resolveSleepActivityId(userId);
  if (!activityId) {
    return;
  }

  const followUp = await activityFollowUpService.createFollowUp(
    userId,
    buildFollowUpInput(row, activityId, options)
  );
  await linkFollowUpToSleepLog(row.id, activityFollowUpService.parseFollowUpId(followUp.id));
}

async function updateFollowUpForSleepLog(
  userId: number,
  row: SleepLogSyncRow,
  options: SleepFollowUpSyncOptions = {}
): Promise<void> {
  if (!row.activity_follow_up_id) {
    await createFollowUpForSleepLog(userId, row, options);
    return;
  }

  const activityId = await resolveSleepActivityId(userId);
  if (!activityId) {
    await activityFollowUpService.deleteFollowUp(String(row.activity_follow_up_id), userId);
    await getDbPool().query(
      'UPDATE sleep_logs SET activity_follow_up_id = NULL, updated_at = NOW() WHERE id = $1',
      [row.id]
    );
    return;
  }

  const input = buildFollowUpInput(row, activityId, options);
  await activityFollowUpService.updateFollowUp(String(row.activity_follow_up_id), userId, {
    date: input.date,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    ...(options.bedtimeStartTime !== undefined ? { startTime: input.startTime } : {}),
  });
}

async function deleteFollowUpForSleepLog(userId: number, row: SleepLogSyncRow): Promise<void> {
  if (!row.activity_follow_up_id) {
    return;
  }
  await activityFollowUpService.deleteFollowUp(String(row.activity_follow_up_id), userId);
}

export const sleepFollowUpSyncService = {
  createFollowUpForSleepLog,
  updateFollowUpForSleepLog,
  deleteFollowUpForSleepLog,
};
