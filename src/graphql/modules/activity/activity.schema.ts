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

  type Activity {
    id: ID!
    userId: Int!
    title: String!
    description: String
    status: ActivityStatus!
    priority: ActivityPriority!
    scheduledDate: DateTime
    completedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
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
      startDate: DateTime
      endDate: DateTime
      page: Int
      limit: Int
    ): ActivityCollection!
  }

  extend type Mutation {
    activityAdd(input: ActivityInput!): Activity!
    activityEdit(input: ActivityEditInput!): Activity!
    activityRemove(id: ID!): Boolean!
    activityComplete(id: ID!): Activity!
  }

  input ActivityInput {
    title: String!
    description: String
    status: ActivityStatus
    priority: ActivityPriority
    scheduledDate: DateTime
  }

  input ActivityEditInput {
    id: ID!
    title: String
    description: String
    status: ActivityStatus
    priority: ActivityPriority
    scheduledDate: DateTime
  }
`;
