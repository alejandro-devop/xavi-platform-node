import { z } from 'zod';

/**
 * Custom validation utilities for advanced scenarios
 */

/**
 * Validates that startDate is before endDate
 * Usage in schema: .refine(validateDateRange, { message: 'Start date must be before end date' })
 */
export const validateDateRange = (data: { startDate?: Date | string; endDate?: Date | string }) => {
  if (!data.startDate || !data.endDate) return true;

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  return start < end;
};

/**
 * Validates that a date is not in the past
 */
export const validateFutureDate = (date: Date | string) => {
  const inputDate = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to start of day for fair comparison

  return inputDate >= now;
};

/**
 * Validates that a date is not in the future
 */
export const validatePastDate = (date: Date | string) => {
  const inputDate = new Date(date);
  const now = new Date();

  return inputDate <= now;
};

/**
 * Validates that a date is within a specific range
 */
export const validateDateWithinRange = (days: number) => {
  return (date: Date | string) => {
    const inputDate = new Date(date);
    const now = new Date();
    const maxDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return inputDate <= maxDate;
  };
};

/**
 * Creates an async validator to check uniqueness in database
 *
 * @example
 * ```typescript
 * const emailSchema = z.string().email().refine(
 *   createUniqueValidator(async (email) => {
 *     const user = await db.users.findOne({ email });
 *     return !user;
 *   }),
 *   { message: 'Email already exists' }
 * );
 * ```
 */
export const createUniqueValidator = <T>(checkFn: (value: T) => Promise<boolean>) => {
  return async (value: T): Promise<boolean> => {
    try {
      return await checkFn(value);
    } catch (error) {
      console.error('Unique validation error:', error);
      return false;
    }
  };
};

/**
 * Creates an async validator to check existence in database
 *
 * @example
 * ```typescript
 * const categoryIdSchema = z.string().refine(
 *   createExistsValidator(async (id) => {
 *     const category = await db.categories.findById(id);
 *     return !!category;
 *   }),
 *   { message: 'Category does not exist' }
 * );
 * ```
 */
export const createExistsValidator = <T>(checkFn: (value: T) => Promise<boolean>) => {
  return async (value: T): Promise<boolean> => {
    try {
      return await checkFn(value);
    } catch (error) {
      console.error('Existence validation error:', error);
      return false;
    }
  };
};

/**
 * Validates that a value belongs to a user
 * Useful for authorization checks
 */
export const createOwnershipValidator = <T>(
  checkFn: (value: T, userId: string) => Promise<boolean>
) => {
  return async (value: T, ctx: { userId?: string }): Promise<boolean> => {
    if (!ctx.userId) return false;

    try {
      return await checkFn(value, ctx.userId);
    } catch (error) {
      console.error('Ownership validation error:', error);
      return false;
    }
  };
};

/**
 * Validates conditional fields - field A is required if field B has a specific value
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   type: z.enum(['recurring', 'one-time']),
 *   frequency: z.string().optional(),
 * }).refine(
 *   validateConditionalField('type', 'recurring', 'frequency'),
 *   { message: 'Frequency is required for recurring items' }
 * );
 * ```
 */
export const validateConditionalField = <T extends Record<string, any>>(
  conditionField: keyof T,
  conditionValue: any,
  requiredField: keyof T
) => {
  return (data: T): boolean => {
    if (data[conditionField] === conditionValue) {
      return (
        data[requiredField] !== undefined &&
        data[requiredField] !== null &&
        data[requiredField] !== ''
      );
    }
    return true;
  };
};

/**
 * Validates that at least one of the specified fields is present
 */
export const validateAtLeastOne = <T extends Record<string, any>>(...fields: (keyof T)[]) => {
  return (data: T): boolean => {
    return fields.some((field) => {
      const value = data[field];
      return value !== undefined && value !== null && value !== '';
    });
  };
};

/**
 * Validates that exactly one of the specified fields is present
 */
export const validateExactlyOne = <T extends Record<string, any>>(...fields: (keyof T)[]) => {
  return (data: T): boolean => {
    const presentCount = fields.filter((field) => {
      const value = data[field];
      return value !== undefined && value !== null && value !== '';
    }).length;

    return presentCount === 1;
  };
};

/**
 * Validates array length relationships
 */
export const validateArrayMinLength = (minLength: number) => {
  return <T>(arr: T[]): boolean => {
    return arr.length >= minLength;
  };
};

/**
 * Validates that two fields match (useful for password confirmation)
 */
export const validateFieldsMatch = <T extends Record<string, any>>(
  field1: keyof T,
  field2: keyof T
) => {
  return (data: T): boolean => {
    return data[field1] === data[field2];
  };
};

/**
 * Validates numeric range relationships
 */
export const validateNumericRange = (data: { min?: number; max?: number }) => {
  if (data.min === undefined || data.max === undefined) return true;
  return data.min <= data.max;
};

/**
 * Common validation schemas that can be reused
 */
export const commonSchemas = {
  // UUID validation (v4 or v7)
  uuid: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      'Invalid UUID format'
    ),

  // Date string in ISO format
  isoDate: z.string().datetime({ message: 'Invalid ISO date format' }),

  // Positive integer
  positiveInt: z.number().int().positive('Must be a positive integer'),

  // Non-negative integer
  nonNegativeInt: z.number().int().min(0, 'Must be non-negative'),

  // Decimal with 2 decimal places (for money)
  money: z.number().refine(
    (val) => {
      const decimal = val.toString().split('.')[1];
      return !decimal || decimal.length <= 2;
    },
    { message: 'Maximum 2 decimal places allowed' }
  ),

  // Pagination offset
  offset: z.number().int().min(0).default(0),

  // Pagination limit
  limit: z.number().int().min(1).max(100).default(20),

  // Sort direction
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
};

/**
 * Type-safe context for validators that need user info
 */
export interface ValidatorContext {
  userId?: string;
  [key: string]: any;
}

/**
 * Helper to create a refine function that has access to context
 * This is useful for GraphQL resolvers where we have user context
 */
export const createContextualValidator = <T>(
  validator: (data: T, context: ValidatorContext) => boolean | Promise<boolean>,
  context: ValidatorContext
) => {
  return (data: T) => validator(data, context);
};
