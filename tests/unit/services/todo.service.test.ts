import { ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { todoService } from '../../../src/services/todo.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const TODO_ID = 10;
const SUBTASK_ID = 3;

function createTodoRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: TODO_ID,
    user_id: USER_ID,
    title: 'Buy groceries',
    description: null,
    status: 'pending',
    priority: 'medium',
    due_date: now,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function createSubtaskRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: SUBTASK_ID,
    todo_id: TODO_ID,
    title: 'Milk',
    is_completed: false,
    order_index: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('TodoService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('getTodoById', () => {
    it('returns todo with subtasks for owner', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createTodoRow()] })
        .mockResolvedValueOnce({ rows: [createSubtaskRow()] });

      const todo = await todoService.getTodoById(String(TODO_ID), USER_ID);

      expect(todo.id).toBe(String(TODO_ID));
      expect(todo.subtasks).toHaveLength(1);
      expect(todo.subtasksCount).toEqual({ total: 1, completed: 0 });
    });

    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createTodoRow({ user_id: 2 })],
      });

      await expect(todoService.getTodoById(String(TODO_ID), USER_ID)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('listTodos', () => {
    it('includes subtasks count per todo', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [createTodoRow()] })
        .mockResolvedValueOnce({
          rows: [{ todo_id: TODO_ID, total: '2', completed: '1' }],
        });

      const collection = await todoService.listTodos(USER_ID);

      expect(collection.todos).toHaveLength(1);
      expect(collection.todos[0].subtasksCount).toEqual({ total: 2, completed: 1 });
      expect(collection.total).toBe(1);
    });
  });

  describe('completeTodo', () => {
    it('marks todo as completed', async () => {
      const now = new Date();
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createTodoRow()] })
        .mockResolvedValueOnce({
          rows: [createTodoRow({ status: 'completed', completed_at: now })],
        });

      const todo = await todoService.completeTodo(String(TODO_ID), USER_ID);

      expect(todo.status).toBe('completed');
      expect(todo.completedAt).toEqual(now);
    });
  });

  describe('createSubtask', () => {
    it('creates subtask for owned todo', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createTodoRow()] })
        .mockResolvedValueOnce({ rows: [createSubtaskRow()] });

      const subtask = await todoService.createSubtask(USER_ID, {
        todoId: String(TODO_ID),
        title: 'Milk',
      });

      expect(subtask.title).toBe('Milk');
      expect(subtask.todoId).toBe(String(TODO_ID));
    });
  });

  describe('deleteSubtask', () => {
    it('throws NotFoundError when subtask missing', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createTodoRow()] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        todoService.deleteSubtask(String(TODO_ID), String(SUBTASK_ID), USER_ID)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
