import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

export async function createSleepLog(req: Request, res: Response): Promise<void> {
  const { sleepDate, bedtime, wakeTime, quality, moodOnWaking, notes } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Calculate duration
  const bedtimeDate = new Date(bedtime);
  const wakeTimeDate = new Date(wakeTime);
  const durationMinutes = Math.round((wakeTimeDate.getTime() - bedtimeDate.getTime()) / (1000 * 60));

  if (durationMinutes <= 0) {
    throw new BadRequestError('Wake time must be after bedtime');
  }

  const result = await db.query(
    `INSERT INTO sleep_logs (user_id, sleep_date, bedtime, wake_time, duration_minutes, quality, mood_on_waking, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, sleep_date, bedtime, wake_time, duration_minutes, quality, mood_on_waking, notes, created_at, updated_at`,
    [userId, sleepDate, bedtime, wakeTime, durationMinutes, quality || null, moodOnWaking || null, notes || null]
  );

  const log = result.rows[0];

  res.status(201).json(
    successResponse({
      sleepLog: {
        id: log.id,
        userId: log.user_id,
        sleepDate: log.sleep_date,
        bedtime: log.bedtime,
        wakeTime: log.wake_time,
        durationMinutes: log.duration_minutes,
        durationHours: (log.duration_minutes / 60).toFixed(1),
        quality: log.quality,
        moodOnWaking: log.mood_on_waking,
        notes: log.notes,
        createdAt: log.created_at,
        updatedAt: log.updated_at,
      },
    })
  );
}

export async function getSleepLogs(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { startDate, endDate, quality, page = '1', limit = '30' } = req.query;

  let query = 'SELECT * FROM sleep_logs WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND sleep_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND sleep_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (quality) {
    query += ` AND quality = $${paramIndex}`;
    params.push(quality);
    paramIndex++;
  }

  query += ' ORDER BY sleep_date DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  const sleepLogs = result.rows.map((log) => ({
    id: log.id,
    userId: log.user_id,
    sleepDate: log.sleep_date,
    bedtime: log.bedtime,
    wakeTime: log.wake_time,
    durationMinutes: log.duration_minutes,
    durationHours: (log.duration_minutes / 60).toFixed(1),
    quality: log.quality,
    moodOnWaking: log.mood_on_waking,
    notes: log.notes,
    createdAt: log.created_at,
    updatedAt: log.updated_at,
  }));

  res.json(
    successResponse({
      sleepLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: sleepLogs.length,
      },
    })
  );
}

export async function getSleepLogById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query('SELECT * FROM sleep_logs WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Sleep log not found');
  }

  const log = result.rows[0];

  if (log.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this sleep log');
  }

  res.json(
    successResponse({
      sleepLog: {
        id: log.id,
        userId: log.user_id,
        sleepDate: log.sleep_date,
        bedtime: log.bedtime,
        wakeTime: log.wake_time,
        durationMinutes: log.duration_minutes,
        durationHours: (log.duration_minutes / 60).toFixed(1),
        quality: log.quality,
        moodOnWaking: log.mood_on_waking,
        notes: log.notes,
        createdAt: log.created_at,
        updatedAt: log.updated_at,
      },
    })
  );
}

export async function updateSleepLog(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM sleep_logs WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Sleep log not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to update this sleep log');
  }

  const { sleepDate, bedtime, wakeTime, quality, moodOnWaking, notes } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (sleepDate !== undefined) {
    updates.push(`sleep_date = $${paramIndex}`);
    params.push(sleepDate);
    paramIndex++;
  }

  if (bedtime !== undefined) {
    updates.push(`bedtime = $${paramIndex}`);
    params.push(bedtime);
    paramIndex++;
  }

  if (wakeTime !== undefined) {
    updates.push(`wake_time = $${paramIndex}`);
    params.push(wakeTime);
    paramIndex++;
  }

  // Recalculate duration if bedtime or wakeTime changed
  if (bedtime !== undefined || wakeTime !== undefined) {
    const newBedtime = bedtime || checkResult.rows[0].bedtime;
    const newWakeTime = wakeTime || checkResult.rows[0].wake_time;
    const bedtimeDate = new Date(newBedtime);
    const wakeTimeDate = new Date(newWakeTime);
    const durationMinutes = Math.round((wakeTimeDate.getTime() - bedtimeDate.getTime()) / (1000 * 60));

    if (durationMinutes <= 0) {
      throw new BadRequestError('Wake time must be after bedtime');
    }

    updates.push(`duration_minutes = $${paramIndex}`);
    params.push(durationMinutes);
    paramIndex++;
  }

  if (quality !== undefined) {
    updates.push(`quality = $${paramIndex}`);
    params.push(quality);
    paramIndex++;
  }

  if (moodOnWaking !== undefined) {
    updates.push(`mood_on_waking = $${paramIndex}`);
    params.push(moodOnWaking);
    paramIndex++;
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(notes);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(id);

  const result = await db.query(
    `UPDATE sleep_logs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const log = result.rows[0];

  res.json(
    successResponse({
      sleepLog: {
        id: log.id,
        userId: log.user_id,
        sleepDate: log.sleep_date,
        bedtime: log.bedtime,
        wakeTime: log.wake_time,
        durationMinutes: log.duration_minutes,
        durationHours: (log.duration_minutes / 60).toFixed(1),
        quality: log.quality,
        moodOnWaking: log.mood_on_waking,
        notes: log.notes,
        createdAt: log.created_at,
        updatedAt: log.updated_at,
      },
    })
  );
}

export async function deleteSleepLog(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM sleep_logs WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Sleep log not found');
  }

  if (checkResult.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this sleep log');
  }

  await db.query('DELETE FROM sleep_logs WHERE id = $1', [id]);

  res.json(successResponse({ message: 'Sleep log deleted successfully' }));
}

export async function getSleepStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { startDate, endDate } = req.query;

  let query = `
    SELECT 
      COUNT(*) as total_nights,
      AVG(duration_minutes) as avg_duration,
      MIN(duration_minutes) as min_duration,
      MAX(duration_minutes) as max_duration,
      COUNT(CASE WHEN quality = 'poor' THEN 1 END) as poor_quality,
      COUNT(CASE WHEN quality = 'fair' THEN 1 END) as fair_quality,
      COUNT(CASE WHEN quality = 'good' THEN 1 END) as good_quality,
      COUNT(CASE WHEN quality = 'excellent' THEN 1 END) as excellent_quality
    FROM sleep_logs
    WHERE user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND sleep_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND sleep_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const result = await db.query(query, params);
  const stats = result.rows[0];

  res.json(
    successResponse({
      stats: {
        totalNights: parseInt(stats.total_nights),
        avgDurationMinutes: Math.round(parseFloat(stats.avg_duration) || 0),
        avgDurationHours: ((parseFloat(stats.avg_duration) || 0) / 60).toFixed(1),
        minDurationMinutes: parseInt(stats.min_duration) || 0,
        minDurationHours: ((parseInt(stats.min_duration) || 0) / 60).toFixed(1),
        maxDurationMinutes: parseInt(stats.max_duration) || 0,
        maxDurationHours: ((parseInt(stats.max_duration) || 0) / 60).toFixed(1),
        qualityDistribution: {
          poor: parseInt(stats.poor_quality),
          fair: parseInt(stats.fair_quality),
          good: parseInt(stats.good_quality),
          excellent: parseInt(stats.excellent_quality),
        },
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    })
  );
}
