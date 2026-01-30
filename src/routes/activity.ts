import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  completeActivity,
} from '../controllers/activity.controller';
import {
  createActivitySchema,
  getActivitiesSchema,
  getActivitySchema,
  updateActivitySchema,
  deleteActivitySchema,
  completeActivitySchema,
} from '../validators/activity.validator';

const router = Router();

// All activity routes require authentication
router.use(authMiddleware);

// CRUD routes
router.post('/', validate(createActivitySchema), asyncHandler(createActivity));
router.get('/', validate(getActivitiesSchema), asyncHandler(getActivities));
router.get('/:id', validate(getActivitySchema), asyncHandler(getActivityById));
router.put('/:id', validate(updateActivitySchema), asyncHandler(updateActivity));
router.delete('/:id', validate(deleteActivitySchema), asyncHandler(deleteActivity));

// Action routes
router.post('/:id/complete', validate(completeActivitySchema), asyncHandler(completeActivity));

export default router;
