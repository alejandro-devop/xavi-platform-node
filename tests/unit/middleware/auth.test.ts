import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../../src/shared/middleware/auth';
import { UnauthorizedError } from '../../../src/shared/errors';
import { mockDbPool, mockRedisClient, createMockUser, resetAllMocks } from '../../helpers/mocks';

// Mock dependencies
jest.mock('../../../src/shared/utils/jwt');
jest.mock('../../../src/shared/database/pool');
jest.mock('../../../src/shared/redis/client');
jest.mock('../../../src/shared/logger');

import { verifyAccessToken } from '../../../src/shared/utils/jwt';
import { getDbPool } from '../../../src/shared/database/pool';
import { getRedisClient } from '../../../src/shared/redis/client';

// Setup mocks
(getDbPool as jest.Mock).mockReturnValue(mockDbPool);
(getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    resetAllMocks();
    
    // Re-establish mocks after reset
    (getDbPool as jest.Mock).mockReturnValue(mockDbPool);
    (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
    process.env.ENABLE_REDIS_CACHE = 'false';
  });

  afterEach(() => {
    delete process.env.ENABLE_REDIS_CACHE;
  });

  it('should authenticate user with valid token', async () => {
    const mockUser = createMockUser();
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    (verifyAccessToken as jest.Mock).mockReturnValue({
      sub: '1',
      jti: 'test-jti',
    });

    mockDbPool.query.mockResolvedValue({
      rows: [
        {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          is_account_verified: mockUser.isAccountVerified,
        },
      ],
    });

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should call next with error when authorization header is missing', async () => {
    mockRequest.headers = {};

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should call next with error when authorization header format is invalid', async () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token',
    };

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should call next with error when token is invalid', async () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call next with error when user not found in database', async () => {
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    (verifyAccessToken as jest.Mock).mockReturnValue({
      sub: '999',
      jti: 'test-jti',
    });

    mockDbPool.query.mockResolvedValue({ rows: [] });

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  describe('with Redis cache enabled', () => {
    beforeEach(() => {
      process.env.ENABLE_REDIS_CACHE = 'true';
    });

    it('should use cached user when available', async () => {
      const mockUser = createMockUser();
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (verifyAccessToken as jest.Mock).mockReturnValue({
        sub: '1',
        jti: 'test-jti',
      });

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockUser));

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRedisClient.get).toHaveBeenCalledWith('session:test-jti');
      expect(mockDbPool.query).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fall back to database when cache miss', async () => {
      const mockUser = createMockUser();
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (verifyAccessToken as jest.Mock).mockReturnValue({
        sub: '1',
        jti: 'test-jti',
      });

      mockRedisClient.get.mockResolvedValue(null);
      mockDbPool.query.mockResolvedValue({
        rows: [
          {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            is_account_verified: mockUser.isAccountVerified,
          },
        ],
      });

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockDbPool.query).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fall back to database when Redis fails', async () => {
      const mockUser = createMockUser();
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (verifyAccessToken as jest.Mock).mockReturnValue({
        sub: '1',
        jti: 'test-jti',
      });

      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      mockDbPool.query.mockResolvedValue({
        rows: [
          {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            is_account_verified: mockUser.isAccountVerified,
          },
        ],
      });

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockDbPool.query).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
