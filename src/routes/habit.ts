import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createHabit,
  getHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  logHabitCompletion,
  getHabitLogs,
  getHabitStats,
} from '../controllers/habit.controller';
import {
  createHabitSchema,
  getHabitsSchema,
  getHabitSchema,
  updateHabitSchema,
  deleteHabitSchema,
  logHabitSchema,
  getHabitLogsSchema,
  getHabitStatsSchema,
} from '../validators/habit.validator';

const router = Router();

// All habit routes require authentication
router.use(authMiddleware);

// CRUD routes
router.post('/', validate(createHabitSchema), asyncHandler(createHabit));
router.get('/', validate(getHabitsSchema), asyncHandler(getHabits));
router.get('/:id', validate(getHabitSchema), asyncHandler(getHabitById));
router.put('/:id', validate(updateHabitSchema), asyncHandler(updateHabit));
router.delete('/:id', validate(deleteHabitSchema), asyncHandler(deleteHabit));

// Habit tracking routes
router.post('/:id/log', validate(logHabitSchema), asyncHandler(logHabitCompletion));
router.get('/:id/logs', validate(getHabitLogsSchema), asyncHandler(getHabitLogs));
router.get('/:id/stats', validate(getHabitStatsSchema), asyncHandler(getHabitStats));

export default router;
