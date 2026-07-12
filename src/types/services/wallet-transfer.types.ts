export interface WalletTransfer {
  id: string;
  userId: number;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  date: string;
  description: string;
  createdAt: Date;
}

export interface CreateWalletTransferInput {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  date?: string;
  description?: string;
}
