import { Router } from 'express';
import healthRoutes from './health';

const router = Router();

// Health check routes (no auth required)
router.use('/health', healthRoutes);
router.use('/', healthRoutes); // Also expose at root for Cloud Run

// Placeholder for domain routes (to be added in Phase 2+)
// router.use('/auth', authRoutes);
// router.use('/activity', activityRoutes);
// router.use('/habit', habitRoutes);
// router.use('/todo', todoRoutes);
// router.use('/wallet', walletRoutes);
// router.use('/shopping', shoppingRoutes);
// router.use('/routine', routineRoutes);
// router.use('/learning', learningRoutes);
// router.use('/course', courseRoutes);
// router.use('/sleep', sleepRoutes);

export default router;
