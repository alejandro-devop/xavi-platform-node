import { z } from 'zod';
import { createUniqueValidator } from '../../shared/utils/custom-validators';
import { walletService } from '../../services/wallet.service';

/**
 * Wallet Input Schema - For creating wallets
 * Factory function to create schema with user context for async validation
 */
export const createWalletInputSchema = (userId: number) =>
  z.object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must be less than 100 characters')
      .refine(
        createUniqueValidator(async (name: string) => {
          return await walletService.isNameUnique(userId, name);
        }),
        { message: 'A wallet with this name already exists' }
      ),
    icon: z
      .string()
      .min(3, 'Icon must be at least 3 characters')
      .max(20, 'Icon must be less than 20 characters')
      .optional(),
    initialBalance: z.number().min(0, 'Initial balance must be positive').optional().default(0),
    isMain: z.boolean().optional().default(false),
  });

/**
 * Wallet Input Schema - For creating wallets (without async validation)
 * Use this for non-GraphQL contexts or when you don't need name uniqueness check
 */
export const walletInputSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  icon: z
    .string()
    .min(3, 'Icon must be at least 3 characters')
    .max(20, 'Icon must be less than 20 characters')
    .optional(),
  initialBalance: z.number().min(0, 'Initial balance must be positive').optional().default(0),
  isMain: z.boolean().optional().default(false),
});

/**
 * Wallet Update Schema - For updating wallets
 * Factory function to create schema with user context for async validation
 */
export const createWalletUpdateSchema = (userId: number, walletId?: string) =>
  z.object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must be less than 100 characters')
      .refine(
        createUniqueValidator(async (name: string) => {
          return await walletService.isNameUnique(userId, name, walletId);
        }),
        { message: 'A wallet with this name already exists' }
      )
      .optional(),
    icon: z
      .string()
      .min(3, 'Icon must be at least 3 characters')
      .max(20, 'Icon must be less than 20 characters')
      .optional(),
    balance: z.number().min(0, 'Balance must be positive').optional(),
    initialBalance: z.number().min(0, 'Initial balance must be positive').optional(),
    isMain: z.boolean().optional(),
  });

/**
 * Wallet Update Schema - For updating wallets (without async validation)
 */
export const walletUpdateSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  icon: z
    .string()
    .min(3, 'Icon must be at least 3 characters')
    .max(20, 'Icon must be less than 20 characters')
    .optional(),
  balance: z.number().min(0, 'Balance must be positive').optional(),
  initialBalance: z.number().min(0, 'Initial balance must be positive').optional(),
  isMain: z.boolean().optional(),
});

/**
 * Wallet ID Schema - For operations requiring wallet ID
 */
export const walletIdSchema = z.object({
  id: z.string().uuid('Invalid wallet ID format'),
});

// Export types inferred from schemas
export type WalletInput = z.infer<typeof walletInputSchema>;
export type WalletUpdate = z.infer<typeof walletUpdateSchema>;
export type WalletId = z.infer<typeof walletIdSchema>;
