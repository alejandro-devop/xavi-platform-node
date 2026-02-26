import { GraphQLError } from 'graphql';
import { z } from 'zod';
import {
  withErrorHandling,
  requireAuth,
  logOperation,
  type GraphQLContext,
} from '../../../src/graphql/utils/error-handler';
import { errorHandler } from '../../../src/shared/errors';
import { NotFoundError, UnauthorizedError } from '../../../src/shared/errors';

jest.mock('../../../src/shared/errors/error-handler');

const mockErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;

describe('GraphQL Error Handler Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withErrorHandling', () => {
    const mockContext: GraphQLContext = {
      user: { id: 'user-1', email: 'test@example.com' },
    };

    it('should execute resolver successfully', async () => {
      const resolver = jest.fn().mockResolvedValue({ id: '1', name: 'Test' });
      const wrappedResolver = withErrorHandling(resolver, 'testOperation');

      const result = await wrappedResolver(null, { id: '1' }, mockContext);

      expect(result).toEqual({ id: '1', name: 'Test' });
      expect(resolver).toHaveBeenCalledWith(null, { id: '1' }, mockContext);
    });

    it('should set user context when user is present', async () => {
      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withErrorHandling(resolver, 'testOperation');

      await wrappedResolver(null, {}, mockContext);

      expect(mockErrorHandler.setUserContext).toHaveBeenCalledWith('user-1');
    });

    it('should not set user context when user is not present', async () => {
      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withErrorHandling(resolver, 'testOperation');

      await wrappedResolver(null, {}, { user: null });

      expect(mockErrorHandler.setUserContext).not.toHaveBeenCalled();
    });

    it('should handle errors and log metadata', async () => {
      const error = new NotFoundError('Resource not found');
      const resolver = jest.fn().mockRejectedValue(error);
      const wrappedResolver = withErrorHandling(resolver, 'getWallet');

      await expect(wrappedResolver(null, { id: 'wallet-1' }, mockContext)).rejects.toThrow(
        GraphQLError
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: 'user-1',
          operation: 'getWallet',
          context: {
            args: { id: 'wallet-1' },
            graphql: true,
          },
        })
      );
    });

    it('should convert errors to GraphQLError', async () => {
      const error = new NotFoundError('Wallet not found');
      const resolver = jest.fn().mockRejectedValue(error);
      const wrappedResolver = withErrorHandling(resolver, 'getWallet');

      try {
        await wrappedResolver(null, { id: 'wallet-1' }, mockContext);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(GraphQLError);
        expect(err.message).toBe('Wallet not found');
        expect(err.extensions.code).toBe('NotFoundError');
      }
    });

    it('should include statusCode in GraphQL error extensions', async () => {
      const error = new NotFoundError('Not found');
      error.statusCode = 404;
      const resolver = jest.fn().mockRejectedValue(error);
      const wrappedResolver = withErrorHandling(resolver, 'getResource');

      try {
        await wrappedResolver(null, {}, mockContext);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.extensions.statusCode).toBe(404);
      }
    });

    it('should sanitize sensitive fields in args', async () => {
      const error = new Error('Test error');
      const resolver = jest.fn().mockRejectedValue(error);
      const wrappedResolver = withErrorHandling(resolver, 'login');

      const args = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'abc123',
      };

      await expect(wrappedResolver(null, args, mockContext)).rejects.toThrow();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: {
            args: {
              email: 'test@example.com',
              password: '[REDACTED]',
              token: '[REDACTED]',
            },
            graphql: true,
          },
        })
      );
    });

    it('should sanitize sensitive fields in nested input', async () => {
      const error = new Error('Test error');
      const resolver = jest.fn().mockRejectedValue(error);
      const wrappedResolver = withErrorHandling(resolver, 'register');

      const args = {
        input: {
          email: 'test@example.com',
          password: 'secret123',
          refreshToken: 'refresh123',
        },
      };

      await expect(wrappedResolver(null, args, mockContext)).rejects.toThrow();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: {
            args: {
              input: {
                email: 'test@example.com',
                password: '[REDACTED]',
                refreshToken: '[REDACTED]',
              },
            },
            graphql: true,
          },
        })
      );
    });

    it('should handle errors without statusCode', async () => {
      const error = new Error('Generic error');
      const resolver = jest.fn().mockRejectedValue(error);
      const wrappedResolver = withErrorHandling(resolver, 'operation');

      try {
        await wrappedResolver(null, {}, mockContext);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(GraphQLError);
        expect(err.extensions.code).toBe('Error');
        expect(err.extensions.statusCode).toBeUndefined();
      }
    });

    it('should work with numeric user IDs', async () => {
      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withErrorHandling(resolver, 'testOperation');
      const contextWithNumericId: GraphQLContext = {
        user: { id: 123 },
      };

      await wrappedResolver(null, {}, contextWithNumericId);

      expect(mockErrorHandler.setUserContext).toHaveBeenCalledWith(123);
    });

    it('should preserve GraphQLError extensions (like validation errors)', async () => {
      const validationErrors = [
        { path: ['name'], message: 'Name is required', code: 'invalid_type' },
        { path: ['email'], message: 'Invalid email format', code: 'invalid_string' },
      ];

      const graphqlError = new GraphQLError('Validation failed', {
        extensions: {
          code: 'BAD_USER_INPUT',
          validationErrors,
        },
      });

      const resolver = jest.fn().mockRejectedValue(graphqlError);
      const wrappedResolver = withErrorHandling(resolver, 'createUser');

      try {
        await wrappedResolver(null, { input: {} }, mockContext);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(GraphQLError);
        expect(err.message).toBe('Validation failed');
        expect(err.extensions.code).toBe('BAD_USER_INPUT');
        expect(err.extensions.validationErrors).toEqual(validationErrors);
      }

      // Should log but not call handleError for GraphQLErrors
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith(
        'GraphQL operation createUser failed: Validation failed',
        expect.any(Object)
      );
      expect(mockErrorHandler.handleError).not.toHaveBeenCalled();
    });

    it('should handle ZodError and convert to structured GraphQL error', async () => {
      // Create a Zod schema that will fail validation
      const schema = z.object({
        name: z.string().min(3, 'Name must be at least 3 characters'),
        email: z.string().email('Invalid email format'),
      });

      // Create a resolver that throws a ZodError
      const resolver = jest.fn().mockImplementation(async () => {
        schema.parse({ name: 'ab', email: 'invalid' }); // Will throw ZodError
      });

      const wrappedResolver = withErrorHandling(resolver, 'createUser');

      try {
        await wrappedResolver(null, { input: { name: 'ab', email: 'invalid' } }, mockContext);
        fail('Should have thrown');
      } catch (err: any) {
        // Should be converted to GraphQLError
        expect(err).toBeInstanceOf(GraphQLError);
        expect(err.message).toBe('Validation failed');
        
        // Should have proper extension code
        expect(err.extensions.code).toBe('BAD_USER_INPUT');
        
        // Should have structured validation errors
        expect(err.extensions.validationErrors).toBeDefined();
        expect(Array.isArray(err.extensions.validationErrors)).toBe(true);
        expect(err.extensions.validationErrors.length).toBeGreaterThan(0);
        
        // Check structure of validation errors
        const firstError = err.extensions.validationErrors[0];
        expect(firstError).toHaveProperty('path');
        expect(firstError).toHaveProperty('message');
        expect(firstError).toHaveProperty('code');
      }

      // Should log warning for validation failure
      expect(mockErrorHandler.logWarning).toHaveBeenCalledWith(
        'GraphQL validation failed in createUser',
        expect.objectContaining({
          userId: 'user-1',
          operation: 'createUser',
          context: expect.objectContaining({
            graphql: true,
            validationErrors: expect.any(Array),
          }),
        })
      );

      // Should NOT call handleError (validation errors are user errors, not system errors)
      expect(mockErrorHandler.handleError).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should pass when user is authenticated', () => {
      const context: GraphQLContext = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      expect(() => requireAuth(context, 'testOperation')).not.toThrow();
    });

    it('should throw GraphQLError when user is not authenticated', () => {
      const context: GraphQLContext = { user: null };

      expect(() => requireAuth(context, 'testOperation')).toThrow(GraphQLError);

      try {
        requireAuth(context, 'testOperation');
      } catch (err: any) {
        expect(err.message).toBe('Not authenticated');
        expect(err.extensions.code).toBe('UNAUTHENTICATED');
      }
    });

    it('should log warning on unauthenticated access', () => {
      const context: GraphQLContext = { user: null };

      try {
        requireAuth(context, 'getWallet');
      } catch (err) {
        // Expected
      }

      expect(mockErrorHandler.logWarning).toHaveBeenCalledWith('Unauthenticated access attempt', {
        operation: 'getWallet',
        context: { graphql: true },
      });
    });

    it('should throw when user is undefined', () => {
      const context: GraphQLContext = {};

      expect(() => requireAuth(context, 'operation')).toThrow(GraphQLError);
    });
  });

  describe('logOperation', () => {
    it('should log successful operations with user context', () => {
      const context: GraphQLContext = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      logOperation('walletAdd', context, { walletId: 'wallet-1' });

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('GraphQL operation: walletAdd', {
        userId: 'user-1',
        operation: 'walletAdd',
        context: {
          graphql: true,
          walletId: 'wallet-1',
        },
      });
    });

    it('should log operation without user context', () => {
      const context: GraphQLContext = { user: null };

      logOperation('publicQuery', context);

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('GraphQL operation: publicQuery', {
        userId: undefined,
        operation: 'publicQuery',
        context: {
          graphql: true,
        },
      });
    });

    it('should log operation with additional details', () => {
      const context: GraphQLContext = {
        user: { id: 'user-1' },
      };

      logOperation('walletUpdate', context, {
        walletId: 'wallet-1',
        fieldsUpdated: ['name', 'balance'],
      });

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('GraphQL operation: walletUpdate', {
        userId: 'user-1',
        operation: 'walletUpdate',
        context: {
          graphql: true,
          walletId: 'wallet-1',
          fieldsUpdated: ['name', 'balance'],
        },
      });
    });

    it('should work without additional details', () => {
      const context: GraphQLContext = {
        user: { id: 'user-1' },
      };

      logOperation('wallets', context);

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('GraphQL operation: wallets', {
        userId: 'user-1',
        operation: 'wallets',
        context: {
          graphql: true,
        },
      });
    });

    it('should work with numeric user IDs', () => {
      const context: GraphQLContext = {
        user: { id: 12345 },
      };

      logOperation('operation', context);

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith(
        'GraphQL operation: operation',
        expect.objectContaining({
          userId: 12345,
        })
      );
    });
  });

  describe('GraphQLContext type', () => {
    it('should allow user with id and email', () => {
      const context: GraphQLContext = {
        user: { id: 'user-1', email: 'test@example.com' },
      };
      expect(context.user?.id).toBe('user-1');
      expect(context.user?.email).toBe('test@example.com');
    });

    it('should allow user with only id', () => {
      const context: GraphQLContext = {
        user: { id: 'user-1' },
      };
      expect(context.user?.id).toBe('user-1');
      expect(context.user?.email).toBeUndefined();
    });

    it('should allow null user', () => {
      const context: GraphQLContext = {
        user: null,
      };
      expect(context.user).toBeNull();
    });

    it('should allow additional properties', () => {
      const context: GraphQLContext = {
        user: { id: 'user-1' },
        req: {},
        res: {},
        dataloaders: {},
      };
      expect(context.req).toBeDefined();
      expect(context.res).toBeDefined();
      expect(context.dataloaders).toBeDefined();
    });
  });
});
