import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { errorHandler, type ErrorMetadata } from '../../shared/errors';

/**
 * Context interface for GraphQL resolvers
 */
export interface GraphQLContext {
  user?: {
    id: string | number;
    email?: string;
  } | null;
  [key: string]: any;
}

/**
 * Wrapper function for GraphQL resolvers with centralized error handling
 * Automaticamente loggea errores y los convierte a GraphQLError
 *
 * @example
 * ```typescript
 * walletAdd: withErrorHandling(async (_, { input }, context) => {
 *   return await walletService.createWallet(context.user.id, input);
 * }, 'walletAdd')
 * ```
 */
export function withErrorHandling<TArgs = any, TResult = any>(
  resolver: (parent: any, args: TArgs, context: GraphQLContext) => Promise<TResult>,
  operationName: string
) {
  return async (parent: any, args: TArgs, context: GraphQLContext): Promise<TResult> => {
    try {
      // Set user context if available
      if (context.user?.id) {
        errorHandler.setUserContext(context.user.id);
      }

      return await resolver(parent, args, context);
    } catch (error: any) {
      // Build error metadata
      const metadata: ErrorMetadata = {
        userId: context.user?.id,
        operation: operationName,
        context: {
          args: sanitizeArgs(args),
          graphql: true,
        },
      };

      // Handle Zod validation errors with proper structure
      if (error instanceof z.ZodError) {
        // Format validation errors for GraphQL response
        const validationErrors = error.errors.map((err) => ({
          path: err.path,
          message: err.message,
          code: err.code,
        }));

        // Log validation failure for monitoring
        errorHandler.logWarning(`GraphQL validation failed in ${operationName}`, {
          ...metadata,
          context: {
            ...metadata.context,
            validationErrors,
          },
        });

        // Throw structured GraphQL error
        throw new GraphQLError('Validation failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors,
          },
        });
      }

      // If it's already a GraphQLError with extensions (like validation errors),
      // preserve those extensions
      if (error instanceof GraphQLError) {
        // Log for monitoring but don't double-handle
        errorHandler.logInfo(
          `GraphQL operation ${operationName} failed: ${error.message}`,
          metadata
        );

        // Re-throw with preserved extensions
        throw error;
      }

      // Handle and log non-GraphQL errors
      errorHandler.handleError(error, metadata);

      // Convert to GraphQL error
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.name || 'INTERNAL_SERVER_ERROR',
          statusCode: error.statusCode,
        },
      });
    }
  };
}

/**
 * Check authentication and log warning if not authenticated
 */
export function requireAuth(context: GraphQLContext, operationName: string): void {
  if (!context.user) {
    errorHandler.logWarning('Unauthenticated access attempt', {
      operation: operationName,
      context: { graphql: true },
    });

    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

/**
 * Sanitize arguments to remove sensitive data from logs
 */
function sanitizeArgs(args: any): any {
  if (!args) return {};

  const sanitized = { ...args };
  const sensitiveFields = ['password', 'token', 'refreshToken', 'secret'];

  // Remove sensitive fields
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
    // Check nested input objects
    if (sanitized.input && typeof sanitized.input === 'object') {
      for (const inputField of sensitiveFields) {
        if (inputField in sanitized.input) {
          sanitized.input[inputField] = '[REDACTED]';
        }
      }
    }
  }

  return sanitized;
}

/**
 * Log successful operations (useful for audit trails)
 */
export function logOperation(
  operationName: string,
  context: GraphQLContext,
  details?: Record<string, any>
): void {
  errorHandler.logInfo(`GraphQL operation: ${operationName}`, {
    userId: context.user?.id,
    operation: operationName,
    context: {
      graphql: true,
      ...details,
    },
  });
}
