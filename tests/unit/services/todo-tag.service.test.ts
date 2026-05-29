import { BadRequestError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { todoTagService } from '../../../src/services/todo-tag.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const TAG_ID = 5;
const TODO_ID = 10;

function createTagRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: TAG_ID,
    user_id: USER_ID,
    name: 'Urgent',
    color: '#EF4444',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('TodoTagService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('createTag', () => {
    it('creates tag with name and color', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createTagRow()] });

      const tag = await todoTagService.createTag(USER_ID, {
        name: 'Urgent',
        color: '#EF4444',
      });

      expect(tag.name).toBe('Urgent');
      expect(tag.color).toBe('#EF4444');
    });
  });

  describe('getTagById', () => {
    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createTagRow({ user_id: 2 })],
      });

      await expect(todoTagService.getTagById(String(TAG_ID), USER_ID)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('setTodoTags', () => {
    it('replaces assignments for owned tags', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ id: TAG_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await todoTagService.setTodoTags(TODO_ID, USER_ID, [String(TAG_ID)]);

      expect(mockDbPool.query).toHaveBeenCalledTimes(3);
    });

    it('throws BadRequestError when tag does not belong to user', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        todoTagService.setTodoTags(TODO_ID, USER_ID, [String(TAG_ID)])
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('deleteTag', () => {
    it('throws NotFoundError for invalid id', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(todoTagService.deleteTag('abc', USER_ID)).rejects.toThrow(NotFoundError);
    });
  });
});
