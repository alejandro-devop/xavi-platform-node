/**
 * Historial de categorías: con qué categoría se ha guardado cada descripción.
 * El cliente lo usa para sugerir la categoría mientras se escribe.
 */

export interface WalletCategoryHistoryEntry {
  /** La descripción en minúsculas y sin espacios en los bordes. */
  description: string;
  categoryId: string;
  /** Cuántas veces: cada movimiento cuenta uno; una serie de programados, uno. */
  uses: number;
  /** `YYYY-MM-DD` del uso más reciente. */
  lastUsed: string;
}
