import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
  getProfile,
  resendVerificationOTP,
  verifyAccount,
  requestAccountDeletion,
  resendAccountDeletionOTP,
  confirmAccountDeletion,
} from '../controllers/auth.controller';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  logoutSchema,
  resendOTPSchema,
  verifyAccountSchema,
  requestAccountDeletionSchema,
  resendAccountDeletionOTPSchema,
  confirmAccountDeletionSchema,
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/verify-email', validate(verifyEmailSchema), asyncHandler(verifyEmail));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(resetPassword));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(refreshAccessToken));
router.post('/logout', validate(logoutSchema), asyncHandler(logout));

// Protected routes
router.get('/profile', authMiddleware, asyncHandler(getProfile));
router.post(
  '/resend-otp',
  authMiddleware,
  validate(resendOTPSchema),
  asyncHandler(resendVerificationOTP)
);
router.post(
  '/verify-account',
  authMiddleware,
  validate(verifyAccountSchema),
  asyncHandler(verifyAccount)
);
router.post(
  '/request-account-deletion',
  validate(requestAccountDeletionSchema),
  asyncHandler(requestAccountDeletion)
);
router.post(
  '/resend-account-deletion-otp',
  validate(resendAccountDeletionOTPSchema),
  asyncHandler(resendAccountDeletionOTP)
);
router.post(
  '/confirm-account-deletion',
  validate(confirmAccountDeletionSchema),
  asyncHandler(confirmAccountDeletion)
);

export default router;
