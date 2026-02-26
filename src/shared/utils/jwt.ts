import jwt, { SignOptions } from 'jsonwebtoken';
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
  jti: string; // token_id (added)
  type: 'refresh';
}

export function generateAccessToken(params: { sub: string; email: string; jti: string }): string {
  const payload = {
    sub: params.sub,
    email: params.email,
    jti: params.jti,
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '24h') as any,
  });
}

export function generateRefreshToken(params: { sub: string; jti: string }): string {
  const payload = {
    sub: params.sub,
    jti: params.jti,
    type: 'refresh' as const,
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
  });
}

export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
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
