import { Request, Response } from 'express';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/shared/utils/response', () => ({
  successResponse: jest.fn((data: unknown) => data),
}));

import { getDbPool } from '../../../src/shared/database/pool';
import {
  createShoppingList,
  createCatalogItem,
  getCatalogItemById,
  addItemToShoppingList,
} from '../../../src/controllers/shopping.controller';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;
const successResponse =
  require('../../../src/shared/utils/response').successResponse as jest.Mock;

const LIST_ID = '019c7d42-15dc-7000-8000-000000000010';
const ITEM_ID = '019c7d42-15dc-7000-8000-000000000020';
const USER_ID = 1;

function mockAuthRequest(overrides: Partial<Request> = {}): Request {
  return {
    user: {
      id: USER_ID,
      email: 'u@test.com',
      name: 'Test',
      isAccountVerified: true,
    },
    ...overrides,
  } as Request;
}

describe('Shopping controller', () => {
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let res: Partial<Response>;

  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
    successResponse.mockImplementation((data: unknown) => data);
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = { status: statusMock, json: jsonMock };
  });

  describe('createShoppingList', () => {
    it('creates a list', async () => {
      const row = {
        id: LIST_ID,
        user_id: USER_ID,
        name: 'Groceries',
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDbPool.query.mockResolvedValueOnce({ rows: [row] });

      await createShoppingList(
        mockAuthRequest({ body: { name: 'Groceries' } }),
        res as Response
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO shopping_lists'),
        [USER_ID, 'Groceries']
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          shoppingList: expect.objectContaining({
            id: LIST_ID,
            name: 'Groceries',
          }),
        })
      );
    });
  });

  describe('createCatalogItem', () => {
    it('creates an item', async () => {
      const row = {
        id: ITEM_ID,
        user_id: USER_ID,
        name: 'Milk',
        price: '2.50',
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDbPool.query.mockResolvedValueOnce({ rows: [row] });

      await createCatalogItem(
        mockAuthRequest({ body: { name: 'Milk', price: 2.5 } }),
        res as Response
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({
            id: ITEM_ID,
            name: 'Milk',
            price: 2.5,
          }),
        })
      );
    });

    it('maps unique violation to ConflictError', async () => {
      const err = Object.assign(new Error('duplicate'), { code: '23505' });
      mockDbPool.query.mockRejectedValueOnce(err);

      await expect(
        createCatalogItem(mockAuthRequest({ body: { name: 'Milk' } }), res as Response)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getCatalogItemById', () => {
    it('throws ForbiddenError for other user item', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: ITEM_ID,
            user_id: 999,
            name: 'X',
            price: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      await expect(
        getCatalogItemById(mockAuthRequest({ params: { itemId: ITEM_ID } }), res as Response)
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError when missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        getCatalogItemById(mockAuthRequest({ params: { itemId: ITEM_ID } }), res as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('addItemToShoppingList', () => {
    it('adds item and returns listItem', async () => {
      const listRow = { id: LIST_ID, user_id: USER_ID, name: 'L', created_at: new Date() };
      const itemRow = {
        id: ITEM_ID,
        user_id: USER_ID,
        name: 'Milk',
        price: '2.00',
      };
      const joinRow = {
        id: '019c7d42-15dc-7000-8000-000000000099',
        shopping_list_id: LIST_ID,
        item_id: ITEM_ID,
        price: '1.80',
        quantity: '2',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [listRow] })
        .mockResolvedValueOnce({ rows: [itemRow] })
        .mockResolvedValueOnce({ rows: [joinRow] });

      await addItemToShoppingList(
        mockAuthRequest({
          params: { listId: LIST_ID },
          body: { itemId: ITEM_ID, price: 1.8, quantity: 2 },
        }),
        res as Response
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          listItem: expect.objectContaining({
            price: 1.8,
            quantity: 2,
            item: expect.objectContaining({ id: ITEM_ID, name: 'Milk' }),
          }),
        })
      );
    });

    it('allows omitting line price', async () => {
      const listRow = { id: LIST_ID, user_id: USER_ID, name: 'L', created_at: new Date() };
      const itemRow = {
        id: ITEM_ID,
        user_id: USER_ID,
        name: 'Milk',
        price: '2.00',
      };
      const joinRow = {
        id: '019c7d42-15dc-7000-8000-000000000099',
        shopping_list_id: LIST_ID,
        item_id: ITEM_ID,
        price: null,
        quantity: '1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [listRow] })
        .mockResolvedValueOnce({ rows: [itemRow] })
        .mockResolvedValueOnce({ rows: [joinRow] });

      await addItemToShoppingList(
        mockAuthRequest({
          params: { listId: LIST_ID },
          body: { itemId: ITEM_ID, quantity: 1 },
        }),
        res as Response
      );

      expect(mockDbPool.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO shopping_list_items'),
        [LIST_ID, ITEM_ID, null, 1]
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          listItem: expect.objectContaining({
            price: null,
            quantity: 1,
            item: expect.objectContaining({ id: ITEM_ID, name: 'Milk' }),
          }),
        })
      );
    });

    it('maps duplicate list row to ConflictError', async () => {
      const listRow = { id: LIST_ID, user_id: USER_ID };
      const itemRow = { id: ITEM_ID, user_id: USER_ID, name: 'Milk', price: null };
      const duplicate = Object.assign(new Error('dup'), { code: '23505' });

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [listRow] })
        .mockResolvedValueOnce({ rows: [itemRow] })
        .mockRejectedValueOnce(duplicate);

      await expect(
        addItemToShoppingList(
          mockAuthRequest({
            params: { listId: LIST_ID },
            body: { itemId: ITEM_ID, price: 1 },
          }),
          res as Response
        )
      ).rejects.toThrow(ConflictError);
    });
  });
});
