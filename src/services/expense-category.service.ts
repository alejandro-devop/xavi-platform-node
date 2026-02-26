import { getDb } from '../shared/database/drizzle';
import { walletExpenseCategories } from '../shared/database/schema';
import { eq, and, desc, asc, ne } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';
import type {
  ExpenseCategory,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
} from '../types/services/expense-category.types';

export const expenseCategoryService = {
  /**
   * Get all expense categories for a user
   */
  async getCategories(userId: number, type?: 'income' | 'expense'): Promise<ExpenseCategory[]> {
    const db = getDb();

    const whereConditions = type
      ? and(eq(walletExpenseCategories.userId, userId), eq(walletExpenseCategories.type, type))
      : eq(walletExpenseCategories.userId, userId);

    const categories = await db.query.walletExpenseCategories.findMany({
      where: whereConditions,
      orderBy: [desc(walletExpenseCategories.isSystem), asc(walletExpenseCategories.name)],
    });

    return categories;
  },

  /**
   * Get a category by ID
   */
  async getCategoryById(id: string, userId: number): Promise<ExpenseCategory> {
    const db = getDb();

    const category = await db.query.walletExpenseCategories.findFirst({
      where: eq(walletExpenseCategories.id, id),
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Verify ownership
    if (category.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to access this category');
    }

    return category;
  },

  /**
   * Create a new expense category
   */
  async createCategory(
    userId: number,
    input: CreateExpenseCategoryInput
  ): Promise<ExpenseCategory> {
    const db = getDb();

    const [category] = await db
      .insert(walletExpenseCategories)
      .values({
        userId,
        name: input.name,
        type: input.type,
        description: input.description || null,
        color: input.color || null,
        icon: input.icon || null,
        isSystem: false,
        isTransaction: input.isTransaction ?? false,
      })
      .returning();

    return category;
  } /**
   * Update a category
   */,
  async updateCategory(
    id: string,
    userId: number,
    input: UpdateExpenseCategoryInput
  ): Promise<ExpenseCategory> {
    const db = getDb();

    // Verify ownership
    const category = await this.getCategoryById(id, userId);

    if (category.isSystem) {
      throw new BadRequestError('Cannot update system categories');
    }

    // Build update object
    const updateData: Partial<typeof walletExpenseCategories.$inferInsert> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.isTransaction !== undefined) updateData.isTransaction = input.isTransaction;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    // Always update timestamp
    updateData.updatedAt = new Date();

    const [updatedCategory] = await db
      .update(walletExpenseCategories)
      .set(updateData)
      .where(eq(walletExpenseCategories.id, id))
      .returning();

    return updatedCategory;
  },

  /**
   * Check if a category name is unique for a user
   */
  async isNameUnique(userId: number, name: string, excludeId?: string): Promise<boolean> {
    const db = getDb();

    const conditions = excludeId
      ? and(
          eq(walletExpenseCategories.userId, userId),
          eq(walletExpenseCategories.name, name),
          ne(walletExpenseCategories.id, excludeId)
        )
      : and(eq(walletExpenseCategories.userId, userId), eq(walletExpenseCategories.name, name));

    const existingCategory = await db.query.walletExpenseCategories.findFirst({
      where: conditions,
    });

    return !existingCategory;
  },

  /**
   * Delete a category
   */
  async deleteCategory(id: string, userId: number): Promise<boolean> {
    const db = getDb();

    // Verify ownership
    const category = await this.getCategoryById(id, userId);

    if (category.isSystem) {
      throw new BadRequestError('Cannot delete system categories');
    }

    await db.delete(walletExpenseCategories).where(eq(walletExpenseCategories.id, id));

    return true;
  },
};
