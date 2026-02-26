import { GraphQLError } from 'graphql';
import { z } from 'zod';
import {
  withValidation,
  withValidatedResolver,
  withAsyncValidation,
  withAsyncValidatedResolver,
  type ValidationErrorDetail,
} from '../../../src/graphql/utils/validation';
import { errorHandler } from '../../../src/shared/errors';
import { withErrorHandling } from '../../../src/graphql/utils/error-handler';

jest.mock('../../../src/shared/errors/error-handler');
jest.mock('../../../src/graphql/utils/error-handler', () => ({
  ...jest.requireActual('../../../src/graphql/utils/error-handler'),
  withErrorHandling: jest.fn((resolver) => resolver),
}));

const mockErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;

describe('GraphQL Validation Utils', () => {
  const mockContext = {
    user: { id: 'user-1', email: 'test@example.com' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withValidation', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.number().min(0, 'Age must be positive'),
    });

    it('should validate and pass valid input', async () => {
      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withValidation(testSchema, resolver);

      const input = { name: 'John', age: 25 };
      const result = await wrappedResolver(null, { input }, mockContext);

      expect(result).toEqual({ success: true });
      expect(resolver).toHaveBeenCalledWith(null, { input }, mockContext);
    });

    it('should validate args.input for mutations', async () => {
      const resolver = jest.fn().mockResolvedValue({ id: '1' });
      const wrappedResolver = withValidation(testSchema, resolver);

      const input = { name: 'Test', age: 30 };
      await wrappedResolver(null, { input }, mockContext);

      expect(resolver).toHaveBeenCalledWith(
        null,
        { input: { name: 'Test', age: 30 } },
        mockContext
      );
    });

    it('should validate args directly for queries', async () => {
      const querySchema = z.object({
        id: z.string().uuid('Invalid ID'),
      });

      const resolver = jest.fn().mockResolvedValue({ id: 'test', name: 'Test' });
      const wrappedResolver = withValidation(querySchema, resolver);

      const validId = '123e4567-e89b-12d3-a456-426614174000';
      await wrappedResolver(null, { id: validId }, mockContext);

      expect(resolver).toHaveBeenCalledWith(null, { id: validId }, mockContext);
    });

    it('should throw GraphQLError on validation failure', async () => {
      const resolver = jest.fn();
      const wrappedResolver = withValidation(testSchema, resolver);

      const invalidInput = { name: '', age: -5 };

      await expect(wrappedResolver(null, { input: invalidInput }, mockContext)).rejects.toThrow(
        GraphQLError
      );

      expect(resolver).not.toHaveBeenCalled();
    });

    it('should include validation errors in GraphQL error extensions', async () => {
      const resolver = jest.fn();
      const wrappedResolver = withValidation(testSchema, resolver);

      const invalidInput = { name: '', age: -5 };

      try {
        await wrappedResolver(null, { input: invalidInput }, mockContext);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error.message).toBe('Validation failed');
        expect(error.extensions.code).toBe('BAD_USER_INPUT');
        expect(error.extensions.validationErrors).toBeDefined();
        expect(Array.isArray(error.extensions.validationErrors)).toBe(true);
      }
    });

    it('should log validation failures', async () => {
      const resolver = jest.fn();
      const wrappedResolver = withValidation(testSchema, resolver);

      const invalidInput = { name: '', age: -5 };

      try {
        await wrappedResolver(null, { input: invalidInput }, mockContext);
      } catch (error) {
        // Expected
      }

      expect(mockErrorHandler.logWarning).toHaveBeenCalledWith(
        'GraphQL validation failed',
        expect.objectContaining({
          userId: 'user-1',
          context: expect.objectContaining({
            graphql: true,
            validationErrors: expect.any(Array),
          }),
        })
      );
    });

    it('should format Zod errors correctly', async () => {
      const resolver = jest.fn();
      const wrappedResolver = withValidation(testSchema, resolver);

      const invalidInput = { name: '', age: -5 };

      try {
        await wrappedResolver(null, { input: invalidInput }, mockContext);
        fail('Should have thrown');
      } catch (error: any) {
        const errors = error.extensions.validationErrors as ValidationErrorDetail[];
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toHaveProperty('path');
        expect(errors[0]).toHaveProperty('message');
        expect(Array.isArray(errors[0].path)).toBe(true);
      }
    });

    it('should re-throw non-Zod errors', async () => {
      const resolver = jest.fn().mockRejectedValue(new Error('Database error'));
      const wrappedResolver = withValidation(testSchema, resolver);

      const validInput = { name: 'Test', age: 25 };

      await expect(wrappedResolver(null, { input: validInput }, mockContext)).rejects.toThrow(
        'Database error'
      );
    });

    it('should sanitize sensitive fields in logs', async () => {
      const authSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const resolver = jest.fn();
      const wrappedResolver = withValidation(authSchema, resolver);

      const input = { email: 'test@example.com', password: 'short' };

      try {
        await wrappedResolver(null, { input }, mockContext);
      } catch (error) {
        // Expected
      }

      expect(mockErrorHandler.logWarning).toHaveBeenCalledWith(
        'GraphQL validation failed',
        expect.objectContaining({
          context: expect.objectContaining({
            args: expect.objectContaining({
              input: expect.objectContaining({
                password: '[REDACTED]',
              }),
            }),
          }),
        })
      );
    });

    it('should work with complex nested schemas', async () => {
      const complexSchema = z.object({
        user: z.object({
          name: z.string().min(1),
          email: z.string().email(),
        }),
        preferences: z.object({
          theme: z.enum(['light', 'dark']),
          notifications: z.boolean(),
        }),
      });

      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withValidation(complexSchema, resolver);

      const input = {
        user: { name: 'John', email: 'john@example.com' },
        preferences: { theme: 'dark' as const, notifications: true },
      };

      const result = await wrappedResolver(null, { input }, mockContext);

      expect(result).toEqual({ success: true });
      expect(resolver).toHaveBeenCalled();
    });

    it('should handle optional fields correctly', async () => {
      const optionalSchema = z.object({
        name: z.string(),
        description: z.string().optional(),
      });

      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withValidation(optionalSchema, resolver);

      const input = { name: 'Test' }; // description omitted

      const result = await wrappedResolver(null, { input }, mockContext);

      expect(result).toEqual({ success: true });
    });

    it('should respect schema defaults', async () => {
      const schemaWithDefaults = z.object({
        name: z.string(),
        isActive: z.boolean().default(true),
        count: z.number().default(0),
      });

      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withValidation(schemaWithDefaults, resolver);

      const input = { name: 'Test' };

      await wrappedResolver(null, { input }, mockContext);

      expect(resolver).toHaveBeenCalledWith(
        null,
        {
          input: {
            name: 'Test',
            isActive: true,
            count: 0,
          },
        },
        mockContext
      );
    });
  });

  describe('withAsyncValidation', () => {
    it('should validate with async refinements', async () => {
      const mockDbCheck = jest.fn().mockResolvedValue(true);

      const asyncSchema = z.object({
        email: z
          .string()
          .email()
          .refine(
            async (email) => {
              return await mockDbCheck(email);
            },
            { message: 'Email already exists' }
          ),
      });

      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withAsyncValidation(asyncSchema, resolver);

      const input = { email: 'new@example.com' };
      const result = await wrappedResolver(null, { input }, mockContext);

      expect(result).toEqual({ success: true });
      expect(mockDbCheck).toHaveBeenCalledWith('new@example.com');
      expect(resolver).toHaveBeenCalledWith(null, { input }, mockContext);
    });

    it('should fail when async validation fails', async () => {
      const mockDbCheck = jest.fn().mockResolvedValue(false);

      const asyncSchema = z.object({
        email: z
          .string()
          .email()
          .refine(async (email) => await mockDbCheck(email), { message: 'Email already exists' }),
      });

      const resolver = jest.fn();
      const wrappedResolver = withAsyncValidation(asyncSchema, resolver);

      const input = { email: 'taken@example.com' };

      await expect(wrappedResolver(null, { input }, mockContext)).rejects.toThrow(GraphQLError);

      expect(mockDbCheck).toHaveBeenCalledWith('taken@example.com');
      expect(resolver).not.toHaveBeenCalled();
    });

    it('should handle multiple async validations', async () => {
      const mockEmailCheck = jest.fn().mockResolvedValue(true);
      const mockUsernameCheck = jest.fn().mockResolvedValue(true);

      const asyncSchema = z.object({
        email: z
          .string()
          .email()
          .refine(async (email) => await mockEmailCheck(email), {
            message: 'Email already exists',
          }),
        username: z
          .string()
          .min(3)
          .refine(async (username) => await mockUsernameCheck(username), {
            message: 'Username already exists',
          }),
      });

      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withAsyncValidation(asyncSchema, resolver);

      const input = { email: 'new@example.com', username: 'newuser' };
      await wrappedResolver(null, { input }, mockContext);

      expect(mockEmailCheck).toHaveBeenCalledWith('new@example.com');
      expect(mockUsernameCheck).toHaveBeenCalledWith('newuser');
      expect(resolver).toHaveBeenCalled();
    });

    it('should work with query args (not just input)', async () => {
      const mockCheck = jest.fn().mockResolvedValue(true);

      const querySchema = z.object({
        id: z
          .string()
          .refine(async (id) => await mockCheck(id), { message: 'Entity does not exist' }),
      });

      const resolver = jest.fn().mockResolvedValue({ id: 'test', name: 'Test' });
      const wrappedResolver = withAsyncValidation(querySchema, resolver);

      await wrappedResolver(null, { id: 'valid-id' }, mockContext);

      expect(mockCheck).toHaveBeenCalledWith('valid-id');
      expect(resolver).toHaveBeenCalledWith(null, { id: 'valid-id' }, mockContext);
    });

    it('should log validation failures', async () => {
      const asyncSchema = z.object({
        email: z
          .string()
          .email()
          .refine(async () => false, { message: 'Email already exists' }),
      });

      const resolver = jest.fn();
      const wrappedResolver = withAsyncValidation(asyncSchema, resolver);

      const input = { email: 'taken@example.com' };

      try {
        await wrappedResolver(null, { input }, mockContext);
      } catch (error) {
        // Expected
      }

      expect(mockErrorHandler.logWarning).toHaveBeenCalledWith(
        'GraphQL validation failed',
        expect.objectContaining({
          userId: 'user-1',
          context: expect.objectContaining({
            graphql: true,
            validationErrors: expect.any(Array),
          }),
        })
      );
    });

    it('should include async validation errors in GraphQL error extensions', async () => {
      const asyncSchema = z.object({
        email: z
          .string()
          .email()
          .refine(async () => false, { message: 'Email already exists' }),
      });

      const resolver = jest.fn();
      const wrappedResolver = withAsyncValidation(asyncSchema, resolver);

      const input = { email: 'taken@example.com' };

      try {
        await wrappedResolver(null, { input }, mockContext);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error.message).toBe('Validation failed');
        expect(error.extensions.code).toBe('BAD_USER_INPUT');
        expect(error.extensions.validationErrors).toBeDefined();
        const errors = error.extensions.validationErrors as ValidationErrorDetail[];
        expect(errors.some((e) => e.message === 'Email already exists')).toBe(true);
      }
    });

    it('should handle async validation errors gracefully', async () => {
      const asyncSchema = z.object({
        email: z
          .string()
          .email()
          .refine(
            async () => {
              throw new Error('Database connection failed');
            },
            { message: 'Could not validate email' }
          ),
      });

      const resolver = jest.fn();
      const wrappedResolver = withAsyncValidation(asyncSchema, resolver);

      const input = { email: 'test@example.com' };

      await expect(wrappedResolver(null, { input }, mockContext)).rejects.toThrow();
      expect(resolver).not.toHaveBeenCalled();
    });

    it('should combine sync and async validations', async () => {
      const mockCheck = jest.fn().mockResolvedValue(true);

      const combinedSchema = z.object({
        email: z
          .string()
          .email('Invalid email format') // sync
          .refine(
            async (email) => await mockCheck(email),
            { message: 'Email already exists' } // async
          ),
        age: z.number().min(18, 'Must be at least 18'), // sync
      });

      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withAsyncValidation(combinedSchema, resolver);

      // Should pass all validations
      const validInput = { email: 'valid@example.com', age: 25 };
      await wrappedResolver(null, { input: validInput }, mockContext);
      expect(resolver).toHaveBeenCalled();

      // Should fail sync validation
      // Note: Zod's parseAsync will still evaluate async validators even if sync ones fail
      resolver.mockClear();
      mockCheck.mockClear();
      const invalidEmail = { email: 'invalid', age: 25 };
      await expect(wrappedResolver(null, { input: invalidEmail }, mockContext)).rejects.toThrow();
      expect(resolver).not.toHaveBeenCalled();
    });

    it('should sanitize sensitive fields in async validation logs', async () => {
      const asyncSchema = z.object({
        email: z.string().email(),
        password: z
          .string()
          .min(8)
          .refine(async () => false, { message: 'Invalid credentials' }),
      });

      const resolver = jest.fn();
      const wrappedResolver = withAsyncValidation(asyncSchema, resolver);

      const input = { email: 'test@example.com', password: 'secret123' };

      try {
        await wrappedResolver(null, { input }, mockContext);
      } catch (error) {
        // Expected
      }

      expect(mockErrorHandler.logWarning).toHaveBeenCalledWith(
        'GraphQL validation failed',
        expect.objectContaining({
          context: expect.objectContaining({
            args: expect.objectContaining({
              input: expect.objectContaining({
                password: '[REDACTED]',
              }),
            }),
          }),
        })
      );
    });
  });

  describe('withValidatedResolver', () => {
    const testSchema = z.object({
      name: z.string().min(1),
    });

    beforeEach(() => {
      // Mock withErrorHandling to just return the resolver
      (withErrorHandling as jest.Mock).mockImplementation((resolver) => resolver);
    });

    it('should combine validation and error handling', async () => {
      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withValidatedResolver(testSchema, resolver, 'testOp');

      const input = { name: 'Test' };
      const result = await wrappedResolver(null, { input }, mockContext);

      expect(result).toEqual({ success: true });
      expect(withErrorHandling).toHaveBeenCalled();
    });

    it('should pass operation name to withErrorHandling', () => {
      const resolver = jest.fn();
      withValidatedResolver(testSchema, resolver, 'createUser');

      expect(withErrorHandling).toHaveBeenCalledWith(expect.any(Function), 'createUser');
    });

    it('should validate before error handling', async () => {
      (withErrorHandling as jest.Mock).mockImplementation((resolver) => resolver);

      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withValidatedResolver(testSchema, resolver, 'testOp');

      const invalidInput = { name: '' };

      await expect(wrappedResolver(null, { input: invalidInput }, mockContext)).rejects.toThrow(
        GraphQLError
      );

      // Resolver should not be called if validation fails
      expect(resolver).not.toHaveBeenCalled();
    });
  });

  describe('withAsyncValidatedResolver', () => {
    const asyncSchema = z.object({
      email: z
        .string()
        .email()
        .refine(
          async (email) => {
            // Simulate DB check
            return email !== 'taken@example.com';
          },
          { message: 'Email already exists' }
        ),
    });

    beforeEach(() => {
      (withErrorHandling as jest.Mock).mockImplementation((resolver) => resolver);
    });

    it('should combine async validation and error handling', async () => {
      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withAsyncValidatedResolver(asyncSchema, resolver, 'createUser');

      const input = { email: 'new@example.com' };
      const result = await wrappedResolver(null, { input }, mockContext);

      expect(result).toEqual({ success: true });
      expect(withErrorHandling).toHaveBeenCalled();
      expect(resolver).toHaveBeenCalled();
    });

    it('should pass operation name to withErrorHandling', () => {
      const resolver = jest.fn();
      withAsyncValidatedResolver(asyncSchema, resolver, 'createUser');

      expect(withErrorHandling).toHaveBeenCalledWith(expect.any(Function), 'createUser');
    });

    it('should validate before error handling', async () => {
      (withErrorHandling as jest.Mock).mockImplementation((resolver) => resolver);

      const resolver = jest.fn().mockResolvedValue({ success: true });
      const wrappedResolver = withAsyncValidatedResolver(asyncSchema, resolver, 'createUser');

      const invalidInput = { email: 'taken@example.com' };

      await expect(wrappedResolver(null, { input: invalidInput }, mockContext)).rejects.toThrow(
        GraphQLError
      );

      expect(resolver).not.toHaveBeenCalled();
    });

    it('should handle async validation failures properly', async () => {
      (withErrorHandling as jest.Mock).mockImplementation((resolver) => resolver);

      const resolver = jest.fn();
      const wrappedResolver = withAsyncValidatedResolver(asyncSchema, resolver, 'testOp');

      try {
        await wrappedResolver(null, { input: { email: 'taken@example.com' } }, mockContext);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error.extensions.validationErrors).toBeDefined();
      }
    });
  });
});
