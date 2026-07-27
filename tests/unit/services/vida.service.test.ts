import { BadRequestError, NotFoundError } from '../../../src/shared/errors';
import { vidaService } from '../../../src/services/vida.service';
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

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const ACTIVITY_ID = 7;
const ITEM_ID = '018f0000-0000-7000-8000-000000000001';
const CLIENT_ID = '018f0000-0000-7000-8000-0000000000aa';
const DATE = '2026-07-17'; // Friday

function createItemRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-17T12:00:00Z');
  return {
    id: ITEM_ID,
    user_id: USER_ID,
    activity_id: ACTIVITY_ID,
    days: ['friday', 'monday'],
    notes: null,
    is_active: true,
    order_index: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function createTakenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '018f0000-0000-7000-8000-000000000010',
    user_id: USER_ID,
    vida_item_id: ITEM_ID,
    date: DATE,
    created_at: new Date('2026-07-17T12:00:00Z'),
    ...overrides,
  };
}

describe('VidaService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('dayOfWeekFromDateString', () => {
    it('maps YYYY-MM-DD to weekday via UTC civil date', () => {
      expect(vidaService.dayOfWeekFromDateString('2026-07-17')).toBe('friday');
      expect(vidaService.dayOfWeekFromDateString('2026-07-13')).toBe('monday');
    });
  });

  describe('listItems', () => {
    it('returns active items by default', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createItemRow()] });

      const items = await vidaService.listItems(USER_ID);

      expect(items).toHaveLength(1);
      expect(items[0].activityId).toBe(String(ACTIVITY_ID));
      expect(items[0].days).toEqual(['friday', 'monday']);
      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = TRUE'),
        [USER_ID]
      );
    });

    it('includes inactive when requested', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createItemRow({ is_active: false })] });

      await vidaService.listItems(USER_ID, true);

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('is_active = TRUE'),
        [USER_ID]
      );
    });
  });

  describe('createItem', () => {
    it('rejects activities not owned by the user', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        vidaService.createItem(USER_ID, {
          activityId: String(ACTIVITY_ID),
          days: ['monday'],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('inserts a new item after ownership check', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID }] })
        .mockResolvedValueOnce({ rows: [createItemRow()] });

      const item = await vidaService.createItem(USER_ID, {
        activityId: String(ACTIVITY_ID),
        days: ['friday', 'monday'],
        orderIndex: 0,
      });

      expect(item.id).toBe(ITEM_ID);
      const insertCall = mockDbPool.query.mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO vida_items');
      expect(insertCall[1]?.[2]).toBe(ACTIVITY_ID);
      expect(insertCall[1]?.[3]).toEqual(['friday', 'monday']);
    });

    it('returns existing row for the same clientId (idempotent)', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID }] })
        .mockResolvedValueOnce({ rows: [createItemRow({ client_id: CLIENT_ID })] });

      const item = await vidaService.createItem(USER_ID, {
        activityId: String(ACTIVITY_ID),
        days: ['friday'],
        clientId: CLIENT_ID,
      });

      expect(item.id).toBe(ITEM_ID);
      expect(mockDbPool.query).toHaveBeenCalledTimes(2);
      expect(mockDbPool.query.mock.calls[1][0]).toContain('client_id');
    });
  });

  describe('updateItem', () => {
    it('throws when item is missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        vidaService.updateItem(USER_ID, ITEM_ID, { isActive: false })
      ).rejects.toThrow(NotFoundError);
    });

    it('updates days and isActive', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createItemRow()] })
        .mockResolvedValueOnce({
          rows: [createItemRow({ days: ['wednesday'], is_active: false })],
        });

      const item = await vidaService.updateItem(USER_ID, ITEM_ID, {
        days: ['wednesday'],
        isActive: false,
      });

      expect(item.days).toEqual(['wednesday']);
      expect(item.isActive).toBe(false);
    });
  });

  describe('deleteItem', () => {
    it('throws when item is missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(vidaService.deleteItem(USER_ID, ITEM_ID)).rejects.toThrow(NotFoundError);
    });

    it('returns true when deleted', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [{ id: ITEM_ID }] });

      await expect(vidaService.deleteItem(USER_ID, ITEM_ID)).resolves.toBe(true);
    });
  });

  describe('suggestionsForDate', () => {
    it('filters by weekday and attaches takenToday', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({
          rows: [
            createItemRow({ days: ['friday'] }),
            createItemRow({
              id: '018f0000-0000-7000-8000-000000000002',
              days: ['monday'],
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [createTakenRow()] });

      const suggestions = await vidaService.suggestionsForDate(USER_ID, DATE);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].item.id).toBe(ITEM_ID);
      expect(suggestions[0].takenToday).toBe(true);
    });
  });

  describe('markTakenToday', () => {
    it('rejects inactive items', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createItemRow({ is_active: false })],
      });

      await expect(vidaService.markTakenToday(USER_ID, ITEM_ID, DATE)).rejects.toThrow(
        BadRequestError
      );
    });

    it('rejects when item is not scheduled for that weekday', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createItemRow({ days: ['monday'] })],
      });

      await expect(vidaService.markTakenToday(USER_ID, ITEM_ID, DATE)).rejects.toThrow(
        BadRequestError
      );
    });

    it('returns existing mark when already taken (idempotent)', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createItemRow()] })
        .mockResolvedValueOnce({ rows: [createTakenRow()] });

      const taken = await vidaService.markTakenToday(USER_ID, ITEM_ID, DATE);

      expect(taken.vidaItemId).toBe(ITEM_ID);
      expect(taken.date).toBe(DATE);
      expect(mockDbPool.query).toHaveBeenCalledTimes(2);
    });

    it('inserts a new taken mark', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createItemRow()] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createTakenRow()] });

      const taken = await vidaService.markTakenToday(USER_ID, ITEM_ID, DATE);

      expect(taken.id).toBeDefined();
      expect(mockDbPool.query.mock.calls[2][0]).toContain('INSERT INTO vida_taken_today');
    });
  });

  describe('unmarkTakenToday', () => {
    it('returns false when nothing to delete', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createItemRow()] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(vidaService.unmarkTakenToday(USER_ID, ITEM_ID, DATE)).resolves.toBe(false);
    });

    it('returns true when a mark is removed', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createItemRow()] })
        .mockResolvedValueOnce({ rows: [{ id: 'x' }] });

      await expect(vidaService.unmarkTakenToday(USER_ID, ITEM_ID, DATE)).resolves.toBe(true);
    });
  });
});
