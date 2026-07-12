import { z } from 'zod';

const dayOfMonthSchema = z
  .number()
  .int('Day must be an integer')
  .min(1, 'Day must be between 1 and 31')
  .max(31, 'Day must be between 1 and 31');

export const creditCardIdSchema = z.object({
  id: z.string().uuid('Invalid credit card ID'),
});

export const creditCardChargeIdSchema = z.object({
  id: z.string().uuid('Invalid credit card charge ID'),
});

export const createCreditCardInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  icon: z.string().min(1).max(50).optional().nullable(),
  creditLimit: z.number().min(0, 'Credit limit must be zero or greater'),
  cutoffDay: dayOfMonthSchema,
  paymentDay: dayOfMonthSchema,
});

export const updateCreditCardInputSchema = z.object({
  id: z.string().uuid('Invalid credit card ID'),
  input: z
    .object({
      name: z.string().trim().min(1).max(255).optional(),
      icon: z.string().min(1).max(50).optional().nullable(),
      creditLimit: z.number().min(0).optional(),
      cutoffDay: dayOfMonthSchema.optional(),
      paymentDay: dayOfMonthSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export const createCreditCardChargeInputSchema = z.object({
  creditCardId: z.string().uuid('Invalid credit card ID'),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(255, 'Description must be less than 255 characters'),
  amount: z.number().positive('Amount must be greater than zero'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export const updateCreditCardChargeInputSchema = z.object({
  id: z.string().uuid('Invalid credit card charge ID'),
  input: z.object({
    creditCardId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional().nullable(),
    description: z.string().trim().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});

export const creditCardChargesFilterSchema = z.object({
  creditCardId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const creditCardChargesFilterArgsSchema = z.object({
  filter: creditCardChargesFilterSchema.optional(),
});

export const updateWalletUserSettingsInputSchema = z
  .object({
    creditCardPaymentCategoryId: z.string().uuid('Invalid category ID').optional().nullable(),
    periodCutoffDay: dayOfMonthSchema.optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const payCreditCardInputSchema = z.object({
  creditCardId: z.string().uuid('Invalid credit card ID'),
  walletId: z.string().uuid('Invalid wallet ID'),
  amount: z.number().positive('Amount must be greater than zero').optional(),
  paidDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
});
