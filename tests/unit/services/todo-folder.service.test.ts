import { BadRequestError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { todoFolderService } from '../../../src/services/todo-folder.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const FOLDER_ID = 4;

function createFolderRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: FOLDER_ID,
    user_id: USER_ID,
    name: 'Work',
    color: '#2563EB',
    order_index: 0,
    created_at: now,
    updated_at: now,
    todo_count: '2',
    ...overrides,
  };
}

describe('TodoFolderService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('createFolder', () => {
    it('creates folder with name and color', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createFolderRow({ todo_count: undefined })],
      });

      const folder = await todoFolderService.createFolder(USER_ID, {
        name: 'Work',
        color: '#2563EB',
      });

      expect(folder.name).toBe('Work');
      expect(folder.color).toBe('#2563EB');
    });
  });

  describe('getFolderById', () => {
    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createFolderRow({ user_id: 2 })] });

      await expect(todoFolderService.getFolderById(String(FOLDER_ID), USER_ID)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('resolveFolderIdForTodo', () => {
    it('returns null when clearing folder', async () => {
      const result = await todoFolderService.resolveFolderIdForTodo(USER_ID, null);
      expect(result).toBeNull();
    });

    it('validates owned folder id', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createFolderRow()] });

      const result = await todoFolderService.resolveFolderIdForTodo(USER_ID, String(FOLDER_ID));
      expect(result).toBe(FOLDER_ID);
    });
  });

  describe('deleteFolder', () => {
    it('throws NotFoundError for invalid id', async () => {
      await expect(todoFolderService.deleteFolder('abc', USER_ID)).rejects.toThrow(NotFoundError);
    });
  });
});
