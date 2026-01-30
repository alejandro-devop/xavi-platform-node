import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createRoutine,
  getRoutines,
  getRoutineById,
  updateRoutine,
  deleteRoutine,
  toggleRoutineActive,
  createRoutineStep,
  updateRoutineStep,
  deleteRoutineStep,
} from '../controllers/routine.controller';
import {
  createRoutineSchema,
  getRoutinesSchema,
  getRoutineSchema,
  updateRoutineSchema,
  deleteRoutineSchema,
  toggleRoutineActiveSchema,
  createRoutineStepSchema,
  updateRoutineStepSchema,
  deleteRoutineStepSchema,
} from '../validators/routine.validator';

const router = Router();

// All routine routes require authentication
router.use(authMiddleware);

// ============ ROUTINE ROUTES ============
router.post('/', validate(createRoutineSchema), asyncHandler(createRoutine));
router.get('/', validate(getRoutinesSchema), asyncHandler(getRoutines));
router.get('/:id', validate(getRoutineSchema), asyncHandler(getRoutineById));
router.put('/:id', validate(updateRoutineSchema), asyncHandler(updateRoutine));
router.delete('/:id', validate(deleteRoutineSchema), asyncHandler(deleteRoutine));
router.post('/:id/toggle', validate(toggleRoutineActiveSchema), asyncHandler(toggleRoutineActive));

// ============ ROUTINE STEP ROUTES ============
router.post('/:id/steps', validate(createRoutineStepSchema), asyncHandler(createRoutineStep));
router.put('/:id/steps/:stepId', validate(updateRoutineStepSchema), asyncHandler(updateRoutineStep));
router.delete('/:id/steps/:stepId', validate(deleteRoutineStepSchema), asyncHandler(deleteRoutineStep));

export default router;
