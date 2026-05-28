import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { errorHandler } from '../../shared/errors';
import { withErrorHandling, type GraphQLContext } from './error-handler';

/**
 * Validation error details for GraphQL
 */
export interface ValidationErrorDetail {
  path: (string | number)[];
  message: string;
  code?: string;
}

/**
 * Wrapper function that adds Zod validation to a GraphQL resolver
 * Validates args.input or args directly before executing the resolver
 *
 * @example
 * ```typescript
 * walletAdd: withValidation(
 *   walletInputSchema,
 *   async (_, { input }, context) => {
 *     // input is validated and type-safe here
 *     return await walletService.createWallet(context.user.id, input);
 *   }
 * )
 * ```
 */
export function withValidation<TSchema extends z.ZodType>(
  schema: TSchema,
  resolver: (parent: any, args: any, context: GraphQLContext) => Promise<any>
) {
  return async (parent: any, args: any, context: GraphQLContext): Promise<any> => {
    try {
      // Mutations with only `input` validate the inner object (e.g. habitAdd).
      // Mutations with `input` plus other args (e.g. swUpdateList id + input) validate all args.
      const hasArgsBeyondInput =
        args.input !== undefined &&
        Object.keys(args).some((key) => key !== 'input' && args[key] !== undefined);

      const dataToValidate = hasArgsBeyondInput
        ? args
        : args.input !== undefined
          ? args.input
          : args;

      const validated = schema.parse(dataToValidate);

      const validatedArgs = hasArgsBeyondInput
        ? validated
        : args.input !== undefined
          ? { ...args, input: validated }
          : validated;

      // Execute resolver with validated data
      return await resolver(parent, validatedArgs, context);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Format Zod errors for GraphQL
        const validationErrors: ValidationErrorDetail[] = error.errors.map((err) => ({
          path: err.path,
          message: err.message,
          code: err.code,
        }));

        // Log validation failure
        errorHandler.logWarning('GraphQL validation failed', {
          userId: context.user?.id,
          context: {
            graphql: true,
            validationErrors,
            args: sanitizeArgs(args),
          },
        });

        // Throw GraphQL error with validation details
        throw new GraphQLError('Validation failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors,
          },
        });
      }

      // Re-throw other errors
      throw error;
    }
  };
}

/**
 * Wrapper function that adds Zod validation with async support to a GraphQL resolver
 * Use this for validations that require database checks or other async operations
 * Validates args.input or args directly before executing the resolver
 *
 * @example
 * ```typescript
 * createUser: withAsyncValidation(
 *   z.object({
 *     email: z.string().email().refine(async (email) => {
 *       const exists = await userService.emailExists(email);
 *       return !exists;
 *     }, { message: 'Email already exists' })
 *   }),
 *   async (_, { input }, context) => {
 *     return await userService.createUser(input);
 *   }
 * )
 * ```
 */
export function withAsyncValidation<TSchema extends z.ZodType>(
  schema: TSchema,
  resolver: (parent: any, args: any, context: GraphQLContext) => Promise<any>
) {
  return async (parent: any, args: any, context: GraphQLContext): Promise<any> => {
    try {
      const hasArgsBeyondInput =
        args.input !== undefined &&
        Object.keys(args).some((key) => key !== 'input' && args[key] !== undefined);

      const dataToValidate = hasArgsBeyondInput
        ? args
        : args.input !== undefined
          ? args.input
          : args;

      const validated = await schema.parseAsync(dataToValidate);

      const validatedArgs = hasArgsBeyondInput
        ? validated
        : args.input !== undefined
          ? { ...args, input: validated }
          : validated;

      // Execute resolver with validated data
      return await resolver(parent, validatedArgs, context);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Format Zod errors for GraphQL
        const validationErrors: ValidationErrorDetail[] = error.errors.map((err) => ({
          path: err.path,
          message: err.message,
          code: err.code,
        }));

        // Log validation failure
        errorHandler.logWarning('GraphQL validation failed', {
          userId: context.user?.id,
          context: {
            graphql: true,
            validationErrors,
            args: sanitizeArgs(args),
          },
        });

        // Throw GraphQL error with validation details
        throw new GraphQLError('Validation failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors,
          },
        });
      }

      // Re-throw other errors
      throw error;
    }
  };
}

/**
 * Combined wrapper that adds both validation and error handling
 * This is the recommended way to use validation in resolvers
 *
 * @example
 * ```typescript
 * walletAdd: withValidatedResolver(
 *   walletInputSchema,
 *   async (_, { input }, context) => {
 *     requireAuth(context, 'walletAdd');
 *     return await walletService.createWallet(context.user.id, input);
 *   },
 *   'walletAdd'
 * )
 * ```
 */
export function withValidatedResolver<TSchema extends z.ZodType>(
  schema: TSchema,
  resolver: (parent: any, args: any, context: GraphQLContext) => Promise<any>,
  operationName: string
) {
  return withErrorHandling(withValidation(schema, resolver), operationName);
}

/**
 * Combined wrapper that adds both async validation and error handling
 * Use this when your validation includes async checks (e.g., database queries)
 *
 * @example
 * ```typescript
 * createUser: withAsyncValidatedResolver(
 *   userCreateSchema, // schema with async refine() checks
 *   async (_, { input }, context) => {
 *     requireAuth(context, 'createUser');
 *     return await userService.createUser(input);
 *   },
 *   'createUser'
 * )
 * ```
 */
export function withAsyncValidatedResolver<TSchema extends z.ZodType>(
  schema: TSchema,
  resolver: (parent: any, args: any, context: GraphQLContext) => Promise<any>,
  operationName: string
) {
  return withErrorHandling(withAsyncValidation(schema, resolver), operationName);
}

/**
 * Sanitize arguments to remove sensitive data from logs
 */
function sanitizeArgs(args: any): any {
  if (!args) return {};

  const sanitized = { ...args };
  const sensitiveFields = ['password', 'token', 'refreshToken', 'secret'];

  // Remove sensitive fields from top level
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Remove sensitive fields from input
  if (sanitized.input && typeof sanitized.input === 'object') {
    for (const field of sensitiveFields) {
      if (field in sanitized.input) {
        sanitized.input[field] = '[REDACTED]';
      }
    }
  }

  return sanitized;
}
