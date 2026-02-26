import { z } from 'zod';
import {
  validateDateRange,
  validateFutureDate,
  validatePastDate,
  validateConditionalField,
  validateFieldsMatch,
  validateAtLeastOne,
  validateExactlyOne,
  validateNumericRange,
  createUniqueValidator,
  createExistsValidator,
  commonSchemas,
} from '../shared/utils/custom-validators';

/**
 * EXAMPLES OF ADVANCED VALIDATION PATTERNS
 *
 * This file demonstrates how to use the custom validators in real-world scenarios.
 * Copy and adapt these patterns to your own validators.
 */

// ============================================================================
// EXAMPLE 1: Date Range Validation (e.g., Event, Course, Routine)
// ============================================================================

export const eventSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    location: z.string().optional(),
  })
  .refine(validateDateRange, {
    message: 'Start date must be before end date',
    path: ['startDate'], // Error will be associated with startDate field
  });

// ============================================================================
// EXAMPLE 2: Conditional Field Validation (e.g., Recurring vs One-time)
// ============================================================================

export const habitSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['recurring', 'one-time']),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    targetDate: z.string().datetime().optional(),
  })
  .refine(validateConditionalField('type', 'recurring', 'frequency'), {
    message: 'Frequency is required for recurring habits',
    path: ['frequency'],
  })
  .refine(validateConditionalField('type', 'one-time', 'targetDate'), {
    message: 'Target date is required for one-time habits',
    path: ['targetDate'],
  });

// ============================================================================
// EXAMPLE 3: Async Validation - Email Uniqueness (User Registration)
// ============================================================================

/**
 * In your service or repository, define the check function:
 *
 * export async function isEmailUnique(email: string): Promise<boolean> {
 *   const user = await db.users.findOne({ email });
 *   return !user;
 * }
 */

// Then use it in your schema:
/*
import { isEmailUnique } from '../services/user.service';

export const userRegistrationSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .refine(
      createUniqueValidator(isEmailUnique),
      { message: 'Email already exists' }
    ),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .refine(
      createUniqueValidator(async (username) => {
        const user = await db.users.findOne({ username });
        return !user;
      }),
      { message: 'Username already taken' }
    ),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
})
  .refine(
    validateFieldsMatch('password', 'confirmPassword'),
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );
*/

// ============================================================================
// EXAMPLE 4: Async Validation - Foreign Key Validation
// ============================================================================

/**
 * Validate that a referenced entity exists
 *
 * In your service:
 * export async function categoryExists(categoryId: string): Promise<boolean> {
 *   const category = await db.categories.findById(categoryId);
 *   return !!category;
 * }
 */

/*
import { categoryExists } from '../services/category.service';

export const expenseSchema = z.object({
  amount: commonSchemas.money,
  description: z.string().min(1),
  date: z.string().datetime(),
  categoryId: commonSchemas.uuid.refine(
    createExistsValidator(categoryExists),
    { message: 'Category does not exist' }
  ),
  accountId: commonSchemas.uuid.refine(
    createExistsValidator(async (accountId) => {
      const account = await db.accounts.findById(accountId);
      return !!account;
    }),
    { message: 'Account does not exist' }
  ),
});
*/

// ============================================================================
// EXAMPLE 5: At Least One Field Required (Contact Information)
// ============================================================================

export const contactSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  })
  .refine(validateAtLeastOne('email', 'phone'), {
    message: 'At least one contact method (email or phone) is required',
    path: ['email'],
  });

// ============================================================================
// EXAMPLE 6: Exactly One Field Required (Payment Method)
// ============================================================================

export const paymentSchema = z
  .object({
    amount: commonSchemas.money,
    cardId: z.string().optional(),
    bankAccountId: z.string().optional(),
    cashAmount: z.number().optional(),
  })
  .refine(validateExactlyOne('cardId', 'bankAccountId', 'cashAmount'), {
    message: 'Exactly one payment method must be specified',
    path: ['cardId'],
  });

// ============================================================================
// EXAMPLE 7: Numeric Range Validation (Price, Age, Budget)
// ============================================================================

export const productFilterSchema = z
  .object({
    category: z.string().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    inStock: z.boolean().optional(),
  })
  .refine((data) => validateNumericRange({ min: data.minPrice, max: data.maxPrice }), {
    message: 'Minimum price cannot be greater than maximum price',
    path: ['minPrice'],
  });

// ============================================================================
// EXAMPLE 8: Future Date Validation (Appointments, Deadlines)
// ============================================================================

export const appointmentSchema = z.object({
  title: z.string().min(1),
  scheduledAt: z
    .string()
    .datetime()
    .refine(validateFutureDate, { message: 'Appointment must be scheduled in the future' }),
  duration: commonSchemas.positiveInt,
  notes: z.string().optional(),
});

// ============================================================================
// EXAMPLE 9: Past Date Validation (Birth Date, Historical Records)
// ============================================================================

export const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z
    .string()
    .datetime()
    .refine(validatePastDate, { message: 'Birth date must be in the past' }),
  email: z.string().email(),
});

// ============================================================================
// EXAMPLE 10: Combined Validations (Complex Business Logic)
// ============================================================================

export const budgetSchema = z
  .object({
    name: z.string().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    totalAmount: commonSchemas.money,
    spentAmount: commonSchemas.money,
    categories: z
      .array(
        z.object({
          categoryId: commonSchemas.uuid,
          allocatedAmount: commonSchemas.money,
        })
      )
      .min(1, 'At least one category is required'),
  })
  .refine(validateDateRange, {
    message: 'Start date must be before end date',
    path: ['startDate'],
  })
  .refine((data) => data.spentAmount <= data.totalAmount, {
    message: 'Spent amount cannot exceed total budget',
    path: ['spentAmount'],
  })
  .refine(
    (data) => {
      const totalAllocated = data.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0);
      return totalAllocated <= data.totalAmount;
    },
    {
      message: 'Total allocated amount cannot exceed budget',
      path: ['categories'],
    }
  );

// ============================================================================
// EXAMPLE 11: Update Schema with Partial Validation
// ============================================================================

export const updateEventSchema = z
  .object({
    id: commonSchemas.uuid,
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    location: z.string().optional(),
  })
  .refine(
    (data) => {
      // Only validate date range if both dates are provided
      if (data.startDate && data.endDate) {
        return validateDateRange({ startDate: data.startDate, endDate: data.endDate });
      }
      return true;
    },
    {
      message: 'Start date must be before end date',
      path: ['startDate'],
    }
  );

// ============================================================================
// EXAMPLE 12: Pagination and Filters with Common Schemas
// ============================================================================

export const queryExpensesSchema = z
  .object({
    // Pagination
    offset: commonSchemas.offset,
    limit: commonSchemas.limit,
    sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
    sortDirection: commonSchemas.sortDirection,

    // Filters
    categoryId: commonSchemas.uuid.optional(),
    accountId: commonSchemas.uuid.optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
  })
  .refine((data) => validateDateRange({ startDate: data.startDate, endDate: data.endDate }), {
    message: 'Start date must be before end date',
    path: ['startDate'],
  })
  .refine((data) => validateNumericRange({ min: data.minAmount, max: data.maxAmount }), {
    message: 'Minimum amount cannot be greater than maximum amount',
    path: ['minAmount'],
  });

// ============================================================================
// USAGE IN GRAPHQL RESOLVERS
// ============================================================================

/**
 * Using withAsyncValidatedResolver for schemas with async validations:
 *
 * import { withAsyncValidatedResolver } from '../graphql/utils/validation';
 * import { userRegistrationSchema } from '../validators/examples';
 *
 * const resolvers = {
 *   Mutation: {
 *     registerUser: withAsyncValidatedResolver(
 *       userRegistrationSchema,
 *       async (_, { input }, context) => {
 *         // input is validated, including async checks for email/username uniqueness
 *         const user = await userService.createUser(input);
 *         return { user, token: generateToken(user) };
 *       },
 *       'registerUser'
 *     ),
 *
 *     createExpense: withAsyncValidatedResolver(
 *       expenseSchema,
 *       async (_, { input }, context) => {
 *         requireAuth(context);
 *         // categoryId and accountId are validated to exist
 *         const expense = await expenseService.create(context.user.id, input);
 *         return expense;
 *       },
 *       'createExpense'
 *     ),
 *   },
 * };
 */

/**
 * Using withValidatedResolver for schemas without async validations:
 *
 * import { withValidatedResolver } from '../graphql/utils/validation';
 *
 * const resolvers = {
 *   Mutation: {
 *     createEvent: withValidatedResolver(
 *       eventSchema,
 *       async (_, { input }, context) => {
 *         requireAuth(context);
 *         // Date range is validated
 *         const event = await eventService.create(context.user.id, input);
 *         return event;
 *       },
 *       'createEvent'
 *     ),
 *   },
 *
 *   Query: {
 *     getExpenses: withValidatedResolver(
 *       queryExpensesSchema,
 *       async (_, args, context) => {
 *         requireAuth(context);
 *         // Pagination and filters are validated
 *         const expenses = await expenseService.query(context.user.id, args);
 *         return expenses;
 *       },
 *       'getExpenses'
 *     ),
 *   },
 * };
 */
