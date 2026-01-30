import { Router } from 'express';
import healthRoutes from './health';
import authRoutes from './auth';

const router = Router();

// Health check routes (no auth required)
router.use('/health', healthRoutes);
router.use('/', healthRoutes); // Also expose at root for Cloud Run

// Auth routes
router.use('/auth', authRoutes);
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
