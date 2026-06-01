import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createWeeklyRoutine,
  listWeeklyRoutines,
  getWeeklyRoutine,
  getActiveWeeklyRoutine,
  updateWeeklyRoutine,
  deleteWeeklyRoutine,
  setWeeklyRoutineActive,
  toggleWeeklyRoutineActive,
  addWeeklyRoutineActivity,
  updateWeeklyRoutineActivity,
  deleteWeeklyRoutineActivity,
} from '../controllers/weekly-routine.controller';
import {
  createWeeklyRoutineSchema,
  listWeeklyRoutinesSchema,
  getWeeklyRoutineSchema,
  updateWeeklyRoutineSchema,
  deleteWeeklyRoutineSchema,
  toggleWeeklyRoutineSchema,
  addWeeklyRoutineActivitySchema,
  updateWeeklyRoutineActivitySchema,
  deleteWeeklyRoutineActivitySchema,
} from '../validators/weekly-routine.validator';

const router = Router();

router.use(authMiddleware);

// ============ WEEKLY ROUTINE ROUTES ============
router.post('/', validate(createWeeklyRoutineSchema), asyncHandler(createWeeklyRoutine));
router.get('/', validate(listWeeklyRoutinesSchema), asyncHandler(listWeeklyRoutines));
router.get('/active', asyncHandler(getActiveWeeklyRoutine));
router.get('/:id', validate(getWeeklyRoutineSchema), asyncHandler(getWeeklyRoutine));
router.put('/:id', validate(updateWeeklyRoutineSchema), asyncHandler(updateWeeklyRoutine));
router.delete('/:id', validate(deleteWeeklyRoutineSchema), asyncHandler(deleteWeeklyRoutine));
router.post('/:id/set-active', validate(toggleWeeklyRoutineSchema), asyncHandler(setWeeklyRoutineActive));
router.post('/:id/toggle', validate(toggleWeeklyRoutineSchema), asyncHandler(toggleWeeklyRoutineActive));

// ============ ACTIVITY ENTRY ROUTES ============
router.post('/:id/activities', validate(addWeeklyRoutineActivitySchema), asyncHandler(addWeeklyRoutineActivity));
router.put('/:id/activities/:activityEntryId', validate(updateWeeklyRoutineActivitySchema), asyncHandler(updateWeeklyRoutineActivity));
router.delete('/:id/activities/:activityEntryId', validate(deleteWeeklyRoutineActivitySchema), asyncHandler(deleteWeeklyRoutineActivity));

export default router;
