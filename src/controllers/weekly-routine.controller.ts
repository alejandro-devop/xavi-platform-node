import { Request, Response } from 'express';
import { weeklyRoutineService } from '../services/weekly-routine.service';
import { successResponse } from '../shared/utils/response';

export async function createWeeklyRoutine(req: Request, res: Response): Promise<void> {
  const { name, description, startDay, dayStartTime, dayEndTime } = req.body;
  const routine = await weeklyRoutineService.createRoutine(req.user!.id, { name, description, startDay, dayStartTime, dayEndTime });
  res.status(201).json(successResponse({ routine }));
}

export async function listWeeklyRoutines(req: Request, res: Response): Promise<void> {
  const { isActive, page = '1', limit = '20' } = req.query;
  const collection = await weeklyRoutineService.listRoutines(req.user!.id, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });
  res.json(successResponse({
    routines: collection.routines,
    pagination: { page: collection.page, limit: collection.limit, total: collection.total },
  }));
}

export async function getWeeklyRoutine(req: Request, res: Response): Promise<void> {
  const routine = await weeklyRoutineService.getRoutineById(req.params.id, req.user!.id);
  res.json(successResponse({ routine }));
}

export async function getActiveWeeklyRoutine(req: Request, res: Response): Promise<void> {
  const routine = await weeklyRoutineService.getActiveRoutine(req.user!.id);
  res.json(successResponse({ routine }));
}

export async function updateWeeklyRoutine(req: Request, res: Response): Promise<void> {
  const { name, description, startDay, dayStartTime, dayEndTime } = req.body;
  const routine = await weeklyRoutineService.updateRoutine(req.params.id, req.user!.id, {
    name, description, startDay, dayStartTime, dayEndTime,
  });
  res.json(successResponse({ routine }));
}

export async function deleteWeeklyRoutine(req: Request, res: Response): Promise<void> {
  await weeklyRoutineService.deleteRoutine(req.params.id, req.user!.id);
  res.json(successResponse({}));
}

export async function setWeeklyRoutineActive(req: Request, res: Response): Promise<void> {
  const routine = await weeklyRoutineService.setRoutineActive(req.params.id, req.user!.id);
  res.json(successResponse({ routine }));
}

export async function toggleWeeklyRoutineActive(req: Request, res: Response): Promise<void> {
  const routine = await weeklyRoutineService.toggleRoutineActive(req.params.id, req.user!.id);
  res.json(successResponse({ routine }));
}

export async function addWeeklyRoutineActivity(req: Request, res: Response): Promise<void> {
  const { activityId, dayOfWeek, startTime, durationMinutes, notes } = req.body;
  const entry = await weeklyRoutineService.addActivity(req.user!.id, {
    routineId: req.params.id,
    activityId,
    dayOfWeek,
    startTime,
    durationMinutes,
    notes,
  });
  res.status(201).json(successResponse({ activity: entry }));
}

export async function updateWeeklyRoutineActivity(req: Request, res: Response): Promise<void> {
  const { dayOfWeek, startTime, durationMinutes, notes } = req.body;
  const entry = await weeklyRoutineService.updateActivity(
    req.params.activityEntryId,
    req.user!.id,
    { dayOfWeek, startTime, durationMinutes, notes }
  );
  res.json(successResponse({ activity: entry }));
}

export async function deleteWeeklyRoutineActivity(req: Request, res: Response): Promise<void> {
  await weeklyRoutineService.removeActivity(req.params.activityEntryId, req.user!.id);
  res.json(successResponse({}));
}
