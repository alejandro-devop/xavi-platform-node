import { gql } from 'graphql-tag';

export const standupTypeDefs = gql`
  enum StandupDayStatus {
    open
    closed
  }

  enum StandupItemStatus {
    pending
    in_progress
    completed
    blocked
  }

  type StandupMember {
    id: ID!
    userId: Int!
    name: String!
    isActive: Boolean!
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type StandupDay {
    id: ID!
    userId: Int!
    """
    Fecha civil local YYYY-MM-DD.
    """
    date: String!
    status: StandupDayStatus!
    openedAt: DateTime!
    closedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type StandupItem {
    id: ID!
    userId: Int!
    dayId: ID!
    memberId: ID!
    title: String!
    notes: String
    ticketNumber: String
    status: StandupItemStatus!
    blockedReason: String
    """
    Primera fecha civil en la que entró al backlog (se preserva al arrastrar de ayer).
    """
    backlogStartedOn: String!
    """
    Días en backlog respecto a la fecha del día del ítem.
    """
    daysInBacklog: Int!
    sourceItemId: ID
    linkedTodoId: ID
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    member: StandupMember
    linkedTodo: Todo
  }

  type StandupDayView {
    day: StandupDay
    items: [StandupItem!]!
    """
    Ítems no completados del día civil anterior (solo si el día actual está abierto).
    """
    carryOverCandidates: [StandupItem!]!
  }

  type StandupSummaryMemberGroup {
    memberId: ID!
    memberName: String!
    items: [StandupItem!]!
  }

  type StandupDaySummary {
    date: String!
    groups: [StandupSummaryMemberGroup!]!
    """
    Texto en Markdown listo para copiar y pegar (Slack/PM), con sección de bloqueadores aparte.
    """
    text: String!
  }

  type StandupWeekEntry {
    date: String!
    day: StandupDay
    items: [StandupItem!]!
  }

  extend type Query {
    standupMembers(includeInactive: Boolean): [StandupMember!]!
    standupDay(date: String!): StandupDayView!
    standupDaySummary(date: String!): StandupDaySummary!
    """
    Últimos N días hábiles (lun-vie) terminando en endDate, para detectar ítems repetidos entre días.
    """
    standupWeek(endDate: String!, days: Int): [StandupWeekEntry!]!
  }

  extend type Mutation {
    standupMemberCreate(input: StandupMemberCreateInput!): StandupMember!
    standupMemberUpdate(input: StandupMemberUpdateInput!): StandupMember!
    standupMemberDelete(input: StandupMemberDeleteInput!): Boolean!
    standupOpenDay(input: StandupDateInput!): StandupDayView!
    standupCloseDay(input: StandupDateInput!): StandupDay!
    standupCarryOver(input: StandupCarryOverInput!): [StandupItem!]!
    standupItemCreate(input: StandupItemCreateInput!): StandupItem!
    standupItemUpdate(input: StandupItemUpdateInput!): StandupItem!
    standupItemDelete(input: StandupItemDeleteInput!): Boolean!
    standupItemCreateTodo(input: StandupItemCreateTodoInput!): Todo!
  }

  input StandupDateInput {
    date: String!
  }

  input StandupMemberCreateInput {
    name: String!
    orderIndex: Int
  }

  input StandupMemberUpdateInput {
    id: ID!
    name: String
    isActive: Boolean
    orderIndex: Int
  }

  input StandupMemberDeleteInput {
    id: ID!
  }

  input StandupItemCreateInput {
    date: String!
    memberId: ID!
    title: String!
    notes: String
    ticketNumber: String
    status: StandupItemStatus
    blockedReason: String
    orderIndex: Int
  }

  input StandupItemUpdateInput {
    id: ID!
    memberId: ID
    title: String
    notes: String
    ticketNumber: String
    status: StandupItemStatus
    blockedReason: String
    orderIndex: Int
  }

  input StandupItemDeleteInput {
    id: ID!
  }

  input StandupCarryOverInput {
    date: String!
    itemIds: [ID!]!
  }

  input StandupItemCreateTodoInput {
    itemId: ID!
  }
`;
