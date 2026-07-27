import { uuidv7 } from 'uuidv7';

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a UUID v7 (time-ordered UUID)
 * Compatible with PostgreSQL uuid type
 */
export function generateUuidV7(): string {
  return uuidv7();
}

/** Valida formato UUID versión 7 (idempotencia / IDs generados en cliente). */
export function isUuidV7(value: string): boolean {
  return UUID_V7_REGEX.test(value);
}
