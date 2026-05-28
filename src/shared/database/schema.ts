import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  varchar,
  decimal,
  boolean,
  timestamp,
  text,
  date,
  serial,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateUuidV7 } from './uuid';

// ============================================
// USERS TABLE (reference)
// ============================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  isAccountVerified: boolean('is_account_verified').notNull().default(false),
  isPendingDeletion: boolean('is_pending_deletion').notNull().default(false),
  verificationCode: varchar('verification_code', { length: 255 }),
  verificationCodeExpiresAt: timestamp('verification_code_expires_at'),
  otpLastSentAt: timestamp('otp_last_sent_at'),
  passwordResetCode: varchar('password_reset_code', { length: 255 }),
  passwordResetCodeExpiresAt: timestamp('password_reset_code_expires_at'),
  passwordResetOtpLastSentAt: timestamp('password_reset_otp_last_sent_at'),
  accountDeletionCode: varchar('account_deletion_code', { length: 255 }),
  accountDeletionCodeExpiresAt: timestamp('account_deletion_code_expires_at'),
  accountDeletionOtpLastSentAt: timestamp('account_deletion_otp_last_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// WALLET WALLETS
// ============================================
export const walletWallets = pgTable('wallet_wallets', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
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
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
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
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
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
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
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
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
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
// WALLET BUDGET CLOSURES
// ============================================
export const walletBudgetClosures = pgTable('wallet_budget_closures', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => walletBudgets.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  plannedAmount: decimal('planned_amount', { precision: 15, scale: 2 }).notNull(),
  spentAmount: decimal('spent_amount', { precision: 15, scale: 2 }).notNull(),
  remainingAmount: decimal('remaining_amount', { precision: 15, scale: 2 }).notNull(),
  overspentAmount: decimal('overspent_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  expensesCount: integer('expenses_count').notNull().default(0),
  notes: text('notes'),
  closedAt: timestamp('closed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// WALLET EXPENSES
// ============================================
export const walletExpenses = pgTable('wallet_expenses', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  walletId: uuid('wallet_id')
    .notNull()
    .references(() => walletWallets.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => walletExpenseCategories.id, {
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
// WALLET SCHEDULED EXPENSES
// ============================================
export const walletScheduledExpenses = pgTable('wallet_scheduled_expenses', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  walletId: uuid('wallet_id')
    .notNull()
    .references(() => walletWallets.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => walletExpenseCategories.id, {
    onDelete: 'set null',
  }),
  budgetId: uuid('budget_id').references(() => walletBudgets.id, { onDelete: 'set null' }),
  parentId: uuid('parent_id').references((): any => walletScheduledExpenses.id, {
    onDelete: 'cascade',
  }),
  expenseId: uuid('expense_id').references(() => walletExpenses.id, {
    onDelete: 'set null',
  }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  dueDate: date('due_date').notNull(),
  isPaid: boolean('is_paid').notNull().default(false),
  paidDate: timestamp('paid_date'),
  repeatType: varchar('repeat_type', { length: 20 }).$type<
    'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  >(),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// SHOPPING LISTS & CATALOG ITEMS
// ============================================
export const shoppingLists = pgTable('shopping_lists', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const items = pgTable('items', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shoppingListItems = pgTable('shopping_list_items', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => generateUuidV7()),
  shoppingListId: uuid('shopping_list_id')
    .notNull()
    .references(() => shoppingLists.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  price: decimal('price', { precision: 15, scale: 2 }),
  quantity: decimal('quantity', { precision: 15, scale: 2 }).notNull().default('1'),
  isPurchased: boolean('is_purchased').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
  user: one(users, {
    fields: [shoppingLists.userId],
    references: [users.id],
  }),
  listItems: many(shoppingListItems),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.id],
  }),
  shoppingListItems: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  shoppingList: one(shoppingLists, {
    fields: [shoppingListItems.shoppingListId],
    references: [shoppingLists.id],
  }),
  item: one(items, {
    fields: [shoppingListItems.itemId],
    references: [items.id],
  }),
}));

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

export const walletScheduledExpensesRelations = relations(walletScheduledExpenses, ({ one }) => ({
  user: one(users, {
    fields: [walletScheduledExpenses.userId],
    references: [users.id],
  }),
  wallet: one(walletWallets, {
    fields: [walletScheduledExpenses.walletId],
    references: [walletWallets.id],
  }),
  category: one(walletExpenseCategories, {
    fields: [walletScheduledExpenses.categoryId],
    references: [walletExpenseCategories.id],
  }),
  budget: one(walletBudgets, {
    fields: [walletScheduledExpenses.budgetId],
    references: [walletBudgets.id],
  }),
  parent: one(walletScheduledExpenses, {
    fields: [walletScheduledExpenses.parentId],
    references: [walletScheduledExpenses.id],
    relationName: 'parentChild',
  }),
  expense: one(walletExpenses, {
    fields: [walletScheduledExpenses.expenseId],
    references: [walletExpenses.id],
  }),
}));

export const walletBudgetClosuresRelations = relations(walletBudgetClosures, ({ one }) => ({
  budget: one(walletBudgets, {
    fields: [walletBudgetClosures.budgetId],
    references: [walletBudgets.id],
  }),
  user: one(users, {
    fields: [walletBudgetClosures.userId],
    references: [users.id],
  }),
}));

// ============================================
// SWEETER WAY MODULE
// ============================================

export const swBondStatusEnum = pgEnum('sw_bond_status', ['pending', 'accepted', 'rejected', 'dissolved']);
export const swListCategoryEnum = pgEnum('sw_list_category', ['restaurant', 'travel', 'outdoor', 'entertainment', 'culture', 'other']);
export const swItemStatusEnum = pgEnum('sw_item_status', ['pending', 'completed']);
export const swNotificationTypeEnum = pgEnum('sw_notification_type', ['bond_requested', 'bond_accepted', 'item_added', 'item_completed', 'log_added']);
export const swEntityTypeEnum = pgEnum('sw_entity_type', ['bond', 'list', 'item', 'log']);

export const swCinnamonBonds = pgTable('sw_cinnamon_bonds', {
  id: uuid('id').primaryKey().$defaultFn(() => generateUuidV7()),
  requesterId: integer('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addresseeId: integer('addressee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: swBondStatusEnum('status').notNull().default('pending'),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const swLists = pgTable('sw_lists', {
  id: uuid('id').primaryKey().$defaultFn(() => generateUuidV7()),
  bondId: uuid('bond_id').notNull().references(() => swCinnamonBonds.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  category: swListCategoryEnum('category').notNull().default('other'),
  createdBy: integer('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const swListItems = pgTable('sw_list_items', {
  id: uuid('id').primaryKey().$defaultFn(() => generateUuidV7()),
  listId: uuid('list_id').notNull().references(() => swLists.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  address: text('address'),
  url: text('url'),
  status: swItemStatusEnum('status').notNull().default('pending'),
  completedAt: timestamp('completed_at'),
  addedBy: integer('added_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating'),
  wouldReturn: boolean('would_return'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const swItemLogs = pgTable('sw_item_logs', {
  id: uuid('id').primaryKey().$defaultFn(() => generateUuidV7()),
  itemId: uuid('item_id').notNull().references(() => swListItems.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  comment: text('comment'),
  liked: boolean('liked'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const swNotifications = pgTable('sw_notifications', {
  id: uuid('id').primaryKey().$defaultFn(() => generateUuidV7()),
  recipientId: integer('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorId: integer('actor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: swNotificationTypeEnum('type').notNull(),
  entityType: swEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  readAt: timestamp('read_at'),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const swUserPreferences = pgTable('sw_user_preferences', {
  id: uuid('id').primaryKey().$defaultFn(() => generateUuidV7()),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  emailNotifications: boolean('email_notifications').notNull().default(true),
  inAppNotifications: boolean('in_app_notifications').notNull().default(true),
  pushToken: text('push_token'),
  pushNotificationsEnabled: boolean('push_notifications_enabled').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
