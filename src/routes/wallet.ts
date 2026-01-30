import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getAccountSummary,
} from '../controllers/wallet.controller';
import {
  createAccountSchema,
  getAccountsSchema,
  getAccountSchema,
  updateAccountSchema,
  deleteAccountSchema,
  getAccountSummarySchema,
  createCategorySchema,
  getCategoriesSchema,
  updateCategorySchema,
  deleteCategorySchema,
  createTransactionSchema,
  getTransactionsSchema,
  getTransactionSchema,
  updateTransactionSchema,
  deleteTransactionSchema,
} from '../validators/wallet.validator';

const router = Router();

// All wallet routes require authentication
router.use(authMiddleware);

// ============ ACCOUNT ROUTES ============
router.post('/account', validate(createAccountSchema), asyncHandler(createAccount));
router.get('/account', validate(getAccountsSchema), asyncHandler(getAccounts));
router.get('/account/:id', validate(getAccountSchema), asyncHandler(getAccountById));
router.put('/account/:id', validate(updateAccountSchema), asyncHandler(updateAccount));
router.delete('/account/:id', validate(deleteAccountSchema), asyncHandler(deleteAccount));
router.get(
  '/account/:id/summary',
  validate(getAccountSummarySchema),
  asyncHandler(getAccountSummary)
);

// ============ CATEGORY ROUTES ============
router.post('/category', validate(createCategorySchema), asyncHandler(createCategory));
router.get('/category', validate(getCategoriesSchema), asyncHandler(getCategories));
router.put('/category/:id', validate(updateCategorySchema), asyncHandler(updateCategory));
router.delete('/category/:id', validate(deleteCategorySchema), asyncHandler(deleteCategory));

// ============ TRANSACTION ROUTES ============
router.post('/transaction', validate(createTransactionSchema), asyncHandler(createTransaction));
router.get('/transaction', validate(getTransactionsSchema), asyncHandler(getTransactions));
router.get('/transaction/:id', validate(getTransactionSchema), asyncHandler(getTransactionById));
router.put('/transaction/:id', validate(updateTransactionSchema), asyncHandler(updateTransaction));
router.delete(
  '/transaction/:id',
  validate(deleteTransactionSchema),
  asyncHandler(deleteTransaction)
);

export default router;
