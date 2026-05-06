import { Request, Response } from 'express';
import { forgotPassword, login, resetPassword } from '../../../src/controllers/auth.controller';
import { BadRequestError, UnauthorizedError } from '../../../src/shared/errors';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

// Mock dependencies BEFORE importing
jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));
jest.mock('../../../src/shared/utils/password');
jest.mock('../../../src/shared/utils/jwt');
jest.mock('../../../src/shared/utils/response');
jest.mock('../../../src/shared/services/email.service', () => ({
  emailService: {
    sendPasswordResetEmail: jest.fn(),
  },
}));
jest.mock('uuid');

// Now import the mocked modules
import { getDbPool } from '../../../src/shared/database/pool';
import { comparePassword, hashPassword } from '../../../src/shared/utils/password';
import { generateAccessToken, generateRefreshToken } from '../../../src/shared/utils/jwt';
import { emailService } from '../../../src/shared/services/email.service';

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
const sendPasswordResetEmailMock = emailService.sendPasswordResetEmail as jest.Mock;

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

describe('Auth Controller - Forgot Password', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as any);
    sendPasswordResetEmailMock.mockResolvedValue({ success: true, messageId: 'msg-1' });
    jsonMock = jest.fn();

    mockRequest = {
      body: {
        email: 'test@example.com',
      },
    };

    mockResponse = {
      json: jsonMock,
    };
  });

  it('returns a generic success response when user does not exist', async () => {
    mockDbPool.query.mockResolvedValueOnce({ rows: [] });

    await forgotPassword(mockRequest as Request, mockResponse as Response);

    expect(jsonMock).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it('stores otp and sends email when user exists', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@example.com', name: 'Test User', password_reset_otp_last_sent_at: null }],
      })
      .mockResolvedValueOnce({ rows: [] });

    await forgotPassword(mockRequest as Request, mockResponse as Response);

    expect(mockDbPool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE users'),
      expect.any(Array)
    );
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      'test@example.com',
      expect.any(String),
      'Test User'
    );
  });
});

describe('Auth Controller - Reset Password', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as any);
    (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');
    jsonMock = jest.fn();

    mockRequest = {
      body: {
        email: 'test@example.com',
        code: '123456',
        password: 'NewPassword123',
      },
    };

    mockResponse = {
      json: jsonMock,
    };
  });

  it('throws when reset code is invalid', async () => {
    mockDbPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, password_reset_code: 'ZmFrZQ==', password_reset_code_expires_at: new Date(Date.now() + 60000) }],
    });

    await expect(resetPassword(mockRequest as Request, mockResponse as Response)).rejects.toThrow(
      BadRequestError
    );
  });

  it('resets password and revokes refresh tokens on success', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            password_reset_code: Buffer.from('123456').toString('base64'),
            password_reset_code_expires_at: new Date(Date.now() + 60000),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await resetPassword(mockRequest as Request, mockResponse as Response);

    expect(hashPassword).toHaveBeenCalledWith('NewPassword123');
    expect(mockDbPool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE users'),
      ['new-hashed-password', 1]
    );
    expect(mockDbPool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE refresh_tokens SET is_revoked = TRUE'),
      [1]
    );
    expect(jsonMock).toHaveBeenCalledTimes(1);
  });
});
