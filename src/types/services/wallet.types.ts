export interface Wallet {
  id: string;
  userId: number;
  name: string;
  icon?: string | null;
  balance: number;
  initialBalance: number;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletInput {
  name: string;
  icon?: string;
  initialBalance?: number;
  isMain?: boolean;
}

export interface UpdateWalletInput {
  name?: string;
  icon?: string;
  balance?: number;
  initialBalance?: number;
  isMain?: boolean;
}
