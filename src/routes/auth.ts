import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  register,
  login,
  verifyEmail,
  refreshAccessToken,
  logout,
  getProfile,
} from '../controllers/auth.controller';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/verify-email', validate(verifyEmailSchema), asyncHandler(verifyEmail));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(refreshAccessToken));
router.post('/logout', validate(logoutSchema), asyncHandler(logout));

// Protected routes
router.get('/profile', authMiddleware, asyncHandler(getProfile));

export default router;
