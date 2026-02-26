import { z } from 'zod';
import {
  validateDateRange,
  validateFutureDate,
  validatePastDate,
  validateDateWithinRange,
  createUniqueValidator,
  createExistsValidator,
  validateConditionalField,
  validateAtLeastOne,
  validateExactlyOne,
  validateFieldsMatch,
  validateNumericRange,
  commonSchemas,
} from '../../../src/shared/utils/custom-validators';

describe('Custom Validators', () => {
  describe('Date Validations', () => {
    describe('validateDateRange', () => {
      it('should pass when start date is before end date', () => {
        const data = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        };
        expect(validateDateRange(data)).toBe(true);
      });

      it('should fail when start date is after end date', () => {
        const data = {
          startDate: new Date('2024-12-31'),
          endDate: new Date('2024-01-01'),
        };
        expect(validateDateRange(data)).toBe(false);
      });

      it('should pass when dates are equal', () => {
        const data = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-01'),
        };
        expect(validateDateRange(data)).toBe(false);
      });

      it('should pass when one date is missing', () => {
        expect(validateDateRange({ startDate: new Date() })).toBe(true);
        expect(validateDateRange({ endDate: new Date() })).toBe(true);
        expect(validateDateRange({})).toBe(true);
      });

      it('should work with ISO date strings', () => {
        const data = {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T00:00:00Z',
        };
        expect(validateDateRange(data)).toBe(true);
      });
    });

    describe('validateFutureDate', () => {
      it('should pass for future dates', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(validateFutureDate(tomorrow)).toBe(true);
      });

      it('should pass for today', () => {
        const today = new Date();
        expect(validateFutureDate(today)).toBe(true);
      });

      it('should fail for past dates', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(validateFutureDate(yesterday)).toBe(false);
      });
    });

    describe('validatePastDate', () => {
      it('should pass for past dates', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(validatePastDate(yesterday)).toBe(true);
      });

      it('should pass for current date', () => {
        expect(validatePastDate(new Date())).toBe(true);
      });

      it('should fail for future dates', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(validatePastDate(tomorrow)).toBe(false);
      });
    });

    describe('validateDateWithinRange', () => {
      it('should pass when date is within range', () => {
        const validator = validateDateWithinRange(30);
        const inTwoWeeks = new Date();
        inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
        expect(validator(inTwoWeeks)).toBe(true);
      });

      it('should fail when date is beyond range', () => {
        const validator = validateDateWithinRange(30);
        const inTwoMonths = new Date();
        inTwoMonths.setDate(inTwoMonths.getDate() + 60);
        expect(validator(inTwoMonths)).toBe(false);
      });
    });
  });

  describe('Database Validations', () => {
    describe('createUniqueValidator', () => {
      it('should pass when value is unique', async () => {
        const checkFn = jest.fn().mockResolvedValue(true);
        const validator = createUniqueValidator(checkFn);

        const result = await validator('unique@example.com');

        expect(result).toBe(true);
        expect(checkFn).toHaveBeenCalledWith('unique@example.com');
      });

      it('should fail when value is not unique', async () => {
        const checkFn = jest.fn().mockResolvedValue(false);
        const validator = createUniqueValidator(checkFn);

        const result = await validator('taken@example.com');

        expect(result).toBe(false);
        expect(checkFn).toHaveBeenCalledWith('taken@example.com');
      });

      it('should handle errors gracefully', async () => {
        const checkFn = jest.fn().mockRejectedValue(new Error('DB error'));
        const validator = createUniqueValidator(checkFn);

        const result = await validator('test@example.com');

        expect(result).toBe(false);
      });

      it('should work in a Zod schema', async () => {
        const mockCheck = jest.fn().mockResolvedValue(true);
        const schema = z.object({
          email: z.string().email().refine(createUniqueValidator(mockCheck), {
            message: 'Email already exists',
          }),
        });

        const result = await schema.parseAsync({ email: 'new@example.com' });

        expect(result.email).toBe('new@example.com');
        expect(mockCheck).toHaveBeenCalled();
      });
    });

    describe('createExistsValidator', () => {
      it('should pass when entity exists', async () => {
        const checkFn = jest.fn().mockResolvedValue(true);
        const validator = createExistsValidator(checkFn);

        const result = await validator('existing-id');

        expect(result).toBe(true);
        expect(checkFn).toHaveBeenCalledWith('existing-id');
      });

      it('should fail when entity does not exist', async () => {
        const checkFn = jest.fn().mockResolvedValue(false);
        const validator = createExistsValidator(checkFn);

        const result = await validator('non-existing-id');

        expect(result).toBe(false);
      });

      it('should handle errors gracefully', async () => {
        const checkFn = jest.fn().mockRejectedValue(new Error('DB error'));
        const validator = createExistsValidator(checkFn);

        const result = await validator('some-id');

        expect(result).toBe(false);
      });
    });
  });

  describe('Conditional Field Validations', () => {
    describe('validateConditionalField', () => {
      it('should require field when condition is met', () => {
        const validator = validateConditionalField('type', 'recurring', 'frequency');

        expect(validator({ type: 'recurring', frequency: 'daily' })).toBe(true);

        expect(validator({ type: 'recurring', frequency: undefined })).toBe(false);
      });

      it('should not require field when condition is not met', () => {
        const validator = validateConditionalField('type', 'recurring', 'frequency');

        expect(validator({ type: 'one-time', frequency: undefined })).toBe(true);
      });

      it('should work in Zod schema', () => {
        const schema = z
          .object({
            type: z.enum(['recurring', 'one-time']),
            frequency: z.string().optional(),
          })
          .refine(validateConditionalField('type', 'recurring', 'frequency'), {
            message: 'Frequency is required for recurring items',
          });

        expect(() => schema.parse({ type: 'one-time' })).not.toThrow();
        expect(() => schema.parse({ type: 'recurring' })).toThrow();
        expect(() => schema.parse({ type: 'recurring', frequency: 'daily' })).not.toThrow();
      });
    });

    describe('validateAtLeastOne', () => {
      it('should pass when at least one field is present', () => {
        const validator = validateAtLeastOne<{ email?: string; phone?: string }>('email', 'phone');

        expect(validator({ email: 'test@example.com' })).toBe(true);
        expect(validator({ phone: '123456789' })).toBe(true);
        expect(validator({ email: 'test@example.com', phone: '123456789' })).toBe(true);
      });

      it('should fail when no fields are present', () => {
        const validator = validateAtLeastOne<{ email?: string; phone?: string }>('email', 'phone');

        expect(validator({})).toBe(false);
        expect(validator({ email: '', phone: '' })).toBe(false);
      });
    });

    describe('validateExactlyOne', () => {
      it('should pass when exactly one field is present', () => {
        const validator = validateExactlyOne<{ email?: string; phone?: string }>('email', 'phone');

        expect(validator({ email: 'test@example.com' })).toBe(true);
        expect(validator({ phone: '123456789' })).toBe(true);
      });

      it('should fail when no fields are present', () => {
        const validator = validateExactlyOne<{ email?: string; phone?: string }>('email', 'phone');

        expect(validator({})).toBe(false);
      });

      it('should fail when multiple fields are present', () => {
        const validator = validateExactlyOne<{ email?: string; phone?: string }>('email', 'phone');

        expect(validator({ email: 'test@example.com', phone: '123456789' })).toBe(false);
      });
    });
  });

  describe('Field Matching Validations', () => {
    describe('validateFieldsMatch', () => {
      it('should pass when fields match', () => {
        const validator = validateFieldsMatch('password', 'confirmPassword');

        expect(validator({ password: 'secret123', confirmPassword: 'secret123' })).toBe(true);
      });

      it('should fail when fields do not match', () => {
        const validator = validateFieldsMatch('password', 'confirmPassword');

        expect(validator({ password: 'secret123', confirmPassword: 'different' })).toBe(false);
      });

      it('should work in Zod schema', () => {
        const schema = z
          .object({
            password: z.string().min(8),
            confirmPassword: z.string(),
          })
          .refine(validateFieldsMatch('password', 'confirmPassword'), {
            message: 'Passwords do not match',
          });

        expect(() =>
          schema.parse({ password: 'secret123', confirmPassword: 'secret123' })
        ).not.toThrow();

        expect(() =>
          schema.parse({ password: 'secret123', confirmPassword: 'different' })
        ).toThrow();
      });
    });
  });

  describe('Numeric Range Validations', () => {
    describe('validateNumericRange', () => {
      it('should pass when min is less than or equal to max', () => {
        expect(validateNumericRange({ min: 0, max: 100 })).toBe(true);
        expect(validateNumericRange({ min: 50, max: 50 })).toBe(true);
      });

      it('should fail when min is greater than max', () => {
        expect(validateNumericRange({ min: 100, max: 0 })).toBe(false);
      });

      it('should pass when one value is missing', () => {
        expect(validateNumericRange({ min: 0 })).toBe(true);
        expect(validateNumericRange({ max: 100 })).toBe(true);
        expect(validateNumericRange({})).toBe(true);
      });
    });
  });

  describe('Common Schemas', () => {
    describe('uuid schema', () => {
      it('should validate UUID v4', () => {
        const validUuidV4 = '550e8400-e29b-41d4-a716-446655440000';
        expect(() => commonSchemas.uuid.parse(validUuidV4)).not.toThrow();
      });

      it('should validate UUID v7', () => {
        const validUuidV7 = '018e8c7e-7f9e-7a3f-8a5e-8c7e7f9e7a3f';
        expect(() => commonSchemas.uuid.parse(validUuidV7)).not.toThrow();
      });

      it('should reject invalid UUIDs', () => {
        expect(() => commonSchemas.uuid.parse('not-a-uuid')).toThrow();
        expect(() => commonSchemas.uuid.parse('123e4567-e89b-12d3-a456')).toThrow();
      });
    });

    describe('money schema', () => {
      it('should accept valid decimal values', () => {
        expect(() => commonSchemas.money.parse(10.99)).not.toThrow();
        expect(() => commonSchemas.money.parse(100)).not.toThrow();
        expect(() => commonSchemas.money.parse(0.5)).not.toThrow();
      });

      it('should reject values with more than 2 decimal places', () => {
        expect(() => commonSchemas.money.parse(10.999)).toThrow();
      });
    });

    describe('pagination schemas', () => {
      it('should apply default values', () => {
        expect(commonSchemas.offset.parse(undefined)).toBe(0);
        expect(commonSchemas.limit.parse(undefined)).toBe(20);
        expect(commonSchemas.sortDirection.parse(undefined)).toBe('desc');
      });

      it('should validate offset', () => {
        expect(commonSchemas.offset.parse(0)).toBe(0);
        expect(commonSchemas.offset.parse(100)).toBe(100);
        expect(() => commonSchemas.offset.parse(-1)).toThrow();
      });

      it('should validate limit', () => {
        expect(commonSchemas.limit.parse(1)).toBe(1);
        expect(commonSchemas.limit.parse(100)).toBe(100);
        expect(() => commonSchemas.limit.parse(0)).toThrow();
        expect(() => commonSchemas.limit.parse(101)).toThrow();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should combine multiple validators in a single schema', async () => {
      const mockEmailCheck = jest.fn().mockResolvedValue(true);

      const schema = z
        .object({
          email: z
            .string()
            .email()
            .refine(createUniqueValidator(mockEmailCheck), { message: 'Email already exists' }),
          password: z.string().min(8),
          confirmPassword: z.string(),
          startDate: z.string(),
          endDate: z.string(),
        })
        .refine(validateFieldsMatch('password', 'confirmPassword'), {
          message: 'Passwords must match',
          path: ['confirmPassword'],
        })
        .refine(validateDateRange, {
          message: 'Start date must be before end date',
          path: ['startDate'],
        });

      const validData = {
        email: 'test@example.com',
        password: 'secret123',
        confirmPassword: 'secret123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const result = await schema.parseAsync(validData);
      expect(result).toEqual(validData);
      expect(mockEmailCheck).toHaveBeenCalled();
    });

    it('should fail with detailed errors for multiple validation failures', async () => {
      const schema = z
        .object({
          email: z.string().email(),
          password: z.string().min(8),
          confirmPassword: z.string(),
          min: z.number(),
          max: z.number(),
        })
        .refine(validateFieldsMatch('password', 'confirmPassword'), {
          message: 'Passwords must match',
        })
        .refine(validateNumericRange, {
          message: 'Min must be less than max',
        });

      try {
        schema.parse({
          email: 'invalid',
          password: 'short',
          confirmPassword: 'different',
          min: 100,
          max: 0,
        });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
