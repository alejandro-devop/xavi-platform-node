import { getDb } from '../database/drizzle';
import { eq, and, ne, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError } from '../errors';

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

/**
 * Parameters for checking record existence and ownership
 */
export interface CheckRecordExistsParams {
  /** Drizzle table reference */
  table: any;
  /** ID field to query by (default: table.id) */
  idField?: any;
  /** Value of the ID to search for */
  idValue: string | number;
  /** Optional scope field for ownership validation (e.g., table.userId) */
  scopeField?: any;
  /** Value for the scope field (e.g., userId) */
  scopeValue?: number | string;
  /** Custom error message for not found (default: 'Record not found') */
  notFoundMessage?: string;
  /** Custom error message for forbidden (default: 'You do not have permission to access this record') */
  forbiddenMessage?: string;
}

/**
 * Generic function to check if a record exists and optionally validate ownership
 *
 * Features:
 * - Finds a record by ID (or custom field)
 * - Optionally validates ownership (e.g., belongs to userId)
 * - Returns the found record (avoids duplicate queries)
 * - Throws NotFoundError if record doesn't exist
 * - Throws ForbiddenError if ownership validation fails
 * - Smart defaults: idField=table.id
 *
 * @example
 * // Simple: Check if category exists (no ownership check)
 * const category = await checkRecordExists({
 *   table: walletExpenseCategories,
 *   idValue: 'category-uuid-123',
 * });
 *
 * @example
 * // With ownership: Check if wallet exists and belongs to user
 * const wallet = await checkRecordExists({
 *   table: walletWallets,
 *   idValue: 'wallet-uuid-123',
 *   scopeField: walletWallets.userId,
 *   scopeValue: userId,
 * });
 *
 * @example
 * // Custom field: Find by email instead of ID
 * const user = await checkRecordExists({
 *   table: users,
 *   idField: users.email,
 *   idValue: 'user@example.com',
 * });
 *
 * @example
 * // Custom messages
 * const budget = await checkRecordExists({
 *   table: walletBudgets,
 *   idValue: budgetId,
 *   scopeField: walletBudgets.userId,
 *   scopeValue: userId,
 *   notFoundMessage: 'Budget not found',
 *   forbiddenMessage: 'You do not have permission to use this budget',
 * });
 *
 * @returns Promise<T> - The found record
 * @throws {NotFoundError} - If record doesn't exist
 * @throws {ForbiddenError} - If ownership validation fails
 */
export async function checkRecordExists<T = any>(params: CheckRecordExistsParams): Promise<T> {
  const {
    table,
    idField = table.id,
    idValue,
    scopeField,
    scopeValue,
    notFoundMessage = 'Record not found',
    forbiddenMessage = 'You do not have permission to access this record',
  } = params;

  const db = getDb();

  // First, find the record by ID only (to provide accurate error messages)
  const results = await db.select().from(table).where(eq(idField, idValue)).limit(1);

  // Check if record exists
  if (results.length === 0) {
    throw new NotFoundError(notFoundMessage);
  }

  const record = results[0];

  // Validate ownership if scope is provided
  if (scopeValue !== undefined && scopeField !== undefined) {
    // Get the column name from Drizzle column object
    // Drizzle returns results in camelCase, but field.name is the DB column name (snake_case)
    // Convert snake_case to camelCase: user_id -> userId
    const columnName = scopeField.name.replace(/_([a-z])/g, (_: string, letter: string) =>
      letter.toUpperCase()
    );
    const recordScopeValue = (record as any)[columnName];

    // Handle both string and number comparisons (UUID vs numeric IDs)
    if (recordScopeValue === undefined) {
      // Column doesn't exist in result - this shouldn't happen but handle gracefully
      throw new Error(
        `Column ${columnName} not found in query result. Available keys: ${Object.keys(record).join(', ')}`
      );
    }

    if (recordScopeValue.toString() !== scopeValue.toString()) {
      throw new ForbiddenError(forbiddenMessage);
    }
  }

  return record as T;
}
