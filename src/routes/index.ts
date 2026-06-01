import { Router } from 'express';
import healthRoutes from './health';
import authRoutes from './auth';
import activityRoutes from './activity';
import habitRoutes from './habit';
import todoRoutes from './todo';
import walletRoutes from './wallet';
import shoppingRoutes from './shopping';
import routineRoutes from './routine';
import weeklyRoutineRoutes from './weekly-routine';
import learningRoutes from './learning';
import sleepRoutes from './sleep';
import courseRoutes from './course';
import docsRoutes from './docs';

const router = Router();

// Documentation routes (no auth required)
router.use('/docs', docsRoutes);

// Health check routes (no auth required)
router.use('/health', healthRoutes);
router.use('/', healthRoutes); // Also expose at root for Cloud Run

// Auth routes
router.use('/auth', authRoutes);

// Domain routes (all require authentication)
router.use('/activity', activityRoutes);
router.use('/habit', habitRoutes);
router.use('/todo', todoRoutes);
router.use('/wallet', walletRoutes);
router.use('/shopping', shoppingRoutes);
router.use('/routine', routineRoutes);
router.use('/weekly-routine', weeklyRoutineRoutes);
router.use('/learning', learningRoutes);
router.use('/sleep', sleepRoutes);
router.use('/course', courseRoutes);

export default router;
