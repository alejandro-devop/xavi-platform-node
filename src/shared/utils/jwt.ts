import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors';

export interface JWTPayload {
  sub: string; // user_id
  email: string;
  iat: number;
  exp: number;
  jti: string; // token_id
}

export interface RefreshTokenPayload {
  sub: string; // user_id
  iat: number;
  exp: number;
  type: 'refresh';
}

export function generateAccessToken(userId: number, email: string): string {
  const payload = {
    sub: userId.toString(),
    email,
    jti: `${userId}_${Date.now()}`, // Unique token ID
  };

  const expiresIn = parseInt(process.env.JWT_ACCESS_EXPIRATION || '3600', 10);

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn,
  });
}

export function generateRefreshToken(userId: number): string {
  const payload = {
    sub: userId.toString(),
    type: 'refresh',
  };

  const expiresIn = parseInt(process.env.JWT_REFRESH_EXPIRATION || '2592000', 10);

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn,
  });
}

export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as RefreshTokenPayload;

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw new UnauthorizedError('Refresh token verification failed');
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
