import { BadRequestError, NotFoundError } from '../../../src/shared/errors';
import { standupService } from '../../../src/services/standup.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/shared/database/uuid', () => {
  const actual = jest.requireActual<typeof import('../../../src/shared/database/uuid')>(
    '../../../src/shared/database/uuid'
  );
  return {
    ...actual,
    generateUuidV7: jest.fn(() => '018f0000-0000-7000-8000-000000000099'),
  };
});

jest.mock('../../../src/services/todo.service', () => ({
  todoService: {
    createTodo: jest.fn(),
    getTodoById: jest.fn(),
  },
}));

jest.mock('../../../src/services/todo-folder.service', () => ({
  todoFolderService: {
    getFolderById: jest.fn(),
  },
}));

jest.mock('../../../src/services/user-settings.service', () => ({
  userSettingsService: {
    getMySettings: jest.fn(),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';
import { todoService } from '../../../src/services/todo.service';
import { todoFolderService } from '../../../src/services/todo-folder.service';
import { userSettingsService } from '../../../src/services/user-settings.service';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;
const mockCreateTodo = todoService.createTodo as jest.MockedFunction<typeof todoService.createTodo>;
const mockGetTodoById = todoService.getTodoById as jest.MockedFunction<
  typeof todoService.getTodoById
>;
const mockGetFolderById = todoFolderService.getFolderById as jest.MockedFunction<
  typeof todoFolderService.getFolderById
>;
const mockGetMySettings = userSettingsService.getMySettings as jest.MockedFunction<
  typeof userSettingsService.getMySettings
>;

const USER_ID = 1;
const DATE = '2026-07-22';
const PREV = '2026-07-21';
const MEMBER_ID = '018f0000-0000-7000-8000-000000000001';
const DAY_ID = '018f0000-0000-7000-8000-000000000002';
const ITEM_ID = '018f0000-0000-7000-8000-000000000003';
const PREV_DAY_ID = '018f0000-0000-7000-8000-000000000004';
const PREV_ITEM_ID = '018f0000-0000-7000-8000-000000000005';

function memberRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-22T12:00:00Z');
  return {
    id: MEMBER_ID,
    user_id: USER_ID,
    name: 'Juan',
    is_active: true,
    order_index: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function dayRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-22T12:00:00Z');
  return {
    id: DAY_ID,
    user_id: USER_ID,
    date: DATE,
    status: 'open',
    opened_at: now,
    closed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function itemRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-22T12:00:00Z');
  return {
    id: ITEM_ID,
    user_id: USER_ID,
    day_id: DAY_ID,
    member_id: MEMBER_ID,
    title: 'Fix login',
    notes: 'auth edge case',
    ticket_number: '123',
    status: 'in_progress',
    blocked_reason: null,
    backlog_started_on: PREV,
    source_item_id: null,
    linked_todo_id: null,
    order_index: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('StandupService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
    jest.clearAllMocks();
  });

  describe('date helpers', () => {
    it('computes previous day and backlog age', () => {
      expect(standupService.previousDateString(DATE)).toBe(PREV);
      expect(standupService.daysBetween(PREV, DATE)).toBe(1);
      expect(standupService.daysBetween(DATE, DATE)).toBe(0);
    });

    it('rejects invalid dates', () => {
      expect(() => standupService.assertDateString('2026-13-01')).toThrow(BadRequestError);
    });
  });

  describe('createMember', () => {
    it('creates a member', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [memberRow()] });

      const member = await standupService.createMember(USER_ID, { name: '  Juan  ' });

      expect(member.name).toBe('Juan');
      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO standup_members'),
        expect.arrayContaining([USER_ID, 'Juan'])
      );
    });
  });

  describe('openDay / closeDay', () => {
    it('opens a new day and returns carry-over candidates', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] }) // getDayByDate before insert
        .mockResolvedValueOnce({ rows: [] }) // insert day
        .mockResolvedValueOnce({ rows: [dayRow()] }) // getDayByDate in getDayView
        .mockResolvedValueOnce({ rows: [] }) // items today
        .mockResolvedValueOnce({ rows: [dayRow({ id: PREV_DAY_ID, date: PREV })] }) // prev day
        .mockResolvedValueOnce({
          rows: [itemRow({ id: PREV_ITEM_ID, day_id: PREV_DAY_ID, backlog_started_on: PREV })],
        });

      const view = await standupService.openDay(USER_ID, DATE);

      expect(view.day?.status).toBe('open');
      expect(view.carryOverCandidates).toHaveLength(1);
      expect(view.carryOverCandidates[0].id).toBe(PREV_ITEM_ID);
    });

    it('closes an open day', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [dayRow()] })
        .mockResolvedValueOnce({ rows: [dayRow({ status: 'closed', closed_at: new Date() })] });

      const day = await standupService.closeDay(USER_ID, DATE);
      expect(day.status).toBe('closed');
    });
  });

  describe('createItem', () => {
    it('creates an item on an open day', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [memberRow()] })
        .mockResolvedValueOnce({ rows: [dayRow()] })
        .mockResolvedValueOnce({ rows: [{ max: null }] })
        .mockResolvedValueOnce({ rows: [itemRow({ backlog_started_on: DATE })] });

      const item = await standupService.createItem(USER_ID, {
        date: DATE,
        memberId: MEMBER_ID,
        title: 'Fix login',
        status: 'in_progress',
      });

      expect(item.title).toBe('Fix login');
      expect(item.daysInBacklog).toBe(0);
    });

    it('rejects create on closed day', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [memberRow()] })
        .mockResolvedValueOnce({ rows: [dayRow({ status: 'closed' })] });

      await expect(
        standupService.createItem(USER_ID, {
          date: DATE,
          memberId: MEMBER_ID,
          title: 'X',
        })
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('rejects blocked status without blockedReason', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [memberRow()] })
        .mockResolvedValueOnce({ rows: [dayRow()] });

      await expect(
        standupService.createItem(USER_ID, {
          date: DATE,
          memberId: MEMBER_ID,
          title: 'Blocked thing',
          status: 'blocked',
        })
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('creates a blocked item with reason', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [memberRow()] })
        .mockResolvedValueOnce({ rows: [dayRow()] })
        .mockResolvedValueOnce({ rows: [{ max: null }] })
        .mockResolvedValueOnce({
          rows: [
            itemRow({
              status: 'blocked',
              blocked_reason: 'Waiting for design',
              backlog_started_on: DATE,
            }),
          ],
        });

      const item = await standupService.createItem(USER_ID, {
        date: DATE,
        memberId: MEMBER_ID,
        title: 'Blocked thing',
        status: 'blocked',
        blockedReason: 'Waiting for design',
      });

      expect(item.status).toBe('blocked');
      expect(item.blockedReason).toBe('Waiting for design');
      expect(mockDbPool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('INSERT INTO standup_items'),
        expect.arrayContaining(['Waiting for design'])
      );
    });
  });

  describe('updateItem clears blockedReason', () => {
    it('nulls blocked_reason when status moves away from blocked', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [itemRow({ status: 'blocked', blocked_reason: 'Old reason' })] })
        .mockResolvedValueOnce({ rows: [dayRow()] })
        .mockResolvedValueOnce({ rows: [itemRow({ status: 'in_progress', blocked_reason: null })] });

      await standupService.updateItem(USER_ID, ITEM_ID, { status: 'in_progress' });

      const updateCall = mockDbPool.query.mock.calls[2];
      expect(updateCall[0]).toContain('blocked_reason');
      expect(updateCall[1]).toEqual(expect.arrayContaining([null]));
    });
  });

  describe('carryOverItems', () => {
    it('copies unfinished yesterday items preserving backlog_started_on', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [dayRow()] }) // today
        .mockResolvedValueOnce({ rows: [dayRow({ id: PREV_DAY_ID, date: PREV })] }) // yesterday
        .mockResolvedValueOnce({
          rows: [
            itemRow({
              id: PREV_ITEM_ID,
              day_id: PREV_DAY_ID,
              backlog_started_on: '2026-07-19',
              status: 'pending',
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [{ max: -1 }] })
        .mockResolvedValueOnce({ rows: [] }) // already carried?
        .mockResolvedValueOnce({
          rows: [
            itemRow({
              source_item_id: PREV_ITEM_ID,
              backlog_started_on: '2026-07-19',
              status: 'pending',
            }),
          ],
        });

      const created = await standupService.carryOverItems(USER_ID, {
        date: DATE,
        itemIds: [PREV_ITEM_ID],
      });

      expect(created).toHaveLength(1);
      expect(created[0].backlogStartedOn).toBe('2026-07-19');
      expect(created[0].daysInBacklog).toBe(3);
      expect(created[0].sourceItemId).toBe(PREV_ITEM_ID);
    });
  });

  describe('getDaySummary', () => {
    it('groups by member and builds copy text', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [dayRow()] })
        .mockResolvedValueOnce({ rows: [itemRow()] })
        .mockResolvedValueOnce({ rows: [] }) // prev day missing → no carry-over
        .mockResolvedValueOnce({ rows: [memberRow()] });

      const summary = await standupService.getDaySummary(USER_ID, DATE);

      expect(summary.groups).toHaveLength(1);
      expect(summary.groups[0].memberName).toBe('Juan');
      expect(summary.text).toContain('*Juan* está en:');
      expect(summary.text).toContain('Fix login (#123)');
      expect(summary.text).toContain('en progreso');
    });
  });

  describe('createTodoFromItem', () => {
    it('requires configured folder', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [itemRow()] });
      mockGetMySettings.mockResolvedValueOnce({
        userId: USER_ID,
        hideHiddenHabits: false,
        sleepActivityCategoryId: null,
        habitReminderEnabled: false,
        habitReminderTime: null,
        dayStartReminderEnabled: false,
        dayStartReminderTime: null,
        standupTodoFolderId: null,
        houseworkActivityId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(standupService.createTodoFromItem(USER_ID, ITEM_ID)).rejects.toBeInstanceOf(
        BadRequestError
      );
    });

    it('creates todo and links it', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [itemRow()] })
        .mockResolvedValueOnce({ rows: [] }); // update linked_todo_id
      mockGetMySettings.mockResolvedValueOnce({
        userId: USER_ID,
        hideHiddenHabits: false,
        sleepActivityCategoryId: null,
        habitReminderEnabled: false,
        habitReminderTime: null,
        dayStartReminderEnabled: false,
        dayStartReminderTime: null,
        standupTodoFolderId: '10',
        houseworkActivityId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockGetFolderById.mockResolvedValueOnce({
        id: '10',
        userId: USER_ID,
        name: 'Standup',
        color: '#000',
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockCreateTodo.mockResolvedValueOnce({
        id: '99',
        userId: USER_ID,
        title: 'Fix login',
        description: 'auth edge case\n\nTicket: #123',
        status: 'in_progress',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
        selectedToday: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        orderIndex: 0,
        folderId: '10',
      });

      const todo = await standupService.createTodoFromItem(USER_ID, ITEM_ID);

      expect(todo.id).toBe('99');
      expect(mockCreateTodo).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          title: 'Fix login',
          folderId: '10',
          status: 'in_progress',
        })
      );
    });

    it('returns existing linked todo', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [itemRow({ linked_todo_id: 99 })] });
      mockGetTodoById.mockResolvedValueOnce({
        id: '99',
        userId: USER_ID,
        title: 'Fix login',
        description: null,
        status: 'pending',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
        selectedToday: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        orderIndex: 0,
      });

      const todo = await standupService.createTodoFromItem(USER_ID, ITEM_ID);
      expect(todo.id).toBe('99');
      expect(mockCreateTodo).not.toHaveBeenCalled();
    });
  });

  describe('deleteMember', () => {
    it('blocks delete when member has items', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [memberRow()] })
        .mockResolvedValueOnce({ rows: [{ exists: true }] });

      await expect(standupService.deleteMember(USER_ID, MEMBER_ID)).rejects.toBeInstanceOf(
        BadRequestError
      );
    });
  });

  describe('getDayView missing day', () => {
    it('returns null day without error', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });
      const view = await standupService.getDayView(USER_ID, DATE);
      expect(view.day).toBeNull();
      expect(view.items).toEqual([]);
    });
  });

  describe('updateItem not found', () => {
    it('throws NotFoundError', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(
        standupService.updateItem(USER_ID, ITEM_ID, { title: 'X' })
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getWeekView', () => {
    it('skips weekends and returns days in chronological order', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [dayRow({ date: DATE })] }) // standup_days batch
        .mockResolvedValueOnce({ rows: [itemRow({ backlog_started_on: DATE })] }); // standup_items batch

      const week = await standupService.getWeekView(USER_ID, DATE, 5);

      expect(week).toHaveLength(5);
      expect(week.map((entry) => entry.date)).toEqual([
        '2026-07-16',
        '2026-07-17',
        '2026-07-20',
        '2026-07-21',
        '2026-07-22',
      ]);
      const todayEntry = week[week.length - 1];
      expect(todayEntry.day?.status).toBe('open');
      expect(todayEntry.items).toHaveLength(1);
      expect(week[0].day).toBeNull();
      expect(week[0].items).toEqual([]);
    });
  });
});
