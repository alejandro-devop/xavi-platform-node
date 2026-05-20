import { Request, Response } from 'express';
import { activityService } from '../services/activity.service';
import { successResponse } from '../shared/utils/response';

export async function createActivity(req: Request, res: Response): Promise<void> {
  const { title, description, status, priority, scheduledDate } = req.body;
  const activity = await activityService.createActivity(req.user!.id, {
    title,
    description,
    status,
    priority,
    scheduledDate,
  });
  res.status(201).json(successResponse({ activity }));
}

export async function getActivities(req: Request, res: Response): Promise<void> {
  const { status, priority, startDate, endDate, page = '1', limit = '20' } = req.query;
  const collection = await activityService.listActivities(req.user!.id, {
    status: status as never,
    priority: priority as never,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });
  res.json(
    successResponse({
      activities: collection.activities,
      pagination: {
        page: collection.page,
        limit: collection.limit,
        total: collection.total,
        totalPages: Math.ceil(collection.total / collection.limit),
      },
    })
  );
}

export async function getActivityById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const activity = await activityService.getActivityById(id, req.user!.id);
  res.json(successResponse({ activity }));
}

export async function updateActivity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, status, priority, scheduledDate } = req.body;
  const activity = await activityService.updateActivity(id, req.user!.id, {
    title,
    description,
    status,
    priority,
    scheduledDate,
  });
  res.json(successResponse({ activity }));
}

export async function deleteActivity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await activityService.deleteActivity(id, req.user!.id);
  res.json(successResponse({ message: 'Activity deleted successfully' }));
}

export async function completeActivity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const activity = await activityService.completeActivity(id, req.user!.id);
  res.json(successResponse({ activity }));
}
