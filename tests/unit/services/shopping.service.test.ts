import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../src/shared/errors';
import { shoppingService } from '../../../src/services/shopping.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const LIST_ID = '019c7d42-15dc-7000-8000-000000000010';
const ITEM_ID = '019c7d42-15dc-7000-8000-000000000020';
const LIST_ITEM_ID = '019c7d42-15dc-7000-8000-000000000030';
const LIST_ITEM_ID_B = '019c7d42-15dc-7000-8000-000000000031';
const USER_ID = 1;
const OTHER_USER_ID = 2;

describe('ShoppingService.createCatalogItemAndAddToShoppingList', () => {
  let clientQuery: jest.Mock;
  let clientRelease: jest.Mock;

  beforeEach(() => {
    resetAllMocks();
    clientQuery = jest.fn();
    clientRelease = jest.fn();
    mockDbPool.connect.mockResolvedValue({
      query: clientQuery,
      release: clientRelease,
    });
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  function mockTransactionSuccess() {
    const now = new Date();
    const listRow = {
      id: LIST_ID,
      user_id: USER_ID,
      name: 'Groceries',
      created_at: now,
      updated_at: now,
    };
    const itemRow = {
      id: ITEM_ID,
      user_id: USER_ID,
      name: 'Leche',
      price: '2.5',
      created_at: now,
      updated_at: now,
    };
    const listItemRow = {
      id: LIST_ITEM_ID,
      shopping_list_id: LIST_ID,
      item_id: ITEM_ID,
      price: '3.0',
      quantity: '2',
      is_purchased: false,
      created_at: now,
      updated_at: now,
    };

    clientQuery
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [listRow] })
      .mockResolvedValueOnce({ rows: [itemRow] })
      .mockResolvedValueOnce({ rows: [listItemRow] })
      .mockResolvedValueOnce(undefined); // COMMIT

    return { now, itemRow, listItemRow };
  }

  it('creates catalog row and list line in a transaction', async () => {
    mockTransactionSuccess();

    const result = await shoppingService.createCatalogItemAndAddToShoppingList(
      LIST_ID,
      USER_ID,
      {
        name: 'Leche',
        catalogPrice: 2.5,
        price: 3,
        quantity: 2,
      }
    );

    expect(clientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(clientQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM shopping_lists'),
      [LIST_ID]
    );
    expect(clientQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO items'),
      [USER_ID, 'Leche', 2.5]
    );
    expect(clientQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO shopping_list_items'),
      [LIST_ID, ITEM_ID, 3, 2]
    );
    expect(clientQuery).toHaveBeenNthCalledWith(5, 'COMMIT');
    expect(clientRelease).toHaveBeenCalled();
    expect(result.id).toBe(LIST_ITEM_ID);
    expect(result.item.name).toBe('Leche');
    expect(result.item.price).toBe(2.5);
    expect(result.price).toBe(3);
    expect(result.quantity).toBe(2);
    expect(result.isPurchased).toBe(false);
  });

  it('allows null line price when adding new catalog item to list', async () => {
    const now = new Date();
    const listRow = {
      id: LIST_ID,
      user_id: USER_ID,
      name: 'Groceries',
      created_at: now,
      updated_at: now,
    };
    const itemRow = {
      id: ITEM_ID,
      user_id: USER_ID,
      name: 'Leche',
      price: '2.5',
      created_at: now,
      updated_at: now,
    };
    const listItemRow = {
      id: LIST_ITEM_ID,
      shopping_list_id: LIST_ID,
      item_id: ITEM_ID,
      price: null,
      quantity: '2',
      is_purchased: false,
      created_at: now,
      updated_at: now,
    };

    clientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [listRow] })
      .mockResolvedValueOnce({ rows: [itemRow] })
      .mockResolvedValueOnce({ rows: [listItemRow] })
      .mockResolvedValueOnce(undefined);

    const result = await shoppingService.createCatalogItemAndAddToShoppingList(
      LIST_ID,
      USER_ID,
      {
        name: 'Leche',
        catalogPrice: 2.5,
        quantity: 2,
      }
    );

    expect(clientQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO shopping_list_items'),
      [LIST_ID, ITEM_ID, null, 2]
    );
    expect(result.price).toBeNull();
    expect(result.quantity).toBe(2);
  });

  it('rolls back and throws NotFoundError when list is missing', async () => {
    clientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      shoppingService.createCatalogItemAndAddToShoppingList(LIST_ID, USER_ID, {
        name: 'X',
        price: 1,
      })
    ).rejects.toThrow(NotFoundError);

    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientRelease).toHaveBeenCalled();
  });

  it('rolls back and throws ForbiddenError when list belongs to another user', async () => {
    const now = new Date();
    clientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [{ id: LIST_ID, user_id: OTHER_USER_ID, name: 'A', created_at: now, updated_at: now }],
      });

    await expect(
      shoppingService.createCatalogItemAndAddToShoppingList(LIST_ID, USER_ID, {
        name: 'X',
        price: 1,
      })
    ).rejects.toThrow(ForbiddenError);

    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rolls back and throws ConflictError when catalog name already exists for user', async () => {
    const now = new Date();
    clientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [{ id: LIST_ID, user_id: USER_ID, name: 'A', created_at: now, updated_at: now }],
      })
      .mockRejectedValueOnce(Object.assign(new Error('unique'), { code: '23505' }));

    await expect(
      shoppingService.createCatalogItemAndAddToShoppingList(LIST_ID, USER_ID, {
        name: 'Duplicate',
        price: 1,
      })
    ).rejects.toThrow(ConflictError);

    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('ShoppingService.getShoppingLists', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  it('attaches listItems from a single batch query', async () => {
    const now = new Date();
    const listRow = {
      id: LIST_ID,
      user_id: USER_ID,
      name: 'Groceries',
      created_at: now,
      updated_at: now,
    };
    const joinRow = {
      list_item_id: LIST_ITEM_ID,
      shopping_list_id: LIST_ID,
      item_id: ITEM_ID,
      list_price: '3',
      quantity: '1',
      list_item_is_purchased: false,
      list_item_created_at: now,
      list_item_updated_at: now,
      item_name: 'Leche',
      catalog_price: '2',
      item_user_id: USER_ID,
      item_created_at: now,
      item_updated_at: now,
    };
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [{ c: 1 }] })
      .mockResolvedValueOnce({ rows: [listRow] })
      .mockResolvedValueOnce({ rows: [joinRow] });

    const result = await shoppingService.getShoppingLists(USER_ID, 1, 20);

    expect(result.shoppingLists).toHaveLength(1);
    expect(result.shoppingLists[0].listItems).toHaveLength(1);
    expect(result.shoppingLists[0].listItems[0].item.name).toBe('Leche');
    expect(mockDbPool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('shopping_list_id = ANY'),
      [[LIST_ID]]
    );
  });

  it('maps null line price on list items', async () => {
    const now = new Date();
    const listRow = {
      id: LIST_ID,
      user_id: USER_ID,
      name: 'Groceries',
      created_at: now,
      updated_at: now,
    };
    const joinRow = {
      list_item_id: LIST_ITEM_ID,
      shopping_list_id: LIST_ID,
      item_id: ITEM_ID,
      list_price: null,
      quantity: '1',
      list_item_is_purchased: false,
      list_item_created_at: now,
      list_item_updated_at: now,
      item_name: 'Leche',
      catalog_price: '2',
      item_user_id: USER_ID,
      item_created_at: now,
      item_updated_at: now,
    };
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [{ c: 1 }] })
      .mockResolvedValueOnce({ rows: [listRow] })
      .mockResolvedValueOnce({ rows: [joinRow] });

    const result = await shoppingService.getShoppingLists(USER_ID, 1, 20);

    expect(result.shoppingLists[0].listItems[0].price).toBeNull();
  });

  it('returns empty listItems when page has no lists', async () => {
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [{ c: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await shoppingService.getShoppingLists(USER_ID, 1, 20);

    expect(result.shoppingLists).toEqual([]);
    expect(mockDbPool.query).toHaveBeenCalledTimes(2);
  });
});

describe('ShoppingService.setShoppingListItemsPurchased', () => {
  let clientQuery: jest.Mock;
  let clientRelease: jest.Mock;

  beforeEach(() => {
    resetAllMocks();
    clientQuery = jest.fn();
    clientRelease = jest.fn();
    mockDbPool.connect.mockResolvedValue({
      query: clientQuery,
      release: clientRelease,
    });
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  function listRow(now: Date) {
    return {
      id: LIST_ID,
      user_id: USER_ID,
      name: 'Groceries',
      created_at: now,
      updated_at: now,
    };
  }

  function joinRow(now: Date, isPurchased: boolean) {
    return {
      list_item_id: LIST_ITEM_ID,
      shopping_list_id: LIST_ID,
      item_id: ITEM_ID,
      list_price: '1',
      quantity: '1',
      list_item_is_purchased: isPurchased,
      list_item_created_at: now,
      list_item_updated_at: now,
      item_name: 'Leche',
      catalog_price: '2',
      item_user_id: USER_ID,
      item_created_at: now,
      item_updated_at: now,
    };
  }

  it('marks purchased only', async () => {
    const now = new Date();
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [listRow(now)] })
      .mockResolvedValueOnce({ rows: [joinRow(now, true)] });

    clientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: LIST_ITEM_ID }], rowCount: 1 })
      .mockResolvedValueOnce(undefined);

    const result = await shoppingService.setShoppingListItemsPurchased(
      LIST_ID,
      USER_ID,
      [LIST_ITEM_ID],
      []
    );

    expect(clientQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('is_purchased = TRUE'),
      [LIST_ID, [LIST_ITEM_ID]]
    );
    expect(result.listItems[0].isPurchased).toBe(true);
    expect(clientRelease).toHaveBeenCalled();
  });

  it('marks unpurchased only', async () => {
    const now = new Date();
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [listRow(now)] })
      .mockResolvedValueOnce({ rows: [joinRow(now, false)] });

    clientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: LIST_ITEM_ID }], rowCount: 1 })
      .mockResolvedValueOnce(undefined);

    const result = await shoppingService.setShoppingListItemsPurchased(
      LIST_ID,
      USER_ID,
      [],
      [LIST_ITEM_ID]
    );

    expect(clientQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('is_purchased = FALSE'),
      [LIST_ID, [LIST_ITEM_ID]]
    );
    expect(result.listItems[0].isPurchased).toBe(false);
  });

  it('marks purchased and unpurchased in one transaction', async () => {
    const now = new Date();
    mockDbPool.query
      .mockResolvedValueOnce({ rows: [listRow(now)] })
      .mockResolvedValueOnce({ rows: [joinRow(now, true), joinRow(now, false)] });

    clientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: LIST_ITEM_ID }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: LIST_ITEM_ID_B }], rowCount: 1 })
      .mockResolvedValueOnce(undefined);

    await shoppingService.setShoppingListItemsPurchased(
      LIST_ID,
      USER_ID,
      [LIST_ITEM_ID],
      [LIST_ITEM_ID_B]
    );

    expect(clientQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('is_purchased = TRUE'),
      [LIST_ID, [LIST_ITEM_ID]]
    );
    expect(clientQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('is_purchased = FALSE'),
      [LIST_ID, [LIST_ITEM_ID_B]]
    );
  });

  it('throws BadRequestError when purchased ids are invalid', async () => {
    const now = new Date();
    mockDbPool.query.mockResolvedValueOnce({ rows: [listRow(now)] });

    clientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: LIST_ITEM_ID }], rowCount: 1 })
      .mockResolvedValue(undefined);

    await expect(
      shoppingService.setShoppingListItemsPurchased(
        LIST_ID,
        USER_ID,
        [LIST_ITEM_ID, LIST_ITEM_ID_B],
        []
      )
    ).rejects.toThrow(BadRequestError);

    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientRelease).toHaveBeenCalled();
  });
});
