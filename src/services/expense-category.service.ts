import { getDbPool } from '../shared/database/pool';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

export interface ExpenseCategory {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseCategoryInput {
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  type?: 'income' | 'expense';
  color?: string;
  icon?: string;
}

export const expenseCategoryService = {
  /**
   * Get all expense categories for a user
   */
  async getCategories(userId: string, type?: 'income' | 'expense'): Promise<ExpenseCategory[]> {
    const db = getDbPool();

    let query = `SELECT id, user_id, name, type, color, icon, is_system, created_at, updated_at
                 FROM wallet_expense_categories
                 WHERE user_id = $1`;
    const params: any[] = [userId];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    query += ' ORDER BY is_system DESC, name ASC';

    const result = await db.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      color: row.color,
      icon: row.icon,
      isSystem: row.is_system,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * Get a category by ID
   */
  async getCategoryById(id: string, userId: string): Promise<ExpenseCategory> {
    const db = getDbPool();
    const result = await db.query(
      `SELECT id, user_id, name, type, color, icon, is_system, created_at, updated_at
       FROM wallet_expense_categories
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Category not found');
    }

    const category = result.rows[0];

    if (category.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this category');
    }

    return {
      id: category.id,
      userId: category.user_id,
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      isSystem: category.is_system,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    };
  },

  /**
   * Create a new expense category
   */
  async createCategory(
    userId: string,
    input: CreateExpenseCategoryInput
  ): Promise<ExpenseCategory> {
    const db = getDbPool();

    const result = await db.query(
      `INSERT INTO wallet_expense_categories (user_id, name, type, color, icon, is_system)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, user_id, name, type, color, icon, is_system, created_at, updated_at`,
      [userId, input.name, input.type, input.color || null, input.icon || null]
    );

    const category = result.rows[0];

    return {
      id: category.id,
      userId: category.user_id,
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      isSystem: category.is_system,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    };
  },

  /**
   * Update an expense category
   */
  async updateCategory(
    id: string,
    userId: string,
    input: UpdateExpenseCategoryInput
  ): Promise<ExpenseCategory> {
    const db = getDbPool();

    // Verify ownership
    const category = await this.getCategoryById(id, userId);

    if (category.isSystem) {
      throw new BadRequestError('Cannot update system categories');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(input.name);
      paramIndex++;
    }

    if (input.type !== undefined) {
      updates.push(`type = $${paramIndex}`);
      params.push(input.type);
      paramIndex++;
    }

    if (input.color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      params.push(input.color);
      paramIndex++;
    }

    if (input.icon !== undefined) {
      updates.push(`icon = $${paramIndex}`);
      params.push(input.icon);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    params.push(id);

    const result = await db.query(
      `UPDATE wallet_expense_categories SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, user_id, name, type, color, icon, is_system, created_at, updated_at`,
      params
    );

    const updatedCategory = result.rows[0];

    return {
      id: updatedCategory.id,
      userId: updatedCategory.user_id,
      name: updatedCategory.name,
      type: updatedCategory.type,
      color: updatedCategory.color,
      icon: updatedCategory.icon,
      isSystem: updatedCategory.is_system,
      createdAt: updatedCategory.created_at,
      updatedAt: updatedCategory.updated_at,
    };
  },

  /**
   * Delete an expense category
   */
  async deleteCategory(id: string, userId: string): Promise<boolean> {
    const db = getDbPool();

    // Verify ownership
    const category = await this.getCategoryById(id, userId);

    if (category.isSystem) {
      throw new BadRequestError('Cannot delete system categories');
    }

    await db.query('DELETE FROM wallet_expense_categories WHERE id = $1', [id]);

    return true;
  },
};
