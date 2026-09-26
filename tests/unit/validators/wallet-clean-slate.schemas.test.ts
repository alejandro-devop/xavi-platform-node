import { walletCleanSlateInputSchema } from '../../../src/validators/schemas/wallet-clean-slate.schemas';

describe('walletCleanSlateInputSchema', () => {
  it('rejects an empty input', () => {
    expect(walletCleanSlateInputSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an input where everything is kept', () => {
    const result = walletCleanSlateInputSchema.safeParse({
      transactions: false,
      wallets: 'KEEP',
      creditCards: 'KEEP',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a single balance reset', () => {
    expect(walletCleanSlateInputSchema.safeParse({ wallets: 'RESET_BALANCES' }).success).toBe(true);
  });

  it('accepts a single boolean flag', () => {
    expect(walletCleanSlateInputSchema.safeParse({ shopping: true }).success).toBe(true);
  });

  it('rejects an unknown mode', () => {
    expect(walletCleanSlateInputSchema.safeParse({ creditCards: 'NUKE' }).success).toBe(false);
  });
});
