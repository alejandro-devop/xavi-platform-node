import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    code: z.string().length(6, 'Verification code must be 6 digits'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    code: z.string().length(6, 'Verification code must be 6 digits'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const resendOTPSchema = z.object({
  body: z.object({}), // No body required - uses req.user from auth middleware
});

export const verifyAccountSchema = z.object({
  body: z.object({
    code: z.string().length(6, 'Verification code must be 6 digits'),
  }),
});

export const requestAccountDeletionSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
});

export const resendAccountDeletionOTPSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
});

export const confirmAccountDeletionSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    code: z.string().length(6, 'Verification code must be 6 digits'),
  }),
});
