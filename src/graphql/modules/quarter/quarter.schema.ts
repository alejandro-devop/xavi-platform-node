import { gql } from 'graphql-tag';

export const quarterTypeDefs = gql`
  enum ProjectStatus {
    active
    paused
    completed
    archived
  }

  enum ObjectiveStatus {
    pending
    in_progress
    completed
  }

  enum QuarterStatus {
    planning
    active
    completed
  }

  enum ProjectMemberRole {
    owner
    editor
  }

  type ProjectObjective {
    id: ID!
    projectId: ID!
    title: String!
    description: String
    status: ObjectiveStatus!
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProjectMember {
    id: ID!
    projectId: ID!
    userId: Int!
    role: ProjectMemberRole!
    invitedAt: DateTime!
    acceptedAt: DateTime
  }

  type Project {
    id: ID!
    userId: Int!
    name: String!
    description: String
    priority: Int!
    status: ProjectStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
    objectives: [ProjectObjective!]!
    members: [ProjectMember!]!
  }

  type QuarterProject {
    id: ID!
    quarterId: ID!
    projectId: ID!
    weeklyHours: Float!
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project!
  }

  type Quarter {
    id: ID!
    userId: Int!
    name: String!
    startDate: DateTime!
    endDate: DateTime!
    status: QuarterStatus!
    retrospectiveNotes: String
    summaryNotes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    projects: [QuarterProject!]!
  }

  type SessionLog {
    id: ID!
    quarterId: ID!
    projectId: ID!
    userId: Int!
    sessionDate: DateTime!
    weekStartDate: DateTime!
    content: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project
  }

  type WeekScheduleSlot {
    id: ID!
    quarterId: ID!
    projectId: ID!
    userId: Int!
    dayOfWeek: String!
    startTime: String
    hours: Float!
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project
  }

  extend type Query {
    projects: [Project!]!
    project(id: ID!): Project!
    quarters: [Quarter!]!
    quarter(id: ID!): Quarter!
    activeQuarter: Quarter
    sessionLogs(quarterId: ID!, projectId: ID): [SessionLog!]!
    projectSessionLogs(projectId: ID!): [SessionLog!]!
    weekScheduleSlots(quarterId: ID!): [WeekScheduleSlot!]!
  }

  extend type Mutation {
    projectAdd(input: ProjectAddInput!): Project!
    projectEdit(input: ProjectEditInput!): Project!
    projectRemove(id: ID!): Boolean!

    projectObjectiveAdd(input: ObjectiveAddInput!): ProjectObjective!
    projectObjectiveEdit(input: ObjectiveEditInput!): ProjectObjective!
    projectObjectiveRemove(id: ID!): Boolean!

    quarterAdd(input: QuarterAddInput!): Quarter!
    quarterEdit(input: QuarterEditInput!): Quarter!
    quarterActivate(id: ID!): Quarter!
    quarterComplete(input: QuarterCompleteInput!): Quarter!

    quarterProjectAdd(input: QuarterProjectAddInput!): QuarterProject!
    quarterProjectEdit(input: QuarterProjectEditInput!): QuarterProject!
    quarterProjectRemove(id: ID!): Boolean!

    sessionLogAdd(input: SessionLogAddInput!): SessionLog!
    sessionLogEdit(input: SessionLogEditInput!): SessionLog!
    sessionLogRemove(id: ID!): Boolean!

    weekScheduleSlotAdd(input: WeekScheduleSlotAddInput!): WeekScheduleSlot!
    weekScheduleSlotEdit(input: WeekScheduleSlotEditInput!): WeekScheduleSlot!
    weekScheduleSlotRemove(id: ID!): Boolean!
  }

  input ProjectAddInput {
    name: String!
    description: String
    priority: Int
    status: ProjectStatus
  }

  input ProjectEditInput {
    id: ID!
    name: String
    description: String
    priority: Int
    status: ProjectStatus
  }

  input ObjectiveAddInput {
    projectId: ID!
    title: String!
    description: String
    orderIndex: Int
  }

  input ObjectiveEditInput {
    id: ID!
    title: String
    description: String
    status: ObjectiveStatus
    orderIndex: Int
  }

  input QuarterAddInput {
    name: String!
    startDate: String!
    endDate: String!
  }

  input QuarterEditInput {
    id: ID!
    name: String
    startDate: String
    endDate: String
    retrospectiveNotes: String
    summaryNotes: String
  }

  input QuarterCompleteInput {
    id: ID!
    retrospectiveNotes: String
    summaryNotes: String
  }

  input QuarterProjectAddInput {
    quarterId: ID!
    projectId: ID!
    weeklyHours: Float!
  }

  input QuarterProjectEditInput {
    id: ID!
    weeklyHours: Float!
  }

  input SessionLogAddInput {
    quarterId: ID!
    projectId: ID!
    sessionDate: String!
    content: String!
  }

  input SessionLogEditInput {
    id: ID!
    content: String
  }

  input WeekScheduleSlotAddInput {
    quarterId: ID!
    projectId: ID!
    dayOfWeek: String!
    startTime: String
    hours: Float!
    notes: String
  }

  input WeekScheduleSlotEditInput {
    id: ID!
    startTime: String
    hours: Float
    notes: String
  }
`;
