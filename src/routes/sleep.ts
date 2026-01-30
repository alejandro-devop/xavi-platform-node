import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createSleepLog,
  getSleepLogs,
  getSleepLogById,
  updateSleepLog,
  deleteSleepLog,
  getSleepStats,
} from '../controllers/sleep.controller';
import {
  createSleepLogSchema,
  getSleepLogsSchema,
  getSleepLogSchema,
  updateSleepLogSchema,
  deleteSleepLogSchema,
  getSleepStatsSchema,
} from '../validators/sleep.validator';

const router = Router();

// All sleep routes require authentication
router.use(authMiddleware);

router.post('/', validate(createSleepLogSchema), asyncHandler(createSleepLog));
router.get('/', validate(getSleepLogsSchema), asyncHandler(getSleepLogs));
router.get('/stats', validate(getSleepStatsSchema), asyncHandler(getSleepStats));
router.get('/:id', validate(getSleepLogSchema), asyncHandler(getSleepLogById));
router.put('/:id', validate(updateSleepLogSchema), asyncHandler(updateSleepLog));
router.delete('/:id', validate(deleteSleepLogSchema), asyncHandler(deleteSleepLog));

export default router;
