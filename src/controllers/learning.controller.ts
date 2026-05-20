import { Request, Response } from 'express';
import { learningService } from '../services/learning.service';
import { successResponse } from '../shared/utils/response';

export async function createLearningResource(req: Request, res: Response): Promise<void> {
  const {
    title,
    description,
    resourceType,
    url,
    category,
    priority,
    estimatedDurationMinutes,
  } = req.body;
  const resource = await learningService.createLearningResource(req.user!.id, {
    title,
    description,
    resourceType,
    url,
    category,
    priority,
    estimatedDurationMinutes,
  });
  res.status(201).json(successResponse({ resource }));
}

export async function getLearningResources(req: Request, res: Response): Promise<void> {
  const { resourceType, status, priority, category, page = '1', limit = '20' } = req.query;
  const collection = await learningService.listLearningResources(req.user!.id, {
    resourceType: resourceType as never,
    status: status as never,
    priority: priority as never,
    category: category as string | undefined,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });
  res.json(
    successResponse({
      resources: collection.resources,
      pagination: {
        page: collection.page,
        limit: collection.limit,
        total: collection.total,
      },
    })
  );
}

export async function getLearningResourceById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const resource = await learningService.getLearningResourceById(id, req.user!.id);
  res.json(successResponse({ resource }));
}

export async function updateLearningResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    title,
    description,
    resourceType,
    url,
    category,
    priority,
    status,
    estimatedDurationMinutes,
  } = req.body;
  const resource = await learningService.updateLearningResource(id, req.user!.id, {
    title,
    description,
    resourceType,
    url,
    category,
    priority,
    status,
    estimatedDurationMinutes,
  });
  res.json(successResponse({ resource }));
}

export async function deleteLearningResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await learningService.deleteLearningResource(id, req.user!.id);
  res.json(successResponse({ message: 'Learning resource deleted successfully' }));
}

export async function logProgress(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { durationMinutes, notes, progressPercentage, sessionDate } = req.body;
  const progress = await learningService.createProgressSession(req.user!.id, {
    resourceId: id,
    durationMinutes,
    notes,
    progressPercentage,
    sessionDate,
  });
  res.status(201).json(successResponse({ progress }));
}

export async function getProgressSessions(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await learningService.getLearningResourceById(id, req.user!.id);
  const sessions = await learningService.listProgressSessions(parseInt(id, 10));
  res.json(successResponse({ sessions }));
}

export async function updateProgressSession(req: Request, res: Response): Promise<void> {
  const { id, sessionId } = req.params;
  const { durationMinutes, notes, progressPercentage, sessionDate } = req.body;
  const progress = await learningService.updateProgressSession(id, sessionId, req.user!.id, {
    durationMinutes,
    notes,
    progressPercentage,
    sessionDate,
  });
  res.json(successResponse({ progress }));
}

export async function deleteProgressSession(req: Request, res: Response): Promise<void> {
  const { id, sessionId } = req.params;
  await learningService.deleteProgressSession(id, sessionId, req.user!.id);
  res.json(successResponse({ message: 'Progress session deleted successfully' }));
}
