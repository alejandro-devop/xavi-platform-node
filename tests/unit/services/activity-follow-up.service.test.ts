import { BadRequestError, ForbiddenError } from '../../../src/shared/errors';
import { activityFollowUpService } from '../../../src/services/activity-follow-up.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/services/activity.service', () => ({
  activityService: {
    parseActivityId: (id: string) => parseInt(id, 10),
    getActivityById: jest.fn().mockResolvedValue({ id: '7' }),
  },
}));

jest.mock('../../../src/services/todo.service', () => ({
  todoService: {
    getTodoById: jest.fn().mockResolvedValue({ id: '12', title: 'Task' }),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';
import { activityService } from '../../../src/services/activity.service';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;
const mockGetActivityById = activityService.getActivityById as jest.Mock;

const USER_ID = 1;
const ACTIVITY_ID = 7;
const FOLLOW_UP_ID = 3;

function createFollowUpRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: FOLLOW_UP_ID,
    user_id: USER_ID,
    activity_id: ACTIVITY_ID,
    date: '2024-06-01',
    start_time: '09:00:00',
    duration_minutes: 60,
    notes: null,
    linked_todo_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('ActivityFollowUpService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
    mockGetActivityById.mockResolvedValue({ id: String(ACTIVITY_ID) });
  });

  it('returns follow-up with computed end time', async () => {
    mockDbPool.query.mockResolvedValueOnce({ rows: [createFollowUpRow()] });

    const followUp = await activityFollowUpService.getFollowUpById(String(FOLLOW_UP_ID), USER_ID);

    expect(followUp.startTime).toBe('09:00:00');
    expect(followUp.durationMinutes).toBe(60);
    expect(followUp.isOpen).toBe(false);
    expect(followUp.endTime).toBe('10:00:00');
    expect(followUp.endDate).toBe('2024-06-01');
  });

  it('maps open follow-up without end fields', async () => {
    mockDbPool.query.mockResolvedValueOnce({
      rows: [createFollowUpRow({ duration_minutes: null, linked_todo_id: 12 })],
    });

    const followUp = await activityFollowUpService.getFollowUpById(String(FOLLOW_UP_ID), USER_ID);

    expect(followUp.isOpen).toBe(true);
    expect(followUp.durationMinutes).toBeNull();
    expect(followUp.endTime).toBeNull();
    expect(followUp.linkedTodoId).toBe('12');
  });

  it('throws ForbiddenError for non-owner', async () => {
    mockDbPool.query.mockResolvedValueOnce({
      rows: [createFollowUpRow({ user_id: 2 })],
    });

    await expect(
      activityFollowUpService.getFollowUpById(String(FOLLOW_UP_ID), USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it('getOpenFollowUp returns null when none', async () => {
    mockDbPool.query.mockResolvedValueOnce({ rows: [] });

    const open = await activityFollowUpService.getOpenFollowUp(USER_ID);

    expect(open).toBeNull();
  });

  it('startFollowUp rejects when open session exists', async () => {
    mockDbPool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

    await expect(
      activityFollowUpService.startFollowUp(USER_ID, {
        activityId: String(ACTIVITY_ID),
        date: '2024-06-01',
        startTime: '09:00:00',
      })
    ).rejects.toThrow(BadRequestError);

    expect(mockGetActivityById).not.toHaveBeenCalled();
  });

  it('startFollowUp inserts open row', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [createFollowUpRow({ duration_minutes: null })] });

    const followUp = await activityFollowUpService.startFollowUp(USER_ID, {
      activityId: String(ACTIVITY_ID),
      date: '2024-06-01',
      startTime: '09:00:00',
      notes: 'focus',
      linkedTodoId: '12',
    });

    expect(followUp.isOpen).toBe(true);
    expect(mockDbPool.query).toHaveBeenCalledTimes(2);
  });

  it('startFollowUp attaches selected subtasks', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [createFollowUpRow({ duration_minutes: null })] })
      .mockResolvedValueOnce({
        rows: [
          { id: 10, title: 'Barrer', order_index: 0 },
          { id: 11, title: 'Trapear', order_index: 1 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const followUp = await activityFollowUpService.startFollowUp(USER_ID, {
      activityId: String(ACTIVITY_ID),
      date: '2024-06-01',
      startTime: '09:00:00',
      subtaskIds: ['10', '11'],
    });

    expect(followUp.isOpen).toBe(true);
    expect(mockDbPool.query).toHaveBeenCalledTimes(5);
  });

  it('startFollowUp rejects subtasks from another activity', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [createFollowUpRow({ duration_minutes: null })] })
      .mockResolvedValueOnce({
        rows: [{ id: 10, title: 'Barrer', order_index: 0 }],
      });

    await expect(
      activityFollowUpService.startFollowUp(USER_ID, {
        activityId: String(ACTIVITY_ID),
        date: '2024-06-01',
        startTime: '09:00:00',
        subtaskIds: ['10', '99'],
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('updateSessionSubtask toggles completion', async () => {
    const now = new Date('2024-06-01T12:00:00Z');
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [createFollowUpRow({ duration_minutes: null })] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 5,
            follow_up_id: FOLLOW_UP_ID,
            activity_subtask_id: 10,
            title: 'Barrer',
            is_completed: true,
            order_index: 0,
            created_at: now,
            updated_at: now,
          },
        ],
      });

    const subtask = await activityFollowUpService.updateSessionSubtask(
      String(FOLLOW_UP_ID),
      '5',
      USER_ID,
      { isCompleted: true }
    );

    expect(subtask.isCompleted).toBe(true);
    expect(subtask.title).toBe('Barrer');
  });

  it('addSessionSubtask creates template + session row on open follow-up', async () => {
    const now = new Date('2024-06-01T12:00:00Z');
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [createFollowUpRow({ duration_minutes: null })] }) // owned
      .mockResolvedValueOnce({ rows: [] }) // session dup
      .mockResolvedValueOnce({ rows: [] }) // template existing
      .mockResolvedValueOnce({ rows: [{ max: '2' }] }) // max template order
      .mockResolvedValueOnce({ rows: [{ id: 44, title: 'Limpiar cocina' }] }) // insert template
      .mockResolvedValueOnce({ rows: [{ max: '1' }] }) // max session order
      .mockResolvedValueOnce({
        rows: [
          {
            id: 90,
            follow_up_id: FOLLOW_UP_ID,
            activity_subtask_id: 44,
            title: 'Limpiar cocina',
            is_completed: false,
            order_index: 2,
            created_at: now,
            updated_at: now,
          },
        ],
      });

    const subtask = await activityFollowUpService.addSessionSubtask(USER_ID, {
      followUpId: String(FOLLOW_UP_ID),
      title: 'Limpiar cocina',
    });

    expect(subtask.id).toBe('90');
    expect(subtask.title).toBe('Limpiar cocina');
    expect(subtask.isCompleted).toBe(false);
    expect(subtask.orderIndex).toBe(2);
    expect(subtask.activitySubtaskId).toBe('44');
  });

  it('addSessionSubtask reuses existing template title', async () => {
    const now = new Date('2024-06-01T12:00:00Z');
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [createFollowUpRow({ duration_minutes: null })] })
      .mockResolvedValueOnce({ rows: [] }) // session dup
      .mockResolvedValueOnce({
        rows: [{ id: 10, title: 'Barrer', order_index: 0 }],
      }) // template hit
      .mockResolvedValueOnce({ rows: [{ max: null }] }) // max session
      .mockResolvedValueOnce({
        rows: [
          {
            id: 91,
            follow_up_id: FOLLOW_UP_ID,
            activity_subtask_id: 10,
            title: 'Barrer',
            is_completed: false,
            order_index: 0,
            created_at: now,
            updated_at: now,
          },
        ],
      });

    const subtask = await activityFollowUpService.addSessionSubtask(USER_ID, {
      followUpId: String(FOLLOW_UP_ID),
      title: 'barrer',
    });

    expect(subtask.activitySubtaskId).toBe('10');
    expect(subtask.title).toBe('Barrer');
  });

  it('addSessionSubtask rejects closed follow-up', async () => {
    mockDbPool.query.mockResolvedValueOnce({
      rows: [createFollowUpRow({ duration_minutes: 30 })],
    });

    await expect(
      activityFollowUpService.addSessionSubtask(USER_ID, {
        followUpId: String(FOLLOW_UP_ID),
        title: 'Nueva',
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('addSessionSubtask rejects duplicate title in session', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [createFollowUpRow({ duration_minutes: null })] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await expect(
      activityFollowUpService.addSessionSubtask(USER_ID, {
        followUpId: String(FOLLOW_UP_ID),
        title: 'Barrer',
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
