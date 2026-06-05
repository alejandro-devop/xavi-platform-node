import { gql } from 'graphql-tag';

export const habitTypeDefs = gql`
  enum HabitPurposePlacement { pool want avoid }

  type HabitPurpose {
    id: ID!
    userId: Int!
    name: String!
    icon: String
    placement: HabitPurposePlacement!
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum HabitFrequency {
    daily
    weekly
    custom
  }

  enum HabitType {
    boolean
    count
    time
  }

  enum HabitStatus {
    active
    completed
    archived
  }

  enum HabitDayStatus {
    empty
    accomplished
    failed
    lifeline
  }

  type HabitCategory {
    id: ID!
    userId: Int!
    orderIndex: Int!
    name: String!
    description: String
    icon: String
    color: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type HabitMeasure {
    id: ID!
    userId: Int!
    name: String!
    abbreviation: String
    type: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Habit {
    id: ID!
    userId: Int!
    name: String!
    description: String
    frequency: HabitFrequency!
    targetCount: Int!
    icon: String
    color: String
    isActive: Boolean!
    orderIndex: Int!
    startDate: String
    endDate: String
    shouldAvoid: Boolean!
    shouldKeep: Boolean!
    habitType: HabitType!
    periodDays: Int!
    restartCount: Int!
    weeklyLifelines: Int!
    status: HabitStatus!
    days: Int!
    streak: Int!
    maxStreak: Int!
    dailyGoal: Int!
    timerGoal: Int!
    timesGoal: Int!
    step: Int
    categoryId: ID
    measureId: ID
    activityId: Int
    purposeId: ID
    createdAt: DateTime!
    updatedAt: DateTime!
    category: HabitCategory
    measure: HabitMeasure
    activity: Activity
    purpose: HabitPurpose
    logs(limit: Int, isArchived: Boolean): [HabitLog!]!
    followUps(limit: Int, isArchived: Boolean): [HabitFollowUp!]!
    stats: HabitStats!
  }

  type HabitLog {
    id: ID!
    habitId: ID!
    userId: Int!
    completedDate: String!
    count: Int!
    time: Int!
    notes: String
    story: String
    archived: Boolean!
    isAccomplished: Boolean!
    isFailed: Boolean!
    difficulty: Int
    isLifeline: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    habit: Habit
  }

  type HabitFollowUp {
    id: ID!
    habitId: ID!
    userId: Int!
    date: String!
    count: Int!
    time: Int!
    notes: String
    story: String
    archived: Boolean!
    isAccomplished: Boolean!
    isFailed: Boolean!
    difficulty: Int
    isLifeline: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    habit: Habit
  }

  type HabitStats {
    totalCompletions: Int!
    totalCount: Int!
    currentStreak: Int!
    last30Days: Int!
    streak: Int!
    maxStreak: Int!
  }

  type HabitCollection {
    habits: [Habit!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  type HabitDayEntry {
    date: String!
    status: HabitDayStatus!
    followUp: HabitFollowUp
  }

  type HabitWeekView {
    habit: Habit!
    days: [HabitDayEntry!]!
    lifelinesRemaining: Int!
  }

  type HabitMyDayEntry {
    habit: Habit!
    followUp: HabitFollowUp
    lifelinesUsedThisWeek: Int!
    lifelinesRemaining: Int!
  }

  type HabitFollowUpsDateGroup {
    date: String!
    followUps: [HabitFollowUp!]!
  }

  extend type Query {
    habitPurposes: [HabitPurpose!]!
    habitPurpose(id: ID!): HabitPurpose!
    habit(id: ID!): Habit
    habits(isActive: Boolean, status: HabitStatus, categoryId: ID, page: Int, limit: Int): HabitCollection!
    habitLogs(habitId: ID!, startDate: String, endDate: String, limit: Int, isArchived: Boolean): [HabitLog!]!
    habitStats(habitId: ID!): HabitStats!
    habitCategories: [HabitCategory!]!
    habitCategory(id: ID!): HabitCategory
    habitMeasures: [HabitMeasure!]!
    habitMeasure(id: ID!): HabitMeasure
    habitFollowUps(
      habitId: ID
      from: String
      to: String
      isArchived: Boolean
      limit: Int
    ): [HabitFollowUp!]!
    habitMyDay(date: String!): [HabitMyDayEntry!]!
    habitFollowUpsInDates(from: String!, to: String!): [HabitFollowUpsDateGroup!]!
    habitWeekView(habitId: ID!, weekStart: String!): HabitWeekView!
  }

  extend type Mutation {
    habitPurposeAdd(input: HabitPurposeInput!): HabitPurpose!
    habitPurposeEdit(input: HabitPurposeEditInput!): HabitPurpose!
    habitPurposeRemove(id: ID!): Boolean!
    habitAdd(input: HabitInput!): Habit!
    habitEdit(input: HabitEditInput!): Habit!
    habitRemove(id: ID!): Boolean!
    habitLogAdd(input: HabitLogAddInput!): HabitLog!
    habitFollowUpAdd(input: HabitFollowUpAddInput!): HabitFollowUp!
    habitFollowUpEdit(input: HabitFollowUpEditInput!): HabitFollowUp!
    habitFollowUpRemove(id: ID!): Boolean!
    habitComplete(id: ID!): Habit!
    habitCategoryAdd(input: HabitCategoryInput!): HabitCategory!
    habitCategoryEdit(input: HabitCategoryEditInput!): HabitCategory!
    habitCategoryRemove(id: ID!): Boolean!
    habitMeasureAdd(input: HabitMeasureInput!): HabitMeasure!
    habitMeasureEdit(input: HabitMeasureEditInput!): HabitMeasure!
    habitMeasureRemove(id: ID!): Boolean!
  }

  input HabitPurposeInput {
    name: String!
    icon: String
    placement: HabitPurposePlacement
    orderIndex: Int
  }

  input HabitPurposeEditInput {
    id: ID!
    name: String
    icon: String
    placement: HabitPurposePlacement
    orderIndex: Int
  }

  input HabitInput {
    name: String!
    description: String
    frequency: HabitFrequency
    targetCount: Int
    icon: String
    color: String
    categoryId: ID
    measureId: ID
    activityId: Int
    purposeId: ID
    startDate: String
    endDate: String
    shouldAvoid: Boolean
    shouldKeep: Boolean
    habitType: HabitType
    weeklyLifelines: Int
    dailyGoal: Int
    timerGoal: Int
    timesGoal: Int
    step: Int
    orderIndex: Int
  }

  input HabitEditInput {
    id: ID!
    name: String
    description: String
    frequency: HabitFrequency
    targetCount: Int
    icon: String
    color: String
    isActive: Boolean
    categoryId: ID
    measureId: ID
    activityId: Int
    purposeId: ID
    startDate: String
    endDate: String
    shouldAvoid: Boolean
    shouldKeep: Boolean
    habitType: HabitType
    weeklyLifelines: Int
    dailyGoal: Int
    timerGoal: Int
    timesGoal: Int
    step: Int
    orderIndex: Int
    status: HabitStatus
  }

  input HabitLogAddInput {
    habitId: ID!
    completedDate: String
    count: Int
    time: Int
    notes: String
    story: String
    isAccomplished: Boolean
    isFailed: Boolean
  }

  input HabitFollowUpAddInput {
    habitId: ID!
    date: String
    count: Int
    time: Int
    notes: String
    story: String
    isAccomplished: Boolean
    isFailed: Boolean
    isLifeline: Boolean
    difficulty: Int
  }

  input HabitFollowUpEditInput {
    id: ID!
    count: Int
    time: Int
    notes: String
    story: String
    isAccomplished: Boolean
    isFailed: Boolean
    archived: Boolean
    difficulty: Int
  }

  input HabitCategoryInput {
    name: String!
    description: String
    icon: String
    color: String
    orderIndex: Int
  }

  input HabitCategoryEditInput {
    id: ID!
    name: String
    description: String
    icon: String
    color: String
    orderIndex: Int
  }

  input HabitMeasureInput {
    name: String!
    abbreviation: String
    type: String
  }

  input HabitMeasureEditInput {
    id: ID!
    name: String
    abbreviation: String
    type: String
  }
`;
