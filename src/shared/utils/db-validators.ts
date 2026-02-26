import { getDb } from '../database/drizzle';
import { eq, and, ne, sql } from 'drizzle-orm';

/**
 * Parameters for checking field uniqueness in the database
 */
export interface CheckFieldUniquenessParams {
  /** Drizzle table reference */
  table: any;
  /** Column/field to check for uniqueness (default: table.name) */
  fieldToCheck?: any;
  /** Value to verify */
  value: string;
  /** Optional scope field for scoped uniqueness (default: table.userId) */
  scopeField?: any;
  /** Value for the scope field */
  scopeValue?: number | string;
  /** Optional ID to exclude (for update operations) */
  excludeId?: string;
  /** ID field of the table (default: table.id) */
  idField?: any;
}

/**
 * Generic function to check if a field value is unique in a table
 *
 * Features:
 * - Case-insensitive comparison (automatically converts to lowercase)
 * - Normalizes whitespace (trims and converts multiple spaces to single space)
 * - Supports scoped uniqueness (e.g., unique per user, per organization)
 * - Supports global uniqueness (when no scope is provided)
 * - Handles update scenarios (excludes current record by ID)
 * - Smart defaults: fieldToCheck=table.name, scopeField=table.userId, idField=table.id
 *
 * @example
 * // Simple: Check wallet name uniqueness per user (using defaults)
 * const isUnique = await checkFieldUniqueness({
 *   table: walletWallets,
 *   value: 'My Wallet',
 *   scopeValue: 123,
 * });
 *
 * @example
 * // Custom field: Check slug uniqueness (no scope = global)
 * const isUnique = await checkFieldUniqueness({
 *   table: articles,
 *   fieldToCheck: articles.slug,
 *   value: 'my-article',
 * });
 *
 * @example
 * // Update: Check uniqueness excluding current record
 * const isUnique = await checkFieldUniqueness({
 *   table: walletWallets,
 *   value: 'Updated Name',
 *   scopeValue: 123,
 *   excludeId: 'wallet-uuid-123',
 * });
 *
 * @returns Promise<boolean> - true if unique, false if already exists
 */
export async function checkFieldUniqueness(params: CheckFieldUniquenessParams): Promise<boolean> {
  const {
    table,
    fieldToCheck = table.name,
    value,
    scopeField = table.userId,
    scopeValue,
    excludeId,
    idField = table.id,
  } = params;

  // Normalize the value: trim whitespace, convert to lowercase, normalize spaces
  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, ' ');

  // If normalized value is empty, consider it as not unique (invalid)
  if (!normalizedValue) {
    return false;
  }

  const db = getDb();

  // Build conditions array
  const conditions: any[] = [
    // Case-insensitive comparison using LOWER()
    sql`LOWER(${fieldToCheck}) = ${normalizedValue}`,
  ];

  // Add scope condition if provided (e.g., userId = 123)
  if (scopeField !== undefined && scopeValue !== undefined) {
    conditions.push(eq(scopeField, scopeValue));
  }

  // Add exclusion condition for updates (e.g., id != 'current-id')
  if (excludeId && idField) {
    conditions.push(ne(idField, excludeId));
  }

  // Combine all conditions with AND
  const whereClause = and(...conditions);

  // Execute query using select instead of query builder for dynamic table access
  const results = await db.select().from(table).where(whereClause).limit(1);

  // Return true if unique (no existing record found)
  return results.length === 0;
}

/**
 * Normalize a name string by trimming whitespace and replacing multiple spaces with single space
 *
 * @param name - String to normalize
 * @returns Normalized string
 *
 * @example
 * normalizeName('  My  Wallet  ') // 'My Wallet'
 * normalizeName('Test   Name') // 'Test Name'
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize a name for case-insensitive comparison
 * Trims, normalizes spaces, and converts to lowercase
 *
 * @param name - String to normalize
 * @returns Normalized lowercase string
 *
 * @example
 * normalizeNameForComparison('  My  WALLET  ') // 'my wallet'
 */
export function normalizeNameForComparison(name: string): string {
  return normalizeName(name).toLowerCase();
}
