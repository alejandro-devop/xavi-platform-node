import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors';
import type {
  ActivityCategory,
  CreateActivityCategoryInput,
  UpdateActivityCategoryInput,
} from '../types/services/activity-category.types';

type CategoryRow = {
  id: string;
  user_id: number;
  order_index: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapCategory(row: CategoryRow): ActivityCategory {
  return {
    id: row.id,
    userId: row.user_id,
    orderIndex: row.order_index,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCategoryRowOrThrow(categoryId: string): Promise<CategoryRow> {
  const db = getDbPool();
  const result = await db.query<CategoryRow>('SELECT * FROM activity_categories WHERE id = $1', [
    categoryId,
  ]);
  if (result.rows.length === 0) {
    throw new NotFoundError('Activity category not found');
  }
  return result.rows[0];
}

async function getOwnedCategoryOrThrow(categoryId: string, userId: number): Promise<CategoryRow> {
  const row = await getCategoryRowOrThrow(categoryId);
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this activity category');
  }
  return row;
}

async function listCategories(userId: number): Promise<ActivityCategory[]> {
  const db = getDbPool();
  const result = await db.query<CategoryRow>(
    `SELECT * FROM activity_categories WHERE user_id = $1 ORDER BY order_index ASC, name ASC`,
    [userId]
  );
  return result.rows.map(mapCategory);
}

async function getCategoryById(id: string, userId: number): Promise<ActivityCategory> {
  const row = await getOwnedCategoryOrThrow(id, userId);
  return mapCategory(row);
}

async function createCategory(
  userId: number,
  input: CreateActivityCategoryInput
): Promise<ActivityCategory> {
  const db = getDbPool();
  const result = await db.query<CategoryRow>(
    `INSERT INTO activity_categories (user_id, name, description, icon, color, order_index)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      input.name,
      input.description ?? null,
      input.icon ?? null,
      input.color ?? null,
      input.orderIndex ?? 0,
    ]
  );
  return mapCategory(result.rows[0]);
}

async function updateCategory(
  id: string,
  userId: number,
  input: UpdateActivityCategoryInput
): Promise<ActivityCategory> {
  await getOwnedCategoryOrThrow(id, userId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${i++}`);
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${i++}`);
    params.push(input.description);
  }
  if (input.icon !== undefined) {
    updates.push(`icon = $${i++}`);
    params.push(input.icon);
  }
  if (input.color !== undefined) {
    updates.push(`color = $${i++}`);
    params.push(input.color);
  }
  if (input.orderIndex !== undefined) {
    updates.push(`order_index = $${i++}`);
    params.push(input.orderIndex);
  }

  if (updates.length === 0) {
    return mapCategory(await getCategoryRowOrThrow(id));
  }

  params.push(id);
  const db = getDbPool();
  const result = await db.query<CategoryRow>(
    `UPDATE activity_categories SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return mapCategory(result.rows[0]);
}

async function deleteCategory(id: string, userId: number): Promise<boolean> {
  await getOwnedCategoryOrThrow(id, userId);

  const db = getDbPool();
  const activitiesUsing = await db.query(
    'SELECT COUNT(*)::text AS count FROM activities WHERE category_id = $1',
    [id]
  );
  const count = parseInt(activitiesUsing.rows[0].count, 10);
  if (count > 0) {
    throw new BadRequestError('Cannot delete category while activities are assigned to it');
  }

  await db.query('DELETE FROM activity_categories WHERE id = $1', [id]);
  return true;
}

async function ensureDefaultCategoryId(userId: number): Promise<string> {
  const db = getDbPool();
  const existing = await db.query<{ id: string }>(
    `SELECT id FROM activity_categories WHERE user_id = $1 AND name = 'General' LIMIT 1`,
    [userId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }
  const created = await createCategory(userId, {
    name: 'General',
    description: 'Default category',
  });
  return created.id;
}

export const activityCategoryService = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  ensureDefaultCategoryId,
};
