import { Request, Response } from 'express';
import { login } from '../../../src/controllers/auth.controller';
import { UnauthorizedError } from '../../../src/shared/errors';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

// Mock dependencies BEFORE importing
jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));
jest.mock('../../../src/shared/utils/password');
jest.mock('../../../src/shared/utils/jwt');
jest.mock('../../../src/shared/utils/response');
jest.mock('uuid');

// Now import the mocked modules
import { getDbPool } from '../../../src/shared/database/pool';
import { comparePassword } from '../../../src/shared/utils/password';
import { generateAccessToken, generateRefreshToken } from '../../../src/shared/utils/jwt';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

// Setup mocks after imports
mockGetDbPool.mockReturnValue(mockDbPool as any);
(generateAccessToken as jest.Mock).mockReturnValue('mock-access-token');
(generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');

// Mock response utilities
const successResponse = require('../../../src/shared/utils/response').successResponse;
const errorResponse = require('../../../src/shared/utils/response').errorResponse;
successResponse.mockImplementation((data: any) => data);
errorResponse.mockImplementation((message: string) => ({ error: message }));

// Mock uuid
const { v4: uuidv4 } = require('uuid');
uuidv4.mockReturnValue('mock-uuid');

describe('Auth Controller - Login', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    resetAllMocks();

    // Re-establish mocks after reset
    mockGetDbPool.mockReturnValue(mockDbPool as any);
    (generateAccessToken as jest.Mock).mockReturnValue('mock-access-token');
    (generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it('should successfully login with valid credentials', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      is_account_verified: true,
    };

    mockDbPool.query
      .mockResolvedValueOnce({
        rows: [mockUser],
      })
      .mockResolvedValueOnce({ rows: [] }); // For refresh token insert

    (comparePassword as jest.Mock).mockResolvedValue(true);

    await login(mockRequest as Request, mockResponse as Response);

    expect(mockDbPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, email, password'),
      ['test@example.com']
    );
    expect(comparePassword).toHaveBeenCalledWith('password123', mockUser.password);
    expect(generateAccessToken).toHaveBeenCalled();
    expect(generateRefreshToken).toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockDbPool.query.mockResolvedValue({ rows: [] });

    await expect(login(mockRequest as Request, mockResponse as Response)).rejects.toThrow(
      UnauthorizedError
    );

    expect(comparePassword).not.toHaveBeenCalled();
    expect(generateAccessToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when password is invalid', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      is_account_verified: true,
    };

    mockDbPool.query.mockResolvedValue({ rows: [mockUser] });
    (comparePassword as jest.Mock).mockResolvedValue(false);

    await expect(login(mockRequest as Request, mockResponse as Response)).rejects.toThrow(
      UnauthorizedError
    );

    expect(generateAccessToken).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    mockDbPool.query.mockRejectedValue(new Error('Database connection failed'));

    await expect(login(mockRequest as Request, mockResponse as Response)).rejects.toThrow(
      'Database connection failed'
    );
  });

  it('should store refresh token in database', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      is_account_verified: true,
    };

    mockDbPool.query
      .mockResolvedValueOnce({ rows: [mockUser] })
      .mockResolvedValueOnce({ rows: [] });

    (comparePassword as jest.Mock).mockResolvedValue(true);

    await login(mockRequest as Request, mockResponse as Response);

    expect(mockDbPool.query).toHaveBeenCalledTimes(2);
    expect(mockDbPool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO refresh_tokens'),
      expect.any(Array)
    );
  });

  it('should handle missing credentials', async () => {
    mockRequest.body = {};

    mockDbPool.query.mockResolvedValue({ rows: [] });

    await expect(login(mockRequest as Request, mockResponse as Response)).rejects.toThrow();
  });
});
