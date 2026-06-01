import { gql } from 'graphql-tag';

export const weeklyRoutineTypeDefs = gql`
  type WeeklyRoutineActivity {
    id: ID!
    routineId: ID!
    activityId: ID!
    dayOfWeek: DayOfWeek!
    startTime: String!
    durationMinutes: Int!
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    activity: Activity
  }

  type WeeklyRoutineDaySchedule {
    dayOfWeek: DayOfWeek!
    activities: [WeeklyRoutineActivity!]!
  }

  type WeeklyRoutine {
    id: ID!
    userId: Int!
    name: String!
    description: String
    startDay: DayOfWeek!
    isActive: Boolean!
    dayStartTime: String!
    dayEndTime: String!
    activitiesCount: Int
    createdAt: DateTime!
    updatedAt: DateTime!
    schedule: [WeeklyRoutineDaySchedule!]
  }

  type WeeklyRoutineCollection {
    routines: [WeeklyRoutine!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    weeklyRoutine(id: ID!): WeeklyRoutine
    weeklyRoutines(isActive: Boolean, page: Int, limit: Int): WeeklyRoutineCollection!
    weeklyRoutineActive: WeeklyRoutine
  }

  extend type Mutation {
    weeklyRoutineAdd(input: WeeklyRoutineInput!): WeeklyRoutine!
    weeklyRoutineEdit(input: WeeklyRoutineEditInput!): WeeklyRoutine!
    weeklyRoutineRemove(id: ID!): Boolean!
    weeklyRoutineSetActive(id: ID!): WeeklyRoutine!
    weeklyRoutineToggleActive(id: ID!): WeeklyRoutine!
    weeklyRoutineActivityAdd(input: WeeklyRoutineActivityInput!): WeeklyRoutineActivity!
    weeklyRoutineActivityBatchAdd(input: WeeklyRoutineActivityBatchInput!): [WeeklyRoutineActivity!]!
    weeklyRoutineActivityEdit(input: WeeklyRoutineActivityEditInput!): WeeklyRoutineActivity!
    weeklyRoutineActivityRemove(id: ID!): Boolean!
  }

  input WeeklyRoutineInput {
    name: String!
    description: String
    startDay: DayOfWeek
    dayStartTime: String
    dayEndTime: String
  }

  input WeeklyRoutineEditInput {
    id: ID!
    name: String
    description: String
    startDay: DayOfWeek
    dayStartTime: String
    dayEndTime: String
  }

  input WeeklyRoutineActivityInput {
    routineId: ID!
    activityId: ID!
    dayOfWeek: DayOfWeek!
    startTime: String!
    durationMinutes: Int!
    notes: String
  }

  input WeeklyRoutineActivityBatchInput {
    routineId: ID!
    activityId: ID!
    days: [DayOfWeek!]!
    startTime: String!
    durationMinutes: Int!
    notes: String
  }

  input WeeklyRoutineActivityEditInput {
    id: ID!
    dayOfWeek: DayOfWeek
    startTime: String
    durationMinutes: Int
    notes: String
  }
`;
