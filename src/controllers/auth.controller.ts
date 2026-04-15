import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { hashPassword, comparePassword } from '../shared/utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../shared/utils/jwt';
import { generateOTP, encodeOTP } from '../shared/utils/otp';
import { successResponse } from '../shared/utils/response';
import { UnauthorizedError, ConflictError, NotFoundError, BadRequestError } from '../shared/errors';
import { v4 as uuidv4 } from 'uuid';
import { decodeToken } from '../shared/utils/jwt';
import { emailService } from '../shared/services/email.service';
import { logger } from '../shared/logger';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body;
  const db = getDbPool();

  // Check if user already exists
  const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);

  if (existingUser.rows.length > 0) {
    throw new ConflictError('User already exists with this email');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate OTP for email verification
  const otp = generateOTP();
  const encodedOTP = encodeOTP(otp);
  const expirationMinutes = parseInt(process.env.EMAIL_OTP_EXPIRATION_MINUTES || '15', 10);
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  const now = new Date();

  // Create user
  const result = await db.query(
    `INSERT INTO users (email, password, name, verification_code, verification_code_expires_at, otp_last_sent_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, name, is_account_verified, created_at`,
    [email, hashedPassword, name, encodedOTP, expiresAt, now]
  );

  const user = result.rows[0];

  // Send verification email
  const emailResult = await emailService.sendVerificationEmail(email, otp, name);

  if (!emailResult.success) {
    // Log the error but don't fail registration
    // User can request a resend later
    logger.error(
      {
        email,
        error: emailResult.error,
        userId: user.id,
      },
      'Failed to send verification email during registration'
    );
  } else {
    logger.info(
      {
        email,
        userId: user.id,
        messageId: emailResult.messageId,
      },
      'Verification email sent during registration'
    );
  }

  res.status(201).json(
    successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAccountVerified: user.is_account_verified,
        createdAt: user.created_at,
      },
      message: 'Registration successful. Please verify your email.',
      emailSent: emailResult.success,
    })
  );
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const db = getDbPool();

  // Find user
  const result = await db.query(
    'SELECT id, email, password, name, is_account_verified, otp_last_sent_at FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const user = result.rows[0];

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate tokens
  const jti = uuidv4();
  const accessToken = generateAccessToken({
    sub: user.id.toString(),
    email: user.email,
    jti,
  });
  const decodedToken = decodeToken(accessToken);
  const accessExpiresAt = decodedToken?.exp ? decodedToken.exp * 1000 : null;
  const refreshJti = uuidv4();
  const refreshToken = generateRefreshToken({
    sub: user.id.toString(),
    jti: refreshJti,
  });

  // Store refresh token
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, jti, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, refreshToken, refreshJti, refreshExpiresAt]
  );

  // Calculate nextResendAvailableAt for unverified users
  let nextResendAvailableAt: string | null = null;
  if (!user.is_account_verified && user.otp_last_sent_at) {
    const lastSent = new Date(user.otp_last_sent_at);
    const nextAvailable = new Date(lastSent.getTime() + 5 * 60 * 1000); // 5 minutes
    nextResendAvailableAt = nextAvailable.toISOString();
  }

  const responseData: any = {
    accessToken,
    accessExpiresAt,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isAccountVerified: user.is_account_verified,
    },
  };

  // Include nextResendAvailableAt for unverified users
  if (!user.is_account_verified) {
    responseData.nextResendAvailableAt = nextResendAvailableAt;
  }

  res.json(successResponse(responseData));
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { email, code } = req.body;
  const db = getDbPool();

  const result = await db.query(
    `SELECT id, verification_code, verification_code_expires_at 
     FROM users 
     WHERE email = $1 AND is_account_verified = FALSE`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found or already verified');
  }

  const user = result.rows[0];
  const encodedCode = encodeOTP(code);

  // Check if code matches
  if (user.verification_code !== encodedCode) {
    throw new BadRequestError('Invalid verification code');
  }

  // Check if code expired
  if (new Date() > new Date(user.verification_code_expires_at)) {
    throw new BadRequestError('Verification code has expired');
  }

  // Mark as verified
  await db.query(
    `UPDATE users 
     SET is_account_verified = TRUE, 
         verification_code = NULL, 
         verification_code_expires_at = NULL
     WHERE id = $1`,
    [user.id]
  );

  res.json(
    successResponse({
      message: 'Email verified successfully',
    })
  );
}

export async function refreshAccessToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  const db = getDbPool();

  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Check if token exists and is not revoked
  const result = await db.query(
    `SELECT rt.id, rt.user_id, rt.is_revoked, u.email, u.name, u.is_account_verified
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.jti = $1 AND rt.expires_at > NOW()`,
    [payload.jti]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const tokenRecord = result.rows[0];

  if (tokenRecord.is_revoked) {
    throw new UnauthorizedError('Refresh token has been revoked');
  }

  // Revoke the old refresh token
  await db.query(`UPDATE refresh_tokens SET is_revoked = true WHERE id = $1`, [tokenRecord.id]);

  // Generate new access token
  const newAccessJti = uuidv4();
  const accessToken = generateAccessToken({
    sub: tokenRecord.user_id.toString(),
    email: tokenRecord.email,
    jti: newAccessJti,
  });
  const decodedToken = decodeToken(accessToken);
  const accessExpiresAt = decodedToken?.exp ? decodedToken.exp * 1000 : null;

  // Generate new refresh token (rotation)
  const newRefreshJti = uuidv4();
  const newRefreshToken = generateRefreshToken({
    sub: tokenRecord.user_id.toString(),
    jti: newRefreshJti,
  });

  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, jti, expires_at) VALUES ($1, $2, $3, $4)`,
    [tokenRecord.user_id, newRefreshToken, newRefreshJti, refreshExpiresAt]
  );

  res.json(
    successResponse({
      accessToken,
      accessExpiresAt,
      refreshToken: newRefreshToken,
      user: {
        id: tokenRecord.user_id,
        email: tokenRecord.email,
        name: tokenRecord.name,
        isAccountVerified: tokenRecord.is_account_verified,
      },
    })
  );
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  const db = getDbPool();

  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required');
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Revoke the refresh token
    await db.query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE jti = $1', [payload.jti]);

    res.json(
      successResponse({
        message: 'Logged out successfully',
      })
    );
  } catch (error) {
    // Even if token is invalid, return success
    res.json(
      successResponse({
        message: 'Logged out successfully',
      })
    );
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  res.json(
    successResponse({
      user: req.user,
    })
  );
}

/**
 * Resend verification OTP
 * Protected endpoint - requires authentication
 * Enforces 5-minute rate limit between resends
 */
export async function resendVerificationOTP(req: Request, res: Response): Promise<void> {
  const db = getDbPool();
  const userId = req.user!.id;

  // Check if user is already verified
  const userResult = await db.query(
    `SELECT is_account_verified, otp_last_sent_at, email, name 
     FROM users 
     WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = userResult.rows[0];

  if (user.is_account_verified) {
    throw new BadRequestError('Account is already verified');
  }

  // Check rate limit (5 minutes)
  if (user.otp_last_sent_at) {
    const lastSent = new Date(user.otp_last_sent_at);
    const now = new Date();
    const timeSinceLastSend = now.getTime() - lastSent.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (timeSinceLastSend < fiveMinutesInMs) {
      const nextAvailable = new Date(lastSent.getTime() + fiveMinutesInMs);
      const secondsRemaining = Math.ceil((nextAvailable.getTime() - now.getTime()) / 1000);

      throw new BadRequestError(
        JSON.stringify({
          message: 'Please wait before requesting a new code',
          nextResendAvailableAt: nextAvailable.toISOString(),
          secondsRemaining,
        })
      );
    }
  }

  // Generate new OTP
  const otp = generateOTP();
  const encodedOTP = encodeOTP(otp);
  const expirationMinutes = parseInt(process.env.EMAIL_OTP_EXPIRATION_MINUTES || '15', 10);
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  const now = new Date();

  // Update user with new OTP and timestamp
  await db.query(
    `UPDATE users 
     SET verification_code = $1, 
         verification_code_expires_at = $2,
         otp_last_sent_at = $3
     WHERE id = $4`,
    [encodedOTP, expiresAt, now, userId]
  );

  // Send verification email
  const emailResult = await emailService.sendVerificationEmail(user.email, otp, user.name);

  if (!emailResult.success) {
    logger.error(
      {
        email: user.email,
        error: emailResult.error,
        userId,
      },
      'Failed to send verification email during resend OTP'
    );
    throw new BadRequestError('Failed to send verification email. Please try again later.');
  }

  logger.info(
    {
      email: user.email,
      userId,
      messageId: emailResult.messageId,
    },
    'Verification email resent successfully'
  );

  const nextResendAvailableAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  res.json(
    successResponse({
      message: 'Verification code sent successfully',
      nextResendAvailableAt,
      emailSent: true,
    })
  );
}

/**
 * Verify account with OTP
 * Protected endpoint - requires authentication
 */
export async function verifyAccount(req: Request, res: Response): Promise<void> {
  const { code } = req.body;
  const db = getDbPool();
  const userId = req.user!.id;

  // Get user verification data
  const result = await db.query(
    `SELECT id, verification_code, verification_code_expires_at, is_account_verified
     FROM users 
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = result.rows[0];

  // Check if already verified
  if (user.is_account_verified) {
    throw new BadRequestError('Account is already verified');
  }

  // Check if verification code exists
  if (!user.verification_code) {
    throw new BadRequestError('No verification code found. Please request a new one.');
  }

  const encodedCode = encodeOTP(code);

  // Check if code matches
  if (user.verification_code !== encodedCode) {
    throw new BadRequestError('Invalid verification code');
  }

  // Check if code expired
  if (new Date() > new Date(user.verification_code_expires_at)) {
    throw new BadRequestError('Verification code has expired. Please request a new one.');
  }

  // Mark as verified and clear verification data
  await db.query(
    `UPDATE users 
     SET is_account_verified = TRUE, 
         verification_code = NULL, 
         verification_code_expires_at = NULL,
         otp_last_sent_at = NULL
     WHERE id = $1`,
    [userId]
  );

  res.json(
    successResponse({
      message: 'Account verified successfully',
      isAccountVerified: true,
    })
  );
}
