import { Request, Response } from 'express';
import { sleepService } from '../services/sleep.service';
import { successResponse } from '../shared/utils/response';

export async function createSleepLog(req: Request, res: Response): Promise<void> {
  const { sleepDate, bedtime, wakeTime, quality, moodOnWaking, notes } = req.body;
  const sleepLog = await sleepService.createSleepLog(req.user!.id, {
    sleepDate,
    bedtime,
    wakeTime,
    quality,
    moodOnWaking,
    notes,
  });
  res.status(201).json(successResponse({ sleepLog }));
}

export async function getSleepLogs(req: Request, res: Response): Promise<void> {
  const { startDate, endDate, quality, page = '1', limit = '30' } = req.query;
  const collection = await sleepService.listSleepLogs(req.user!.id, {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    quality: quality as never,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });
  res.json(
    successResponse({
      sleepLogs: collection.sleepLogs,
      pagination: {
        page: collection.page,
        limit: collection.limit,
        total: collection.total,
      },
    })
  );
}

export async function getSleepLogById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const sleepLog = await sleepService.getSleepLogById(id, req.user!.id);
  res.json(successResponse({ sleepLog }));
}

export async function updateSleepLog(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { sleepDate, bedtime, wakeTime, quality, moodOnWaking, notes } = req.body;
  const sleepLog = await sleepService.updateSleepLog(id, req.user!.id, {
    sleepDate,
    bedtime,
    wakeTime,
    quality,
    moodOnWaking,
    notes,
  });
  res.json(successResponse({ sleepLog }));
}

export async function deleteSleepLog(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await sleepService.deleteSleepLog(id, req.user!.id);
  res.json(successResponse({ message: 'Sleep log deleted successfully' }));
}

export async function getSleepStats(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;
  const stats = await sleepService.getSleepStats(req.user!.id, {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  res.json(successResponse({ stats }));
}
