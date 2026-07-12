import { mergeResolvers } from '@graphql-tools/merge';
import { healthResolvers } from './modules/common/health.resolvers';
import { walletResolvers } from './modules/wallet/wallet.resolvers';
import { expenseCategoryResolvers } from './modules/expense-category/expense-category.resolvers';
import { expenseResolvers } from './modules/expense/expense.resolvers';
import { expenseExtractionResolvers } from './modules/expense-extraction/expense-extraction.resolvers';
import { scheduledExpenseResolvers } from './modules/scheduled-expense/scheduled-expense.resolvers';
import { budgetResolvers } from './modules/budget/budget.resolvers';
import { frequencyResolvers } from './modules/frequency/frequency.resolvers';
import { periodResolvers } from './modules/period/period.resolvers';
import { shoppingResolvers } from './modules/shopping/shopping.resolvers';
import { activityResolvers } from './modules/activity/activity.resolvers';
import { habitResolvers } from './modules/habit/habit.resolvers';
import { routineResolvers } from './modules/routine/routine.resolvers';
import { weeklyRoutineResolvers } from './modules/weekly-routine/weekly-routine.resolvers';
import { todoResolvers } from './modules/todo/todo.resolvers';
import { sleepResolvers } from './modules/sleep/sleep.resolvers';
import { learningResolvers } from './modules/learning/learning.resolvers';
import { courseResolvers } from './modules/course/course.resolvers';
import { sweeterWayResolvers } from './modules/sweeter-way/sweeter-way.resolvers';
import { noteResolvers } from './modules/note/note.resolvers';
import { quarterResolvers } from './modules/quarter/quarter.resolvers';
import { userSettingsResolvers } from './modules/user-settings/user-settings.resolvers';
import { creditCardResolvers } from './modules/credit-card/credit-card.resolvers';
import { walletTransferResolvers } from './modules/wallet-transfer/wallet-transfer.resolvers';

// Merge all resolvers
export const resolvers = mergeResolvers([
  healthResolvers,
  walletResolvers,
  expenseCategoryResolvers,
  expenseResolvers,
  expenseExtractionResolvers,
  scheduledExpenseResolvers,
  budgetResolvers,
  frequencyResolvers,
  periodResolvers,
  shoppingResolvers,
  activityResolvers,
  habitResolvers,
  routineResolvers,
  weeklyRoutineResolvers,
  todoResolvers,
  sleepResolvers,
  learningResolvers,
  courseResolvers,
  sweeterWayResolvers,
  noteResolvers,
  quarterResolvers,
  userSettingsResolvers,
  creditCardResolvers,
  walletTransferResolvers,
]);
