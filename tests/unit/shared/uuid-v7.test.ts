import { isUuidV7, generateUuidV7 } from '../../../src/shared/database/uuid';

describe('uuid v7 helpers', () => {
  it('generates a valid UUID v7', () => {
    const id = generateUuidV7();
    expect(isUuidV7(id)).toBe(true);
  });

  it('rejects UUID v4 and malformed values', () => {
    expect(isUuidV7('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isUuidV7('not-a-uuid')).toBe(false);
    expect(isUuidV7('')).toBe(false);
  });
});
