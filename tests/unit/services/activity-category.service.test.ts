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
const GOAL_ID = '019c7d42-15dc-7000-8000-0000000000a1';

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
          goal_id: null,
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
          goal_id: null,
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
            goal_id: null,
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

  it('carries goal_id out as goalId in list, get and create', async () => {
    const now = new Date();
    const row = {
      id: CATEGORY_ID,
      user_id: USER_ID,
      order_index: 0,
      name: 'Work',
      description: null,
      icon: null,
      color: null,
      goal_id: GOAL_ID,
      created_at: now,
      updated_at: now,
    };

    mockDbPool.query.mockResolvedValue({ rows: [row] });

    const [listed] = await activityCategoryService.listCategories(USER_ID);
    expect(listed.goalId).toBe(GOAL_ID);

    const fetched = await activityCategoryService.getCategoryById(CATEGORY_ID, USER_ID);
    expect(fetched.goalId).toBe(GOAL_ID);

    const created = await activityCategoryService.createCategory(USER_ID, { name: 'Work' });
    expect(created.goalId).toBe(GOAL_ID);
  });

  it('leaves goalId null when the row has no goal', async () => {
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
          goal_id: null,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    const [listed] = await activityCategoryService.listCategories(USER_ID);
    expect(listed.goalId).toBeNull();
  });
});
