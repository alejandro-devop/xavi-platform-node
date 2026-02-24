import { uuidv7 } from 'uuidv7';

/**
 * Generate a UUID v7 (time-ordered UUID)
 * Compatible with PostgreSQL uuid type
 */
export function generateUuidV7(): string {
  return uuidv7();
}
