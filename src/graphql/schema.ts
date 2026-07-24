import { gql } from 'graphql-tag';
import { scalarsTypeDefs } from './modules/common/scalars.schema';
import { healthTypeDefs } from './modules/common/health.schema';
import { walletTypeDefs } from './modules/wallet/wallet.schema';
import { expenseCategoryTypeDefs } from './modules/expense-category/expense-category.schema';
import { expenseTypeDefs } from './modules/expense/expense.schema';
import { expenseExtractionTypeDefs } from './modules/expense-extraction/expense-extraction.schema';
import { scheduledExpenseTypeDefs } from './modules/scheduled-expense/scheduled-expense.schema';
import { budgetTypeDefs } from './modules/budget/budget.schema';
import { frequencyTypeDefs } from './modules/frequency/frequency.schema';
import { periodTypeDefs } from './modules/period/period.schema';
import { shoppingTypeDefs } from './modules/shopping/shopping.schema';
import { activityTypeDefs } from './modules/activity/activity.schema';
import { habitTypeDefs } from './modules/habit/habit.schema';
import { routineTypeDefs } from './modules/routine/routine.schema';
import { weeklyRoutineTypeDefs } from './modules/weekly-routine/weekly-routine.schema';
import { todoTypeDefs } from './modules/todo/todo.schema';
import { sleepTypeDefs } from './modules/sleep/sleep.schema';
import { learningTypeDefs } from './modules/learning/learning.schema';
import { learningNoteTypeDefs } from './modules/learning-note/learning-note.schema';
import { courseTypeDefs } from './modules/course/course.schema';
import { sweeterWayTypeDefs } from './modules/sweeter-way/sweeter-way.schema';
import { noteTypeDefs } from './modules/note/note.schema';
import { quarterTypeDefs } from './modules/quarter/quarter.schema';
import { userSettingsTypeDefs } from './modules/user-settings/user-settings.schema';
import { creditCardTypeDefs } from './modules/credit-card/credit-card.schema';
import { walletTransferTypeDefs } from './modules/wallet-transfer/wallet-transfer.schema';

// Base Query and Mutation types
const baseTypeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

// Combine all type definitions
export const typeDefs = [
  baseTypeDefs,
  scalarsTypeDefs,
  healthTypeDefs,
  walletTypeDefs,
  expenseCategoryTypeDefs,
  expenseTypeDefs,
  expenseExtractionTypeDefs,
  scheduledExpenseTypeDefs,
  budgetTypeDefs,
  frequencyTypeDefs,
  periodTypeDefs,
  shoppingTypeDefs,
  activityTypeDefs,
  habitTypeDefs,
  routineTypeDefs,
  weeklyRoutineTypeDefs,
  todoTypeDefs,
  sleepTypeDefs,
  learningTypeDefs,
  learningNoteTypeDefs,
  courseTypeDefs,
  sweeterWayTypeDefs,
  noteTypeDefs,
  quarterTypeDefs,
  userSettingsTypeDefs,
  creditCardTypeDefs,
  walletTransferTypeDefs,
];
