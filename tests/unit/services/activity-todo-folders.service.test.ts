import { activityTodoFoldersService } from '../../../src/services/activity-todo-folders.service';
import { activityService } from '../../../src/services/activity.service';
import { todoFolderService } from '../../../src/services/todo-folder.service';
import { todoService } from '../../../src/services/todo.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/services/activity.service', () => ({
  activityService: {
    parseActivityId: jest.fn((id: string) => parseInt(id, 10)),
    getActivityById: jest.fn(),
  },
}));

jest.mock('../../../src/services/todo-folder.service', () => ({
  todoFolderService: {
    getFolderById: jest.fn(),
  },
}));

jest.mock('../../../src/services/todo.service', () => ({
  todoService: {
    getTodoById: jest.fn(),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

describe('activityTodoFoldersService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
    jest.clearAllMocks();
  });

  describe('listPendingTodosForActivity', () => {
    it('returns empty array when activity has no linked folders', async () => {
      jest.mocked(activityService.getActivityById).mockResolvedValueOnce({
        id: '7',
      } as never);
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      const todos = await activityTodoFoldersService.listPendingTodosForActivity('7', 1);

      expect(todos).toEqual([]);
      expect(todoService.getTodoById).not.toHaveBeenCalled();
    });

    it('loads pending todos from linked folders', async () => {
      jest.mocked(activityService.getActivityById).mockResolvedValueOnce({
        id: '7',
      } as never);
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ folder_id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }, { id: 11 }] });
      jest
        .mocked(todoService.getTodoById)
        .mockResolvedValueOnce({ id: '10', title: 'A' } as never)
        .mockResolvedValueOnce({ id: '11', title: 'B' } as never);

      const todos = await activityTodoFoldersService.listPendingTodosForActivity('7', 1, 10);

      expect(todos).toHaveLength(2);
      expect(todos[0].id).toBe('10');
    });
  });

  describe('syncFolders', () => {
    it('validates folder ownership and replaces links', async () => {
      jest.mocked(todoFolderService.getFolderById).mockResolvedValue({ id: '3' } as never);
      mockDbPool.query.mockResolvedValue({ rows: [] });

      await activityTodoFoldersService.syncFolders(7, 1, ['3', '3']);

      expect(todoFolderService.getFolderById).toHaveBeenCalledTimes(1);
      expect(mockDbPool.query).toHaveBeenCalledWith(
        'DELETE FROM activity_todo_folders WHERE activity_id = $1',
        [7]
      );
    });
  });
});
