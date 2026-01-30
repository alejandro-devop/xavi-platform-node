import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createLearningResource,
  getLearningResources,
  getLearningResourceById,
  updateLearningResource,
  deleteLearningResource,
  logProgress,
  getProgressSessions,
  updateProgressSession,
  deleteProgressSession,
} from '../controllers/learning.controller';
import {
  createLearningResourceSchema,
  getLearningResourcesSchema,
  getLearningResourceSchema,
  updateLearningResourceSchema,
  deleteLearningResourceSchema,
  logProgressSchema,
  getProgressSessionsSchema,
  updateProgressSessionSchema,
  deleteProgressSessionSchema,
} from '../validators/learning.validator';

const router = Router();

// All learning routes require authentication
router.use(authMiddleware);

// ============ LEARNING RESOURCE ROUTES ============
router.post('/', validate(createLearningResourceSchema), asyncHandler(createLearningResource));
router.get('/', validate(getLearningResourcesSchema), asyncHandler(getLearningResources));
router.get('/:id', validate(getLearningResourceSchema), asyncHandler(getLearningResourceById));
router.put('/:id', validate(updateLearningResourceSchema), asyncHandler(updateLearningResource));
router.delete('/:id', validate(deleteLearningResourceSchema), asyncHandler(deleteLearningResource));

// ============ LEARNING PROGRESS ROUTES ============
router.post('/:id/progress', validate(logProgressSchema), asyncHandler(logProgress));
router.get('/:id/progress', validate(getProgressSessionsSchema), asyncHandler(getProgressSessions));
router.put(
  '/:id/progress/:sessionId',
  validate(updateProgressSessionSchema),
  asyncHandler(updateProgressSession)
);
router.delete(
  '/:id/progress/:sessionId',
  validate(deleteProgressSessionSchema),
  asyncHandler(deleteProgressSession)
);

export default router;
