export interface ExtractExpenseFromImageInput {
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  /** Optional note from the user to help pick the category and description. */
  note?: string;
}

export interface ExtractedExpense {
  amount: number | null;
  currency: string | null;
  date: string | null;
  merchant: string | null;
  description: string;
  categoryId: string | null;
  isIncome: boolean;
  confidence: 'high' | 'medium' | 'low';
}
