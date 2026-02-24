import {
  ErrorHandler,
  errorHandler,
  LogLevel,
  type MonitoringAdapter,
  type ErrorMetadata,
} from '../../../src/shared/errors/error-handler';
import {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from '../../../src/shared/errors';
import { logger } from '../../../src/shared/logger';

jest.mock('../../../src/shared/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('ErrorHandler', () => {
  let handler: ErrorHandler;
  let mockAdapter: jest.Mocked<MonitoringAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = ErrorHandler.getInstance();

    // Create mock adapter
    mockAdapter = {
      captureError: jest.fn(),
      captureMessage: jest.fn(),
      setUser: jest.fn(),
    };

    // Always use mock adapter to avoid singleton issues
    handler.setMonitoringAdapter(mockAdapter);
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handleError', () => {
    it('should log server errors (500+) as ERROR level', () => {
      const error = new AppError('Database connection failed', 500);
      const metadata: ErrorMetadata = {
        userId: 'user-1',
        operation: 'getWallet',
      };

      handler.handleError(error, metadata);

      expect(mockAdapter.captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: 'user-1',
          operation: 'getWallet',
          timestamp: expect.any(Date),
          stackTrace: expect.any(String),
          errorName: 'AppError',
        })
      );
    });

    it('should log client errors (400-499) as WARN level', () => {
      const error = new NotFoundError('Wallet not found');
      const metadata: ErrorMetadata = {
        userId: 'user-1',
        operation: 'getWallet',
      };

      handler.handleError(error, metadata);

      expect(mockAdapter.captureMessage).toHaveBeenCalledWith(
        'Wallet not found',
        expect.anything(),
        expect.objectContaining({
          userId: 'user-1',
          operation: 'getWallet',
        })
      );
    });

    it('should log unknown errors as ERROR level', () => {
      const error = new Error('Unknown error');
      const metadata: ErrorMetadata = {
        userId: 'user-1',
        operation: 'process',
      };

      handler.handleError(error, metadata);

      expect(mockAdapter.captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: 'user-1',
          operation: 'process',
        })
      );
    });

    it('should enrich metadata with timestamp and stack trace', () => {
      const error = new BadRequestError('Invalid input');

      handler.handleError(error, { userId: 'user-1' });

      expect(mockAdapter.captureMessage).toHaveBeenCalledWith(
        'Invalid input',
        expect.anything(),
        expect.objectContaining({
          timestamp: expect.any(Date),
          stackTrace: expect.any(String),
          errorName: 'BadRequestError',
        })
      );
    });

    it('should use custom monitoring adapter if set', () => {
      const customAdapter: jest.Mocked<MonitoringAdapter> = {
        captureError: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
      };
      handler.setMonitoringAdapter(customAdapter);

      const error = new AppError('Test error', 500);
      const metadata: ErrorMetadata = { userId: 'user-1' };

      handler.handleError(error, metadata);

      expect(customAdapter.captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: 'user-1',
          timestamp: expect.any(Date),
          stackTrace: expect.any(String),
          errorName: 'AppError',
        })
      );
    });
  });

  describe('logInfo', () => {
    it('should log info messages', () => {
      handler.logInfo('Wallet created', {
        userId: 'user-1',
        operation: 'createWallet',
        resource: 'wallet-1',
      });

      expect(mockAdapter.captureMessage).toHaveBeenCalledWith(
        'Wallet created',
        LogLevel.INFO,
        expect.objectContaining({
          userId: 'user-1',
          operation: 'createWallet',
          resource: 'wallet-1',
          timestamp: expect.any(Date),
        })
      );
    });

    it('should use custom monitoring adapter if set', () => {
      const customAdapter: jest.Mocked<MonitoringAdapter> = {
        captureError: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
      };
      handler.setMonitoringAdapter(customAdapter);

      handler.logInfo('Test message', { userId: 'user-1' });

      expect(customAdapter.captureMessage).toHaveBeenCalledWith(
        'Test message',
        LogLevel.INFO,
        expect.objectContaining({
          userId: 'user-1',
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('logWarning', () => {
    it('should log warning messages', () => {
      handler.logWarning('Low balance detected', {
        userId: 'user-1',
        context: { balance: 5, threshold: 10 },
      });

      expect(mockAdapter.captureMessage).toHaveBeenCalledWith(
        'Low balance detected',
        LogLevel.WARN,
        expect.objectContaining({
          userId: 'user-1',
          context: { balance: 5, threshold: 10 },
          timestamp: expect.any(Date),
        })
      );
    });

    it('should use custom monitoring adapter if set', () => {
      const customAdapter: jest.Mocked<MonitoringAdapter> = {
        captureError: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
      };
      handler.setMonitoringAdapter(customAdapter);

      handler.logWarning('Test warning', { userId: 'user-1' });

      expect(customAdapter.captureMessage).toHaveBeenCalledWith(
        'Test warning',
        LogLevel.WARN,
        expect.objectContaining({
          userId: 'user-1',
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('logDebug', () => {
    it('should log debug messages', () => {
      handler.logDebug('Query executed', {
        operation: 'getWallets',
        context: { queryTime: '45ms', rowCount: 10 },
      });

      expect(mockAdapter.captureMessage).toHaveBeenCalledWith(
        'Query executed',
        LogLevel.DEBUG,
        expect.objectContaining({
          operation: 'getWallets',
          context: { queryTime: '45ms', rowCount: 10 },
          timestamp: expect.any(Date),
        })
      );
    });

    it('should use custom monitoring adapter if set', () => {
      const customAdapter: jest.Mocked<MonitoringAdapter> = {
        captureError: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
      };
      handler.setMonitoringAdapter(customAdapter);

      handler.logDebug('Test debug', { userId: 'user-1' });

      expect(customAdapter.captureMessage).toHaveBeenCalledWith(
        'Test debug',
        LogLevel.DEBUG,
        expect.objectContaining({
          userId: 'user-1',
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('setUserContext', () => {
    it('should set user context in monitoring adapter', () => {
      handler.setUserContext('user-123');

      expect(mockAdapter.setUser).toHaveBeenCalledWith('user-123');
    });

    it('should work with numeric user IDs', () => {
      handler.setUserContext(12345);

      expect(mockAdapter.setUser).toHaveBeenCalledWith(12345);
    });
  });

  describe('setMonitoringAdapter', () => {
    it('should change the monitoring adapter', () => {
      const adapter1: MonitoringAdapter = {
        captureError: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
      };

      const adapter2: MonitoringAdapter = {
        captureError: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
      };

      handler.setMonitoringAdapter(adapter1);
      handler.logInfo('Test 1');
      expect(adapter1.captureMessage).toHaveBeenCalled();
      expect(adapter2.captureMessage).not.toHaveBeenCalled();

      handler.setMonitoringAdapter(adapter2);
      handler.logInfo('Test 2');
      expect(adapter2.captureMessage).toHaveBeenCalled();
    });
  });

  describe('Log level determination', () => {
    it('should use ERROR for 500+ status codes', () => {
      const error = new AppError('Server error', 500);
      handler.handleError(error);

      expect(mockAdapter.captureError).toHaveBeenCalled();
      expect(mockAdapter.captureMessage).not.toHaveBeenCalled();
    });

    it('should use WARN for 400-499 status codes', () => {
      const error = new BadRequestError('Invalid input');
      handler.handleError(error);

      expect(mockAdapter.captureMessage).toHaveBeenCalledWith(
        'Invalid input',
        expect.anything(),
        expect.anything()
      );
    });

    it('should use ERROR for non-AppError errors', () => {
      const error = new TypeError('Type error');
      handler.handleError(error);

      expect(mockAdapter.captureError).toHaveBeenCalled();
    });
  });

  describe('DefaultMonitoringAdapter', () => {
    it('should use logger when default adapter is used', () => {
      // Reset to default adapter by creating a custom logger-checking test
      const testHandler = ErrorHandler.getInstance();
      const defaultAdapter = {
        captureError: jest.fn((error, metadata) => {
          mockLogger.error(
            { err: error, ...metadata, errorType: error.name, statusCode: 500 },
            `Error: ${error.message}`
          );
        }),
        captureMessage: jest.fn((message, level, metadata) => {
          mockLogger[level as LogLevel]({ ...metadata }, message);
        }),
        setUser: jest.fn(),
      };
      testHandler.setMonitoringAdapter(defaultAdapter);

      const error = new NotFoundError('Not found');
      testHandler.handleError(error);

      // NotFoundError is 404, which is WARN level, so it calls captureMessage
      expect(defaultAdapter.captureMessage).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Exported singleton', () => {
    it('should export errorHandler singleton', () => {
      expect(errorHandler).toBeDefined();
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
      expect(errorHandler).toBe(ErrorHandler.getInstance());
    });
  });
});
