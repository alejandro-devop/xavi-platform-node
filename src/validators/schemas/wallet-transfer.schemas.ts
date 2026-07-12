import { z } from 'zod';

export const walletTransferIdSchema = z.object({
  id: z.string().uuid('Invalid transfer ID format'),
});

export const createWalletTransferInputSchema = z
  .object({
    fromWalletId: z.string().uuid('Invalid source wallet ID format'),
    toWalletId: z.string().uuid('Invalid destination wallet ID format'),
    amount: z.number().positive('Amount must be greater than zero'),
    date: z.string().date('Invalid date format (use YYYY-MM-DD)').optional(),
    description: z
      .string()
      .min(5, 'Description must be at least 5 characters')
      .max(255, 'Description must be less than 255 characters')
      .optional(),
  })
  .refine((data) => data.fromWalletId !== data.toWalletId, {
    message: 'Source and destination wallets must be different',
    path: ['toWalletId'],
  });

export type CreateWalletTransferInput = z.infer<typeof createWalletTransferInputSchema>;
