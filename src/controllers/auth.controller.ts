import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { hashPassword, comparePassword } from '../shared/utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../shared/utils/jwt';
import { generateOTP, encodeOTP } from '../shared/utils/otp';
import { successResponse, errorResponse } from '../shared/utils/response';
import { 
  UnauthorizedError, 
  ConflictError, 
  NotFoundError, 
  BadRequestError 
} from '../shared/errors';
import { v4 as uuidv4 } from 'uuid';

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
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Create user
  const result = await db.query(
    `INSERT INTO users (email, password, name, verification_code, verification_code_expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, is_account_verified, created_at`,
    [email, hashedPassword, name, encodedOTP, expiresAt]
  );

  const user = result.rows[0];

  // TODO: Send verification email with OTP
  // For now, we'll return it in development mode
  const response: any = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isAccountVerified: user.is_account_verified,
      createdAt: user.created_at,
    },
    message: 'Registration successful. Please verify your email.',
  };

  if (process.env.NODE_ENV === 'development') {
    response.verificationCode = otp;
  }

  res.status(201).json(successResponse(response));
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const db = getDbPool();

  // Find user
  const result = await db.query(
    'SELECT id, email, password, name, is_account_verified FROM users WHERE email = $1',
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

  res.json(successResponse({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isAccountVerified: user.is_account_verified,
    },
  }));
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

  res.json(successResponse({
    message: 'Email verified successfully',
  }));
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

  // Generate new access token
  const newJti = uuidv4();
  const accessToken = generateAccessToken({
    sub: tokenRecord.user_id.toString(),
    email: tokenRecord.email,
    jti: newJti,
  });

  res.json(successResponse({
    accessToken,
    user: {
      id: tokenRecord.user_id,
      email: tokenRecord.email,
      name: tokenRecord.name,
      isAccountVerified: tokenRecord.is_account_verified,
    },
  }));
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
    await db.query(
      'UPDATE refresh_tokens SET is_revoked = TRUE WHERE jti = $1',
      [payload.jti]
    );

    res.json(successResponse({
      message: 'Logged out successfully',
    }));
  } catch (error) {
    // Even if token is invalid, return success
    res.json(successResponse({
      message: 'Logged out successfully',
    }));
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  res.json(successResponse({
    user: req.user,
  }));
}
