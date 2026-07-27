import { getDbPool } from '../shared/database/pool';
import { BadRequestError, NotFoundError } from '../shared/errors';
import { isUuidV7 } from '../shared/database/uuid';
import type {
  ActivityDayPlanItem,
  AddDayPlanItemInput,
  SetDayPlanItemInput,
  UpdateDayPlanItemInput,
} from '../types/services/activity-day-plan.types';
import { parseActivityId } from './activity.service';

type DayPlanItemRow = {
  id: number;
  user_id: number;
  activity_id: number;
  date: Date | string;
  start_time: string | Date;
  end_time: string | Date;
  order_index: number;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const DAY_PLAN_RETURNING = `id, user_id, activity_id, date, start_time, end_time, order_index, completed_at, created_at, updated_at`;

function formatDateForApi(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function formatTime(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 5);
  return value.toTimeString().slice(0, 5);
}

function mapDayPlanItem(row: DayPlanItemRow): ActivityDayPlanItem {
  return {
    id: String(row.id),
    userId: row.user_id,
    activityId: String(row.activity_id),
    date: formatDateForApi(row.date),
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    orderIndex: row.order_index,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseItemId(id: string): number {
  const itemId = parseInt(id, 10);
  if (Number.isNaN(itemId)) throw new NotFoundError('Day plan item not found');
  return itemId;
}

async function getDayPlan(userId: number, date: string): Promise<ActivityDayPlanItem[]> {
  const db = getDbPool();
  const result = await db.query<DayPlanItemRow>(
    `SELECT * FROM activity_day_plan_items
     WHERE user_id = $1 AND date = $2::date
     ORDER BY start_time ASC, order_index ASC, created_at ASC`,
    [userId, date]
  );
  return result.rows.map(mapDayPlanItem);
}

async function assertActivitiesOwned(userId: number, activityIds: number[]): Promise<void> {
  if (activityIds.length === 0) return;
  const db = getDbPool();
  const result = await db.query<{ id: number }>(
    'SELECT id FROM activities WHERE id = ANY($1) AND user_id = $2',
    [activityIds, userId]
  );
  if (result.rows.length !== activityIds.length) {
    throw new BadRequestError('All activities must belong to you');
  }
}

async function setDayPlan(
  userId: number,
  date: string,
  items: SetDayPlanItemInput[]
): Promise<ActivityDayPlanItem[]> {
  const activityIds = items.map((item) => parseActivityId(item.activityId));
  const uniqueIds = new Set(activityIds);
  if (uniqueIds.size !== activityIds.length) {
    throw new BadRequestError('Each activity can only appear once per day plan');
  }
  await assertActivitiesOwned(userId, activityIds);

  const db = getDbPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Preservar completed_at de actividades que sobreviven al re-guardado del plan
    const existing = await client.query<{ activity_id: number; completed_at: Date | null }>(
      'SELECT activity_id, completed_at FROM activity_day_plan_items WHERE user_id = $1 AND date = $2::date',
      [userId, date]
    );
    const completedByActivity = new Map<number, Date | null>();
    for (const row of existing.rows) {
      completedByActivity.set(row.activity_id, row.completed_at);
    }

    await client.query(
      'DELETE FROM activity_day_plan_items WHERE user_id = $1 AND date = $2::date',
      [userId, date]
    );

    const inserted: ActivityDayPlanItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const activityId = activityIds[i];
      const result = await client.query<DayPlanItemRow>(
        `INSERT INTO activity_day_plan_items
           (user_id, activity_id, date, start_time, end_time, order_index, completed_at, client_id)
         VALUES ($1, $2, $3::date, $4::time, $5::time, $6, $7, $8)
         RETURNING ${DAY_PLAN_RETURNING}`,
        [
          userId,
          activityId,
          date,
          item.startTime,
          item.endTime,
          item.orderIndex ?? i,
          completedByActivity.get(activityId) ?? null,
          item.clientId && isUuidV7(item.clientId) ? item.clientId : null,
        ]
      );
      inserted.push(mapDayPlanItem(result.rows[0]));
    }

    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function addDayPlanItem(
  userId: number,
  input: AddDayPlanItemInput
): Promise<ActivityDayPlanItem> {
  const activityId = parseActivityId(input.activityId);
  await assertActivitiesOwned(userId, [activityId]);

  const db = getDbPool();
  const existing = await db.query<{ id: number }>(
    `SELECT id FROM activity_day_plan_items
     WHERE user_id = $1 AND activity_id = $2 AND date = $3::date`,
    [userId, activityId, input.date]
  );
  if (existing.rows.length > 0) {
    throw new BadRequestError('Activity is already in the day plan for this date');
  }

  let orderIndex = input.orderIndex;
  if (orderIndex === undefined) {
    const maxResult = await db.query<{ max: number | null }>(
      `SELECT MAX(order_index) AS max FROM activity_day_plan_items
       WHERE user_id = $1 AND date = $2::date`,
      [userId, input.date]
    );
    orderIndex = (maxResult.rows[0]?.max ?? -1) + 1;
  }

  try {
    const result = await db.query<DayPlanItemRow>(
      `INSERT INTO activity_day_plan_items
         (user_id, activity_id, date, start_time, end_time, order_index, client_id)
       VALUES ($1, $2, $3::date, $4::time, $5::time, $6, $7)
       RETURNING ${DAY_PLAN_RETURNING}`,
      [
        userId,
        activityId,
        input.date,
        input.startTime,
        input.endTime,
        orderIndex,
        input.clientId && isUuidV7(input.clientId) ? input.clientId : null,
      ]
    );
    return mapDayPlanItem(result.rows[0]);
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '23505') {
      throw new BadRequestError('Activity is already in the day plan for this date');
    }
    throw err;
  }
}

async function updateDayPlanItem(
  userId: number,
  itemIdStr: string,
  input: UpdateDayPlanItemInput
): Promise<ActivityDayPlanItem> {
  const itemId = parseItemId(itemIdStr);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.startTime !== undefined) {
    updates.push(`start_time = $${paramIndex}::time`);
    params.push(input.startTime);
    paramIndex++;
  }
  if (input.endTime !== undefined) {
    updates.push(`end_time = $${paramIndex}::time`);
    params.push(input.endTime);
    paramIndex++;
  }
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex}`);
    params.push(input.orderIndex);
    paramIndex++;
  }
  if (input.isCompleted !== undefined) {
    updates.push(input.isCompleted ? 'completed_at = NOW()' : 'completed_at = NULL');
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(itemId, userId);
  const db = getDbPool();
  const result = await db.query<DayPlanItemRow>(
    `UPDATE activity_day_plan_items SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING ${DAY_PLAN_RETURNING}`,
    params
  );
  if (result.rows.length === 0) throw new NotFoundError('Day plan item not found');
  return mapDayPlanItem(result.rows[0]);
}

async function removeDayPlanItem(userId: number, itemIdStr: string): Promise<boolean> {
  const itemId = parseItemId(itemIdStr);
  const db = getDbPool();
  const result = await db.query(
    'DELETE FROM activity_day_plan_items WHERE id = $1 AND user_id = $2 RETURNING id',
    [itemId, userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Day plan item not found');
  return true;
}

export const activityDayPlanService = {
  getDayPlan,
  setDayPlan,
  addDayPlanItem,
  updateDayPlanItem,
  removeDayPlanItem,
};
