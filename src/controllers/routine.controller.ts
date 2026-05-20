import { Request, Response } from 'express';
import { routineService } from '../services/routine.service';
import { successResponse } from '../shared/utils/response';

export async function createRoutine(req: Request, res: Response): Promise<void> {
  const { name, description, daysOfWeek, timeOfDay } = req.body;
  const routine = await routineService.createRoutine(req.user!.id, {
    name,
    description,
    daysOfWeek,
    timeOfDay,
  });
  res.status(201).json(successResponse({ routine }));
}

export async function getRoutines(req: Request, res: Response): Promise<void> {
  const { isActive, timeOfDay, dayOfWeek, page = '1', limit = '20' } = req.query;
  const collection = await routineService.listRoutines(req.user!.id, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    timeOfDay: timeOfDay as never,
    dayOfWeek: dayOfWeek as never,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });
  res.json(
    successResponse({
      routines: collection.routines,
      pagination: { page: collection.page, limit: collection.limit, total: collection.total },
    })
  );
}

export async function getRoutineById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const routine = await routineService.getRoutineById(id, req.user!.id);
  res.json(successResponse({ routine }));
}

export async function updateRoutine(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, description, daysOfWeek, timeOfDay, isActive } = req.body;
  const routine = await routineService.updateRoutine(id, req.user!.id, {
    name,
    description,
    daysOfWeek,
    timeOfDay,
    isActive,
  });
  res.json(successResponse({ routine }));
}

export async function deleteRoutine(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await routineService.deleteRoutine(id, req.user!.id);
  res.json(successResponse({ message: 'Routine deleted successfully' }));
}

export async function toggleRoutineActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const routine = await routineService.toggleRoutineActive(id, req.user!.id);
  res.json(successResponse({ routine }));
}

export async function createRoutineStep(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, durationMinutes, orderIndex } = req.body;
  const step = await routineService.createRoutineStep(req.user!.id, {
    routineId: id,
    title,
    description,
    durationMinutes,
    orderIndex,
  });
  res.status(201).json(successResponse({ step }));
}

export async function updateRoutineStep(req: Request, res: Response): Promise<void> {
  const { id, stepId } = req.params;
  const { title, description, durationMinutes, orderIndex } = req.body;
  const step = await routineService.updateRoutineStep(id, stepId, req.user!.id, {
    title,
    description,
    durationMinutes,
    orderIndex,
  });
  res.json(successResponse({ step }));
}

export async function deleteRoutineStep(req: Request, res: Response): Promise<void> {
  const { id, stepId } = req.params;
  await routineService.deleteRoutineStep(id, stepId, req.user!.id);
  res.json(successResponse({ message: 'Step deleted successfully' }));
}
