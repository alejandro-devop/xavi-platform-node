import { BadRequestError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { swListService } from '../../../src/services/sweeter-way-list.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({ getDbPool: jest.fn() }));
jest.mock('../../../src/services/sweeter-way-bond.service', () => ({
  swBondService: {
    getActiveBond: jest.fn(),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';
import { swBondService } from '../../../src/services/sweeter-way-bond.service';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;
const mockGetActiveBond = swBondService.getActiveBond as jest.MockedFunction<
  typeof swBondService.getActiveBond
>;

const NOW = new Date('2025-01-01T12:00:00Z');
const USER_A = 1;
const USER_B = 2;
const USER_C = 3;
const BOND_ID = 'bond-uuid-0001';
const LIST_ID = 'list-uuid-0001';
const ITEM_ID = 'item-uuid-0001';

const ACTIVE_BOND = {
  id: BOND_ID,
  requesterId: USER_A,
  addresseeId: USER_B,
  status: 'accepted' as const,
  requestedAt: NOW,
  respondedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

function makeListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LIST_ID,
    bond_id: BOND_ID,
    title: 'Restaurantes',
    description: null,
    category: 'restaurant',
    created_by: USER_A,
    requester_id: USER_A,
    addressee_id: USER_B,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    list_id: LIST_ID,
    title: 'El Cielo',
    description: null,
    address: 'Calle 123',
    url: null,
    status: 'pending',
    completed_at: null,
    added_by: USER_A,
    rating: null,
    would_return: null,
    requester_id: USER_A,
    addressee_id: USER_B,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('swListService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  // ─── getMyLists ──────────────────────────────────────────────────────────────

  describe('getMyLists', () => {
    it('throws BadRequestError when user has no active bond', async () => {
      mockGetActiveBond.mockResolvedValueOnce(null);
      await expect(swListService.getMyLists(USER_A)).rejects.toThrow(BadRequestError);
    });

    it('returns lists for the active bond', async () => {
      mockGetActiveBond.mockResolvedValueOnce(ACTIVE_BOND);
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] });
      const lists = await swListService.getMyLists(USER_A);
      expect(lists).toHaveLength(1);
      expect(lists[0].title).toBe('Restaurantes');
    });
  });

  // ─── createList ──────────────────────────────────────────────────────────────

  describe('createList', () => {
    it('creates a list for the active bond', async () => {
      mockGetActiveBond.mockResolvedValueOnce(ACTIVE_BOND);
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] });
      const list = await swListService.createList(USER_A, {
        title: 'Restaurantes',
        category: 'restaurant',
      });
      expect(list.bondId).toBe(BOND_ID);
    });

    it('throws BadRequestError when user has no active bond', async () => {
      mockGetActiveBond.mockResolvedValueOnce(null);
      await expect(
        swListService.createList(USER_A, { title: 'Test', category: 'other' })
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ─── updateList ──────────────────────────────────────────────────────────────

  describe('updateList', () => {
    it('throws ForbiddenError when user is not in the bond', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [makeListRow({ requester_id: USER_A, addressee_id: USER_B })],
      });
      await expect(
        swListService.updateList(LIST_ID, USER_C, { title: 'New title' })
      ).rejects.toThrow(ForbiddenError);
    });

    it('updates and returns the list', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] }); // ownership check
      mockDbPool.query.mockResolvedValueOnce({                           // UPDATE
        rows: [makeListRow({ title: 'Nuevo Título' })],
      });
      const list = await swListService.updateList(LIST_ID, USER_A, { title: 'Nuevo Título' });
      expect(list.title).toBe('Nuevo Título');
    });

    it('throws BadRequestError when no fields are provided', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] });
      await expect(swListService.updateList(LIST_ID, USER_A, {})).rejects.toThrow(BadRequestError);
    });
  });

  // ─── deleteList ──────────────────────────────────────────────────────────────

  describe('deleteList', () => {
    it('throws BadRequestError when list has completed items', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] }); // ownership
      mockDbPool.query.mockResolvedValueOnce({ rows: [{ c: '2' }] });   // completed count
      await expect(swListService.deleteList(LIST_ID, USER_A)).rejects.toThrow(BadRequestError);
    });

    it('deletes the list when no completed items', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] }); // ownership
      mockDbPool.query.mockResolvedValueOnce({ rows: [{ c: '0' }] });   // completed count
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });              // DELETE
      const result = await swListService.deleteList(LIST_ID, USER_A);
      expect(result).toBe(true);
    });
  });

  // ─── addListItem ─────────────────────────────────────────────────────────────

  describe('addListItem', () => {
    it('adds an item and returns it', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] }); // ownership
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow()] }); // INSERT
      const item = await swListService.addListItem(LIST_ID, USER_A, { title: 'El Cielo' });
      expect(item.title).toBe('El Cielo');
      expect(item.status).toBe('pending');
    });
  });

  // ─── completeListItem ─────────────────────────────────────────────────────────

  describe('completeListItem', () => {
    it('marks item as completed', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow()] }); // ownership
      mockDbPool.query.mockResolvedValueOnce({                           // UPDATE
        rows: [makeItemRow({ status: 'completed', completed_at: NOW })],
      });
      const item = await swListService.completeListItem(ITEM_ID, USER_A);
      expect(item.status).toBe('completed');
    });

    it('throws BadRequestError when item is already completed', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [makeItemRow({ status: 'completed' })],
      });
      await expect(swListService.completeListItem(ITEM_ID, USER_A)).rejects.toThrow(
        BadRequestError
      );
    });
  });

  // ─── rateListItem ─────────────────────────────────────────────────────────────

  describe('rateListItem', () => {
    it('throws BadRequestError when item is not completed', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow({ status: 'pending' })] });
      await expect(swListService.rateListItem(ITEM_ID, USER_A, 5, true)).rejects.toThrow(
        BadRequestError
      );
    });

    it('rates a completed item', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow({ status: 'completed' })] });
      mockDbPool.query.mockResolvedValueOnce({
        rows: [makeItemRow({ status: 'completed', rating: 5, would_return: true })],
      });
      const item = await swListService.rateListItem(ITEM_ID, USER_A, 5, true);
      expect(item.rating).toBe(5);
      expect(item.wouldReturn).toBe(true);
    });
  });

  // ─── upsertItemLog ────────────────────────────────────────────────────────────

  describe('upsertItemLog', () => {
    it('throws BadRequestError when item is not completed', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow({ status: 'pending' })] });
      await expect(
        swListService.upsertItemLog(ITEM_ID, USER_A, { comment: 'Me encantó', liked: true })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates or updates a log entry', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow({ status: 'completed' })] });
      const logRow = {
        id: 'log-uuid-0001',
        item_id: ITEM_ID,
        user_id: USER_A,
        comment: 'Me encantó',
        liked: true,
        created_at: NOW,
        updated_at: NOW,
      };
      mockDbPool.query.mockResolvedValueOnce({ rows: [logRow] });

      const log = await swListService.upsertItemLog(ITEM_ID, USER_A, {
        comment: 'Me encantó',
        liked: true,
      });
      expect(log.comment).toBe('Me encantó');
      expect(log.liked).toBe(true);
    });
  });

  // ─── Full flow ────────────────────────────────────────────────────────────────

  describe('Full flow: bond → list → item → complete → rate → log', () => {
    it('executes each step successfully', async () => {
      // Step 1: createList
      mockGetActiveBond.mockResolvedValue(ACTIVE_BOND);
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] });
      const list = await swListService.createList(USER_A, { title: 'Restaurantes', category: 'restaurant' });
      expect(list.id).toBe(LIST_ID);

      // Step 2: addListItem
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeListRow()] }); // ownership
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow()] });
      const item = await swListService.addListItem(LIST_ID, USER_A, { title: 'El Cielo' });
      expect(item.status).toBe('pending');

      // Step 3: completeListItem
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow()] });
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow({ status: 'completed', completed_at: NOW })] });
      const completed = await swListService.completeListItem(ITEM_ID, USER_A);
      expect(completed.status).toBe('completed');

      // Step 4: rateListItem
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow({ status: 'completed' })] });
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow({ status: 'completed', rating: 4, would_return: true })] });
      const rated = await swListService.rateListItem(ITEM_ID, USER_A, 4, true);
      expect(rated.rating).toBe(4);

      // Step 5: upsertItemLog
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeItemRow({ status: 'completed' })] });
      const logRow = { id: 'log-1', item_id: ITEM_ID, user_id: USER_A, comment: 'Perfecto', liked: true, created_at: NOW, updated_at: NOW };
      mockDbPool.query.mockResolvedValueOnce({ rows: [logRow] });
      const log = await swListService.upsertItemLog(ITEM_ID, USER_A, { comment: 'Perfecto', liked: true });
      expect(log.comment).toBe('Perfecto');
    });
  });
});
