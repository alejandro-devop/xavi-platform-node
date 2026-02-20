import {
  pgTable,
  uuid,
  integer,
  varchar,
  decimal,
  boolean,
  timestamp,
  text,
  date,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// USERS TABLE (reference)
// ============================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// WALLET WALLETS
// ============================================
export const walletWallets = pgTable('wallet_wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  initialBalance: decimal('initial_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  isMain: boolean('is_main').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// WALLET EXPENSE CATEGORIES
// ============================================
export const walletExpenseCategories = pgTable('wallet_expense_categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().$type<'income' | 'expense'>(),
  color: varchar('color', { length: 7 }),
  icon: varchar('icon', { length: 50 }),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  isTransaction: boolean('is_transaction').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// WALLET FREQUENCIES
// ============================================
export const walletFrequencies = pgTable('wallet_frequencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  frequencyType: varchar('frequency_type', { length: 50 }).notNull(), // 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// WALLET PERIODS
// ============================================
export const walletPeriods = pgTable('wallet_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// WALLET BUDGETS
// ============================================
export const walletBudgets = pgTable('wallet_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  walletId: uuid('wallet_id').references(() => walletWallets.id, { onDelete: 'cascade' }),
  frequencyId: uuid('frequency_id').references(() => walletFrequencies.id, {
    onDelete: 'set null',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// WALLET EXPENSES
// ============================================
export const walletExpenses = pgTable('wallet_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  walletId: uuid('wallet_id')
    .notNull()
    .references(() => walletWallets.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => walletExpenseCategories.id, {
    onDelete: 'set null',
  }),
  budgetId: uuid('budget_id').references(() => walletBudgets.id, { onDelete: 'set null' }),
  date: date('date').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  debit: decimal('debit', { precision: 15, scale: 2 }).notNull().default('0'),
  credit: decimal('credit', { precision: 15, scale: 2 }).notNull().default('0'),
  isIncome: boolean('is_income').notNull().default(false),
  isOutcome: boolean('is_outcome').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// RELATIONS (Optional - for query convenience)
// ============================================
export const walletWalletsRelations = relations(walletWallets, ({ one, many }) => ({
  user: one(users, {
    fields: [walletWallets.userId],
    references: [users.id],
  }),
  expenses: many(walletExpenses),
  budgets: many(walletBudgets),
}));

export const walletExpensesRelations = relations(walletExpenses, ({ one }) => ({
  user: one(users, {
    fields: [walletExpenses.userId],
    references: [users.id],
  }),
  wallet: one(walletWallets, {
    fields: [walletExpenses.walletId],
    references: [walletWallets.id],
  }),
  category: one(walletExpenseCategories, {
    fields: [walletExpenses.categoryId],
    references: [walletExpenseCategories.id],
  }),
  budget: one(walletBudgets, {
    fields: [walletExpenses.budgetId],
    references: [walletBudgets.id],
  }),
}));
