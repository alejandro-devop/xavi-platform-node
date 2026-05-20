import { Request, Response } from 'express';
import { habitService } from '../services/habit.service';
import { successResponse } from '../shared/utils/response';

export async function createHabit(req: Request, res: Response): Promise<void> {
  const { name, description, frequency, targetCount, icon, color } = req.body;
  const userId = req.user!.id;

  const habit = await habitService.createHabit(userId, {
    name,
    description,
    frequency,
    targetCount,
    icon,
    color,
  });

  res.status(201).json(successResponse({ habit }));
}

export async function getHabits(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { isActive, page = '1', limit = '50' } = req.query;

  const collection = await habitService.listHabits(userId, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });

  res.json(successResponse({ habits: collection.habits }));
}

export async function getHabitById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  const habit = await habitService.getHabitById(id, userId);
  res.json(successResponse({ habit }));
}

export async function updateHabit(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, description, frequency, targetCount, icon, color, isActive } = req.body;
  const userId = req.user!.id;

  const habit = await habitService.updateHabit(id, userId, {
    name,
    description,
    frequency,
    targetCount,
    icon,
    color,
    isActive,
  });

  res.json(successResponse({ habit }));
}

export async function deleteHabit(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  await habitService.deleteHabit(id, userId);

  res.json(
    successResponse({
      message: 'Habit deleted successfully',
    })
  );
}

export async function logHabitCompletion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { completedDate, count, notes } = req.body;
  const userId = req.user!.id;

  const log = await habitService.addHabitLog(id, userId, {
    completedDate,
    count,
    notes,
  });

  res.status(201).json(successResponse({ log }));
}

export async function getHabitLogs(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const { startDate, endDate, limit = '30' } = req.query;

  const logs = await habitService.listHabitLogs(id, userId, {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    limit: parseInt(limit as string, 10),
  });

  res.json(successResponse({ logs }));
}

export async function getHabitStats(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  const stats = await habitService.getHabitStats(id, userId);
  res.json(successResponse({ stats }));
}
