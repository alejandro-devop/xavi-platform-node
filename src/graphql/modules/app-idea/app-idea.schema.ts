import { gql } from 'graphql-tag';

export const appIdeaTypeDefs = gql`
  enum AppIdeaStatus {
    draft
    exploring
    building
    shipped
    archived
  }

  type AppIdea {
    id: ID!
    userId: Int!
    title: String!
    contentMarkdown: String!
    status: AppIdeaStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AppIdeaCollection {
    ideas: [AppIdea!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    appIdea(id: ID!): AppIdea
    appIdeas(
      search: String
      status: AppIdeaStatus
      page: Int
      limit: Int
    ): AppIdeaCollection!
  }

  extend type Mutation {
    appIdeaAdd(input: AppIdeaInput!): AppIdea!
    appIdeaEdit(input: AppIdeaEditInput!): AppIdea!
    appIdeaRemove(id: ID!): Boolean!
  }

  input AppIdeaInput {
    title: String!
    contentMarkdown: String
    status: AppIdeaStatus
  }

  input AppIdeaEditInput {
    id: ID!
    title: String
    contentMarkdown: String
    status: AppIdeaStatus
  }
`;
