import { Request, Response } from 'express';
import { getDbPool } from '../shared/database/pool';
import { successResponse } from '../shared/utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors';

// ============ ACCOUNTS ============

export async function createAccount(req: Request, res: Response): Promise<void> {
  const { name, type, currency, initialBalance, color, icon } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO wallet_accounts (user_id, name, type, currency, initial_balance, current_balance, color, icon)
     VALUES ($1, $2, $3, $4, $5, $5, $6, $7)
     RETURNING id, user_id, name, type, currency, initial_balance, current_balance, color, icon, is_active, created_at, updated_at`,
    [userId, name, type, currency || 'USD', initialBalance || 0, color || null, icon || null]
  );

  const account = result.rows[0];

  res.status(201).json(
    successResponse({
      account: {
        id: account.id,
        userId: account.user_id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        initialBalance: parseFloat(account.initial_balance),
        currentBalance: parseFloat(account.current_balance),
        color: account.color,
        icon: account.icon,
        isActive: account.is_active,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      },
    })
  );
}

export async function getAccounts(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { type, isActive, page = '1', limit = '20' } = req.query;

  let query = 'SELECT * FROM wallet_accounts WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (type) {
    query += ` AND type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (isActive !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  query += ' ORDER BY created_at DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  const accounts = result.rows.map((account) => ({
    id: account.id,
    userId: account.user_id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    initialBalance: parseFloat(account.initial_balance),
    currentBalance: parseFloat(account.current_balance),
    color: account.color,
    icon: account.icon,
    isActive: account.is_active,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  }));

  res.json(
    successResponse({
      accounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: accounts.length,
      },
    })
  );
}

export async function getAccountById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query('SELECT * FROM wallet_accounts WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Account not found');
  }

  const account = result.rows[0];

  if (account.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this account');
  }

  res.json(
    successResponse({
      account: {
        id: account.id,
        userId: account.user_id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        initialBalance: parseFloat(account.initial_balance),
        currentBalance: parseFloat(account.current_balance),
        color: account.color,
        icon: account.icon,
        isActive: account.is_active,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      },
    })
  );
}

export async function updateAccount(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM wallet_accounts WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Account not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this account');
  }

  const { name, type, currency, color, icon, isActive } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }

  if (type !== undefined) {
    updates.push(`type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  if (currency !== undefined) {
    updates.push(`currency = $${paramIndex}`);
    params.push(currency);
    paramIndex++;
  }

  if (color !== undefined) {
    updates.push(`color = $${paramIndex}`);
    params.push(color);
    paramIndex++;
  }

  if (icon !== undefined) {
    updates.push(`icon = $${paramIndex}`);
    params.push(icon);
    paramIndex++;
  }

  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(isActive);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(id);

  const result = await db.query(
    `UPDATE wallet_accounts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const account = result.rows[0];

  res.json(
    successResponse({
      account: {
        id: account.id,
        userId: account.user_id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        initialBalance: parseFloat(account.initial_balance),
        currentBalance: parseFloat(account.current_balance),
        color: account.color,
        icon: account.icon,
        isActive: account.is_active,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      },
    })
  );
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM wallet_accounts WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Account not found');
  }

  if (checkResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this account');
  }

  await db.query('DELETE FROM wallet_accounts WHERE id = $1', [id]);

  res.json(successResponse({ message: 'Account deleted successfully' }));
}

// ============ CATEGORIES ============

export async function createCategory(req: Request, res: Response): Promise<void> {
  const { name, type, color, icon } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `INSERT INTO wallet_categories (user_id, name, type, color, icon)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, name, type, color, icon, is_system, created_at, updated_at`,
    [userId, name, type, color || null, icon || null]
  );

  const category = result.rows[0];

  res.status(201).json(
    successResponse({
      category: {
        id: category.id,
        userId: category.user_id,
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
        isSystem: category.is_system,
        createdAt: category.created_at,
        updatedAt: category.updated_at,
      },
    })
  );
}

export async function getCategories(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { type } = req.query;

  let query = 'SELECT * FROM wallet_categories WHERE user_id = $1';
  const params: any[] = [userId];

  if (type) {
    query += ' AND type = $2';
    params.push(type);
  }

  query += ' ORDER BY is_system DESC, name ASC';

  const result = await db.query(query, params);

  const categories = result.rows.map((category) => ({
    id: category.id,
    userId: category.user_id,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
    isSystem: category.is_system,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  }));

  res.json(successResponse({ categories }));
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM wallet_categories WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Category not found');
  }

  const category = checkResult.rows[0];

  if (category.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this category');
  }

  if (category.is_system) {
    throw new BadRequestError('Cannot update system categories');
  }

  const { name, type, color, icon } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }

  if (type !== undefined) {
    updates.push(`type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  if (color !== undefined) {
    updates.push(`color = $${paramIndex}`);
    params.push(color);
    paramIndex++;
  }

  if (icon !== undefined) {
    updates.push(`icon = $${paramIndex}`);
    params.push(icon);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  params.push(id);

  const result = await db.query(
    `UPDATE wallet_categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  const updatedCategory = result.rows[0];

  res.json(
    successResponse({
      category: {
        id: updatedCategory.id,
        userId: updatedCategory.user_id,
        name: updatedCategory.name,
        type: updatedCategory.type,
        color: updatedCategory.color,
        icon: updatedCategory.icon,
        isSystem: updatedCategory.is_system,
        createdAt: updatedCategory.created_at,
        updatedAt: updatedCategory.updated_at,
      },
    })
  );
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM wallet_categories WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Category not found');
  }

  const category = checkResult.rows[0];

  if (category.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this category');
  }

  if (category.is_system) {
    throw new BadRequestError('Cannot delete system categories');
  }

  await db.query('DELETE FROM wallet_categories WHERE id = $1', [id]);

  res.json(successResponse({ message: 'Category deleted successfully' }));
}

// ============ TRANSACTIONS ============

export async function createTransaction(req: Request, res: Response): Promise<void> {
  const { accountId, categoryId, type, amount, description, transactionDate, notes } = req.body;
  const userId = req.user!.id;
  const db = getDbPool();

  // Verify account ownership
  const accountResult = await db.query('SELECT * FROM wallet_accounts WHERE id = $1', [accountId]);

  if (accountResult.rows.length === 0) {
    throw new NotFoundError('Account not found');
  }

  if (accountResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to add transactions to this account');
  }

  // If categoryId provided, verify ownership
  if (categoryId) {
    const categoryResult = await db.query('SELECT * FROM wallet_categories WHERE id = $1', [
      categoryId,
    ]);
    if (categoryResult.rows.length === 0) {
      throw new NotFoundError('Category not found');
    }
    if (categoryResult.rows[0].user_id.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to use this category');
    }
  }

  // Start transaction
  await db.query('BEGIN');

  try {
    // Create transaction
    const transactionResult = await db.query(
      `INSERT INTO wallet_transactions (user_id, account_id, category_id, type, amount, description, transaction_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, account_id, category_id, type, amount, description, transaction_date, notes, created_at, updated_at`,
      [
        userId,
        accountId,
        categoryId || null,
        type,
        amount,
        description || null,
        transactionDate || new Date(),
        notes || null,
      ]
    );

    const transaction = transactionResult.rows[0];

    // Update account balance
    const balanceChange = type === 'income' ? amount : -amount;
    await db.query(
      'UPDATE wallet_accounts SET current_balance = current_balance + $1 WHERE id = $2',
      [balanceChange, accountId]
    );

    await db.query('COMMIT');

    res.status(201).json(
      successResponse({
        transaction: {
          id: transaction.id,
          userId: transaction.user_id,
          accountId: transaction.account_id,
          categoryId: transaction.category_id,
          type: transaction.type,
          amount: parseFloat(transaction.amount),
          description: transaction.description,
          transactionDate: transaction.transaction_date,
          notes: transaction.notes,
          createdAt: transaction.created_at,
          updatedAt: transaction.updated_at,
        },
      })
    );
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

export async function getTransactions(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const db = getDbPool();
  const { accountId, categoryId, type, startDate, endDate, page = '1', limit = '20' } = req.query;

  let query = `
    SELECT 
      t.*,
      a.name as account_name,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM wallet_transactions t
    LEFT JOIN wallet_accounts a ON t.account_id = a.id
    LEFT JOIN wallet_categories c ON t.category_id = c.id
    WHERE t.user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (accountId) {
    query += ` AND t.account_id = $${paramIndex}`;
    params.push(accountId);
    paramIndex++;
  }

  if (categoryId) {
    query += ` AND t.category_id = $${paramIndex}`;
    params.push(categoryId);
    paramIndex++;
  }

  if (type) {
    query += ` AND t.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (startDate) {
    query += ` AND t.transaction_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND t.transaction_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limitNum, offset);

  const result = await db.query(query, params);

  const transactions = result.rows.map((t) => ({
    id: t.id,
    userId: t.user_id,
    accountId: t.account_id,
    accountName: t.account_name,
    categoryId: t.category_id,
    categoryName: t.category_name,
    categoryIcon: t.category_icon,
    categoryColor: t.category_color,
    type: t.type,
    amount: parseFloat(t.amount),
    description: t.description,
    transactionDate: t.transaction_date,
    notes: t.notes,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));

  res.json(
    successResponse({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: transactions.length,
      },
    })
  );
}

export async function getTransactionById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const result = await db.query(
    `
    SELECT 
      t.*,
      a.name as account_name,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM wallet_transactions t
    LEFT JOIN wallet_accounts a ON t.account_id = a.id
    LEFT JOIN wallet_categories c ON t.category_id = c.id
    WHERE t.id = $1
  `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Transaction not found');
  }

  const t = result.rows[0];

  if (t.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this transaction');
  }

  res.json(
    successResponse({
      transaction: {
        id: t.id,
        userId: t.user_id,
        accountId: t.account_id,
        accountName: t.account_name,
        categoryId: t.category_id,
        categoryName: t.category_name,
        categoryIcon: t.category_icon,
        categoryColor: t.category_color,
        type: t.type,
        amount: parseFloat(t.amount),
        description: t.description,
        transactionDate: t.transaction_date,
        notes: t.notes,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      },
    })
  );
}

export async function updateTransaction(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM wallet_transactions WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Transaction not found');
  }

  const oldTransaction = checkResult.rows[0];

  if (oldTransaction.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this transaction');
  }

  const { categoryId, type, amount, description, transactionDate, notes } = req.body;

  // Start transaction
  await db.query('BEGIN');

  try {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    if (type !== undefined) {
      updates.push(`type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      params.push(amount);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (transactionDate !== undefined) {
      updates.push(`transaction_date = $${paramIndex}`);
      params.push(transactionDate);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      await db.query('ROLLBACK');
      throw new BadRequestError('No fields to update');
    }

    params.push(id);

    const result = await db.query(
      `UPDATE wallet_transactions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const newTransaction = result.rows[0];

    // If amount or type changed, update account balance
    if (amount !== undefined || type !== undefined) {
      const oldBalanceChange =
        oldTransaction.type === 'income' ? oldTransaction.amount : -oldTransaction.amount;
      const newAmount = amount !== undefined ? amount : oldTransaction.amount;
      const newType = type !== undefined ? type : oldTransaction.type;
      const newBalanceChange = newType === 'income' ? newAmount : -newAmount;
      const balanceDiff = newBalanceChange - oldBalanceChange;

      await db.query(
        'UPDATE wallet_accounts SET current_balance = current_balance + $1 WHERE id = $2',
        [balanceDiff, oldTransaction.account_id]
      );
    }

    await db.query('COMMIT');

    res.json(
      successResponse({
        transaction: {
          id: newTransaction.id,
          userId: newTransaction.user_id,
          accountId: newTransaction.account_id,
          categoryId: newTransaction.category_id,
          type: newTransaction.type,
          amount: parseFloat(newTransaction.amount),
          description: newTransaction.description,
          transactionDate: newTransaction.transaction_date,
          notes: newTransaction.notes,
          createdAt: newTransaction.created_at,
          updatedAt: newTransaction.updated_at,
        },
      })
    );
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

export async function deleteTransaction(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();

  const checkResult = await db.query('SELECT * FROM wallet_transactions WHERE id = $1', [id]);

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Transaction not found');
  }

  const transaction = checkResult.rows[0];

  if (transaction.user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this transaction');
  }

  // Start transaction
  await db.query('BEGIN');

  try {
    // Revert balance change
    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    await db.query(
      'UPDATE wallet_accounts SET current_balance = current_balance + $1 WHERE id = $2',
      [balanceChange, transaction.account_id]
    );

    // Delete transaction
    await db.query('DELETE FROM wallet_transactions WHERE id = $1', [id]);

    await db.query('COMMIT');

    res.json(successResponse({ message: 'Transaction deleted successfully' }));
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// ============ SUMMARY ============

export async function getAccountSummary(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDbPool();
  const { startDate, endDate } = req.query;

  // Verify account ownership
  const accountResult = await db.query('SELECT * FROM wallet_accounts WHERE id = $1', [id]);

  if (accountResult.rows.length === 0) {
    throw new NotFoundError('Account not found');
  }

  if (accountResult.rows[0].user_id.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this account');
  }

  let query = `
    SELECT 
      type,
      COUNT(*) as count,
      SUM(amount) as total
    FROM wallet_transactions
    WHERE account_id = $1
  `;
  const params: any[] = [id];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND transaction_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND transaction_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  query += ' GROUP BY type';

  const result = await db.query(query, params);

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  result.rows.forEach((row) => {
    if (row.type === 'income') {
      totalIncome = parseFloat(row.total);
      incomeCount = parseInt(row.count);
    } else if (row.type === 'expense') {
      totalExpense = parseFloat(row.total);
      expenseCount = parseInt(row.count);
    }
  });

  res.json(
    successResponse({
      summary: {
        accountId: parseInt(id),
        currentBalance: parseFloat(accountResult.rows[0].current_balance),
        totalIncome,
        totalExpense,
        incomeCount,
        expenseCount,
        netIncome: totalIncome - totalExpense,
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    })
  );
}
