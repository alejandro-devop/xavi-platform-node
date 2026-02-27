import { GraphQLError } from 'graphql';
import { scheduledExpenseService } from '../../../services/scheduled-expense.service';
import {
  scheduledExpenseInputSchema,
  scheduledExpenseUpdateSchema,
  scheduledExpenseIdSchema,
  scheduledExpenseFilterSchema,
  payScheduledExpenseSchema,
  bulkUpdateScheduledExpensesSchema,
  bulkDeleteScheduledExpensesSchema,
} from '../../../validators/schemas/scheduled-expense.schemas';
import type { AuthContext } from '../../../types/auth';
import type {
  CreateScheduledExpenseInput,
  UpdateScheduledExpenseInput,
  GetScheduledExpensesFilter,
  PayScheduledExpenseInput,
  BulkUpdateScheduledExpensesInput,
  BulkDeleteScheduledExpensesInput,
} from '../../../types/services/scheduled-expense.types';

export const scheduledExpenseResolvers = {
  Query: {
    /**
     * Get all scheduled expenses with optional filters
     */
    scheduledExpenses: async (
      _: unknown,
      { filter }: { filter?: GetScheduledExpensesFilter },
      context: AuthContext
    ) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate filter if provided
      if (filter) {
        const validation = scheduledExpenseFilterSchema.safeParse(filter);
        if (!validation.success) {
          throw new GraphQLError('Invalid filter parameters', {
            extensions: {
              code: 'BAD_USER_INPUT',
              validationErrors: validation.error.errors,
            },
          });
        }
      }

      try {
        return await scheduledExpenseService.getScheduledExpenses(context.user.id, filter);
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    /**
     * Get a single scheduled expense by ID
     */
    scheduledExpense: async (_: unknown, { id }: { id: string }, context: AuthContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate ID
      const validation = scheduledExpenseIdSchema.safeParse({ id });
      if (!validation.success) {
        throw new GraphQLError('Invalid scheduled expense ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: validation.error.errors,
          },
        });
      }

      try {
        return await scheduledExpenseService.getScheduledExpenseById(id, context.user.id);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new GraphQLError('Scheduled expense not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if ((error as Error).message.includes('permission')) {
          throw new GraphQLError('You do not have permission to access this scheduled expense', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },

  Mutation: {
    /**
     * Create a new scheduled expense (with optional recurrence)
     */
    createScheduledExpense: async (
      _: unknown,
      { input }: { input: CreateScheduledExpenseInput },
      context: AuthContext
    ) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate input
      const validation = scheduledExpenseInputSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError('Invalid input', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: validation.error.errors,
          },
        });
      }

      try {
        return await scheduledExpenseService.createScheduledExpense(context.user.id, input);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if ((error as Error).message.includes('permission')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    /**
     * Update a scheduled expense
     */
    updateScheduledExpense: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateScheduledExpenseInput },
      context: AuthContext
    ) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate ID
      const idValidation = scheduledExpenseIdSchema.safeParse({ id });
      if (!idValidation.success) {
        throw new GraphQLError('Invalid scheduled expense ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: idValidation.error.errors,
          },
        });
      }

      // Validate input
      const inputValidation = scheduledExpenseUpdateSchema.safeParse(input);
      if (!inputValidation.success) {
        throw new GraphQLError('Invalid input', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: inputValidation.error.errors,
          },
        });
      }

      try {
        return await scheduledExpenseService.updateScheduledExpense(id, context.user.id, input);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if ((error as Error).message.includes('permission')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        if ((error as Error).message.includes('paid')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'BAD_REQUEST' },
          });
        }
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    /**
     * Bulk update scheduled expenses by parent ID
     */
    bulkUpdateScheduledExpenses: async (
      _: unknown,
      { input }: { input: BulkUpdateScheduledExpensesInput },
      context: AuthContext
    ) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate input
      const validation = bulkUpdateScheduledExpensesSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError('Invalid input', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: validation.error.errors,
          },
        });
      }

      try {
        return await scheduledExpenseService.bulkUpdateScheduledExpenses(context.user.id, input);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if ((error as Error).message.includes('paid')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'BAD_REQUEST' },
          });
        }
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    /**
     * Delete a scheduled expense
     */
    deleteScheduledExpense: async (_: unknown, { id }: { id: string }, context: AuthContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate ID
      const validation = scheduledExpenseIdSchema.safeParse({ id });
      if (!validation.success) {
        throw new GraphQLError('Invalid scheduled expense ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: validation.error.errors,
          },
        });
      }

      try {
        return await scheduledExpenseService.deleteScheduledExpense(id, context.user.id);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if ((error as Error).message.includes('permission')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    /**
     * Bulk delete scheduled expenses by parent ID
     */
    bulkDeleteScheduledExpenses: async (
      _: unknown,
      { input }: { input: BulkDeleteScheduledExpensesInput },
      context: AuthContext
    ) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate input
      const validation = bulkDeleteScheduledExpensesSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError('Invalid input', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: validation.error.errors,
          },
        });
      }

      try {
        return await scheduledExpenseService.bulkDeleteScheduledExpenses(context.user.id, input);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if ((error as Error).message.includes('paid')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'BAD_REQUEST' },
          });
        }
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    /**
     * Pay a scheduled expense - creates actual expense and updates balances
     */
    payScheduledExpense: async (
      _: unknown,
      { input }: { input: PayScheduledExpenseInput },
      context: AuthContext
    ) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate input
      const validation = payScheduledExpenseSchema.safeParse(input);
      if (!validation.success) {
        throw new GraphQLError('Invalid input', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: validation.error.errors,
          },
        });
      }

      try {
        return await scheduledExpenseService.payScheduledExpense(context.user.id, input);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if ((error as Error).message.includes('already paid')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'BAD_REQUEST' },
          });
        }
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    /**
     * Revert payment of a scheduled expense
     */
    revertScheduledExpensePayment: async (
      _: unknown,
      { id }: { id: string },
      context: AuthContext
    ) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate ID
      const validation = scheduledExpenseIdSchema.safeParse({ id });
      if (!validation.success) {
        throw new GraphQLError('Invalid scheduled expense ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: validation.error.errors,
          },
        });
      }

      try {
        return await scheduledExpenseService.revertScheduledExpensePayment(id, context.user.id);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if ((error as Error).message.includes('not paid')) {
          throw new GraphQLError((error as Error).message, {
            extensions: { code: 'BAD_REQUEST' },
          });
        }
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    /**
     * Clean slate - delete ALL scheduled expenses for the user
     */
    cleanSlateScheduledExpenses: async (_: unknown, __: unknown, context: AuthContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        return await scheduledExpenseService.cleanSlate(context.user.id);
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};
