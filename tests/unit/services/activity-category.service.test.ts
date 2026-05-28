import { BadRequestError, ForbiddenError } from '../../../src/shared/errors';
import { activityCategoryService } from '../../../src/services/activity-category.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const CATEGORY_ID = '019c7d42-15dc-7000-8000-000000000099';

describe('ActivityCategoryService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  it('lists categories for user', async () => {
    const now = new Date();
    mockDbPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: CATEGORY_ID,
          user_id: USER_ID,
          order_index: 0,
          name: 'Work',
          description: null,
          icon: null,
          color: null,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    const categories = await activityCategoryService.listCategories(USER_ID);
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Work');
  });

  it('throws ForbiddenError for non-owner', async () => {
    mockDbPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: CATEGORY_ID,
          user_id: 2,
          order_index: 0,
          name: 'Work',
          description: null,
          icon: null,
          color: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    });

    await expect(
      activityCategoryService.getCategoryById(CATEGORY_ID, USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });

  it('blocks delete when activities use category', async () => {
    const now = new Date();
    mockDbPool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: CATEGORY_ID,
            user_id: USER_ID,
            order_index: 0,
            name: 'Work',
            description: null,
            icon: null,
            color: null,
            created_at: now,
            updated_at: now,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] });

    await expect(
      activityCategoryService.deleteCategory(CATEGORY_ID, USER_ID)
    ).rejects.toThrow(BadRequestError);
  });
});
