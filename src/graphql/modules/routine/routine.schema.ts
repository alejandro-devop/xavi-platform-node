import { gql } from 'graphql-tag';

export const routineTypeDefs = gql`
  enum RoutineTimeOfDay {
    morning
    afternoon
    evening
    night
    anytime
  }

  enum DayOfWeek {
    monday
    tuesday
    wednesday
    thursday
    friday
    saturday
    sunday
  }

  type RoutineStep {
    id: ID!
    routineId: ID!
    title: String!
    description: String
    durationMinutes: Int
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Routine {
    id: ID!
    userId: Int!
    name: String!
    description: String
    daysOfWeek: [DayOfWeek!]!
    timeOfDay: RoutineTimeOfDay!
    isActive: Boolean!
    stepsCount: Int
    totalDuration: Int
    createdAt: DateTime!
    updatedAt: DateTime!
    steps: [RoutineStep!]!
  }

  type RoutineCollection {
    routines: [Routine!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    routine(id: ID!): Routine
    routines(
      isActive: Boolean
      timeOfDay: RoutineTimeOfDay
      dayOfWeek: DayOfWeek
      page: Int
      limit: Int
    ): RoutineCollection!
  }

  extend type Mutation {
    routineAdd(input: RoutineInput!): Routine!
    routineEdit(input: RoutineEditInput!): Routine!
    routineRemove(id: ID!): Boolean!
    routineSetActive(id: ID!): Routine!
    routineToggleActive(id: ID!): Routine!
    routineStepAdd(input: RoutineStepInput!): RoutineStep!
    routineStepEdit(input: RoutineStepEditInput!): RoutineStep!
    routineStepRemove(input: RoutineStepRemoveInput!): Boolean!
  }

  input RoutineInput {
    name: String!
    description: String
    daysOfWeek: [DayOfWeek!]
    timeOfDay: RoutineTimeOfDay
  }

  input RoutineEditInput {
    id: ID!
    name: String
    description: String
    daysOfWeek: [DayOfWeek!]
    timeOfDay: RoutineTimeOfDay
    isActive: Boolean
  }

  input RoutineStepInput {
    routineId: ID!
    title: String!
    description: String
    durationMinutes: Int
    orderIndex: Int
  }

  input RoutineStepEditInput {
    routineId: ID!
    stepId: ID!
    title: String
    description: String
    durationMinutes: Int
    orderIndex: Int
  }

  input RoutineStepRemoveInput {
    routineId: ID!
    stepId: ID!
  }
`;
