import { gql } from 'graphql-tag';

export const activityTypeDefs = gql`
  enum ActivityStatus {
    pending
    in_progress
    completed
    cancelled
  }

  enum ActivityPriority {
    low
    medium
    high
    urgent
  }

  type ActivityCategory {
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

  type ActivityFollowUp {
    id: ID!
    activityId: ID!
    userId: Int!
    date: String!
    startTime: String!
    durationMinutes: Int
    isOpen: Boolean!
    endTime: String
    endDate: String
    endDateTime: String
    notes: String
    linkedTodoId: ID
    createdAt: DateTime!
    updatedAt: DateTime!
    activity: Activity
    linkedTodo: Todo
  }

  type ActivityFollowUpsDateGroup {
    date: String!
    followUps: [ActivityFollowUp!]!
  }

  type Activity {
    id: ID!
    userId: Int!
    title: String!
    description: String
    status: ActivityStatus!
    priority: ActivityPriority!
    categoryId: ID
    scheduledDate: DateTime
    completedAt: DateTime
    spentTimeMinutes: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    category: ActivityCategory
    todoFolders: [TodoFolder!]!
    followUps(limit: Int, from: String, to: String): [ActivityFollowUp!]!
  }

  type ActivityCollection {
    activities: [Activity!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    activity(id: ID!): Activity
    activities(
      status: ActivityStatus
      priority: ActivityPriority
      categoryId: ID
      startDate: DateTime
      endDate: DateTime
      page: Int
      limit: Int
    ): ActivityCollection!
    activityCategories: [ActivityCategory!]!
    activityCategory(id: ID!): ActivityCategory
    activityFollowUp(id: ID!): ActivityFollowUp
    activityFollowUps(activityId: ID, from: String, to: String, limit: Int): [ActivityFollowUp!]!
    activityFollowUpsInDates(from: String!, to: String!): [ActivityFollowUpsDateGroup!]!
    activityDayFollowUps(date: String!): [ActivityFollowUp!]!
    activityOpenFollowUp: ActivityFollowUp
    activityPendingTodos(activityId: ID!, limit: Int): [Todo!]!
  }

  extend type Mutation {
    activityAdd(input: ActivityInput!): Activity!
    activityEdit(input: ActivityEditInput!): Activity!
    activityRemove(id: ID!): Boolean!
    activityComplete(id: ID!): Activity!
    activityCategoryAdd(input: ActivityCategoryInput!): ActivityCategory!
    activityCategoryEdit(input: ActivityCategoryEditInput!): ActivityCategory!
    activityCategoryRemove(id: ID!): Boolean!
    activityFollowUpAdd(input: ActivityFollowUpAddInput!): ActivityFollowUp!
    activityFollowUpStart(input: ActivityFollowUpStartInput!): ActivityFollowUp!
    activityFollowUpEdit(input: ActivityFollowUpEditInput!): ActivityFollowUp!
    activityFollowUpRemove(id: ID!): Boolean!
  }

  input ActivityInput {
    title: String!
    description: String
    status: ActivityStatus
    priority: ActivityPriority
    categoryId: ID
    scheduledDate: DateTime
    todoFolderIds: [ID!]
  }

  input ActivityEditInput {
    id: ID!
    title: String
    description: String
    status: ActivityStatus
    priority: ActivityPriority
    categoryId: ID
    scheduledDate: DateTime
    todoFolderIds: [ID!]
  }

  input ActivityCategoryInput {
    name: String!
    description: String
    icon: String
    color: String
    orderIndex: Int
  }

  input ActivityCategoryEditInput {
    id: ID!
    name: String
    description: String
    icon: String
    color: String
    orderIndex: Int
  }

  input ActivityFollowUpAddInput {
    activityId: ID!
    date: String!
    startTime: String!
    durationMinutes: Int!
    notes: String
  }

  input ActivityFollowUpStartInput {
    activityId: ID!
    date: String!
    startTime: String!
    notes: String
    linkedTodoId: ID
  }

  input ActivityFollowUpEditInput {
    id: ID!
    date: String
    startTime: String
    durationMinutes: Int
    notes: String
  }
`;
