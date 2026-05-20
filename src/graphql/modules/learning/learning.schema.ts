import { gql } from 'graphql-tag';

export const learningTypeDefs = gql`
  enum LearningResourceType {
    article
    video
    book
    course
    podcast
    tutorial
    other
  }

  enum LearningResourceStatus {
    not_started
    in_progress
    completed
    archived
  }

  enum LearningPriority {
    low
    medium
    high
    urgent
  }

  type LearningProgressStats {
    totalSessions: Int!
    totalTimeSpent: Int!
    currentProgress: Int!
  }

  type LearningProgressSession {
    id: ID!
    resourceId: ID!
    sessionDate: DateTime!
    durationMinutes: Int!
    notes: String
    progressPercentage: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LearningResource {
    id: ID!
    userId: Int!
    title: String!
    description: String
    resourceType: LearningResourceType!
    url: String
    category: String
    priority: LearningPriority!
    status: LearningResourceStatus!
    estimatedDurationMinutes: Int
    createdAt: DateTime!
    updatedAt: DateTime!
    progressStats: LearningProgressStats!
    progressSessions: [LearningProgressSession!]!
  }

  type LearningResourceCollection {
    resources: [LearningResource!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    learningResource(id: ID!): LearningResource
    learningResources(
      resourceType: LearningResourceType
      status: LearningResourceStatus
      priority: LearningPriority
      category: String
      page: Int
      limit: Int
    ): LearningResourceCollection!
  }

  extend type Mutation {
    learningResourceAdd(input: LearningResourceInput!): LearningResource!
    learningResourceEdit(input: LearningResourceEditInput!): LearningResource!
    learningResourceRemove(id: ID!): Boolean!
    learningProgressAdd(input: LearningProgressInput!): LearningProgressSession!
    learningProgressEdit(input: LearningProgressEditInput!): LearningProgressSession!
    learningProgressRemove(input: LearningProgressRemoveInput!): Boolean!
  }

  input LearningResourceInput {
    title: String!
    description: String
    resourceType: LearningResourceType!
    url: String
    category: String
    priority: LearningPriority
    estimatedDurationMinutes: Int
  }

  input LearningResourceEditInput {
    id: ID!
    title: String
    description: String
    resourceType: LearningResourceType
    url: String
    category: String
    priority: LearningPriority
    status: LearningResourceStatus
    estimatedDurationMinutes: Int
  }

  input LearningProgressInput {
    resourceId: ID!
    durationMinutes: Int!
    notes: String
    progressPercentage: Int
    sessionDate: DateTime
  }

  input LearningProgressEditInput {
    resourceId: ID!
    sessionId: ID!
    durationMinutes: Int
    notes: String
    progressPercentage: Int
    sessionDate: DateTime
  }

  input LearningProgressRemoveInput {
    resourceId: ID!
    sessionId: ID!
  }
`;
