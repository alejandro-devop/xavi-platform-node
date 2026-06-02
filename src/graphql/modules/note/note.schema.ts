import { gql } from 'graphql-tag';

export const noteTypeDefs = gql`
  type Note {
    id: ID!
    userId: Int!
    content: String!
    tags: [TodoTag!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NoteCollection {
    notes: [Note!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    note(id: ID!): Note
    notes(
      tagId: ID
      dateFrom: DateTime
      dateTo: DateTime
      page: Int
      limit: Int
    ): NoteCollection!
  }

  extend type Mutation {
    noteAdd(input: NoteInput!): Note!
    noteEdit(input: NoteEditInput!): Note!
    noteRemove(id: ID!): Boolean!
  }

  input NoteInput {
    content: String!
    tagIds: [ID!]
  }

  input NoteEditInput {
    id: ID!
    content: String
    tagIds: [ID!]
  }
`;
