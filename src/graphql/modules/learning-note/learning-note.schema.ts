import { gql } from 'graphql-tag';

export const learningNoteTypeDefs = gql`
  type LearningTag {
    id: ID!
    userId: Int!
    name: String!
    slug: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LearningNote {
    id: ID!
    userId: Int!
    title: String!
    contentMarkdown: String!
    tags: [LearningTag!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LearningNoteCollection {
    notes: [LearningNote!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    learningNote(id: ID!): LearningNote
    learningNotes(
      search: String
      tags: [String!]
      page: Int
      limit: Int
    ): LearningNoteCollection!
    learningTags(query: String): [LearningTag!]!
  }

  extend type Mutation {
    learningNoteAdd(input: LearningNoteInput!): LearningNote!
    learningNoteEdit(input: LearningNoteEditInput!): LearningNote!
    learningNoteRemove(id: ID!): Boolean!
    learningTagAdd(input: LearningTagInput!): LearningTag!
  }

  input LearningNoteInput {
    title: String!
    contentMarkdown: String
    tagIds: [ID!]
  }

  input LearningNoteEditInput {
    id: ID!
    title: String
    contentMarkdown: String
    tagIds: [ID!]
  }

  input LearningTagInput {
    name: String!
  }
`;
