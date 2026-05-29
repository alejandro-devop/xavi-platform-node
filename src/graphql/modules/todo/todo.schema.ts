import { gql } from 'graphql-tag';

export const todoTypeDefs = gql`
  enum TodoStatus {
    pending
    in_progress
    completed
    cancelled
  }

  enum TodoPriority {
    low
    medium
    high
    urgent
  }

  type TodoSubtask {
    id: ID!
    todoId: ID!
    title: String!
    isCompleted: Boolean!
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TodoSubtasksCount {
    total: Int!
    completed: Int!
  }

  type TodoTag {
    id: ID!
    userId: Int!
    name: String!
    color: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TodoFolder {
    id: ID!
    userId: Int!
    name: String!
    color: String!
    orderIndex: Int!
    todoCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Todo {
    id: ID!
    userId: Int!
    title: String!
    description: String
    status: TodoStatus!
    priority: TodoPriority!
    dueDate: DateTime
    completedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    subtasks: [TodoSubtask!]!
    subtasksCount: TodoSubtasksCount!
    tags: [TodoTag!]!
    folderId: ID
    folder: TodoFolder
    orderIndex: Int!
  }

  type TodoCollection {
    todos: [Todo!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    todo(id: ID!): Todo
    todos(
      status: TodoStatus
      priority: TodoPriority
      dueBefore: DateTime
      dueAfter: DateTime
      tagId: ID
      folderId: ID
      withoutFolder: Boolean
      page: Int
      limit: Int
    ): TodoCollection!
    todoTags: [TodoTag!]!
    todoTag(id: ID!): TodoTag
    todoFolders: [TodoFolder!]!
    todoFolder(id: ID!): TodoFolder
  }

  extend type Mutation {
    todoAdd(input: TodoInput!): Todo!
    todoEdit(input: TodoEditInput!): Todo!
    todoRemove(id: ID!): Boolean!
    todoComplete(id: ID!): Todo!
    todoSubtaskAdd(input: TodoSubtaskInput!): TodoSubtask!
    todoSubtaskEdit(input: TodoSubtaskEditInput!): TodoSubtask!
    todoSubtaskRemove(input: TodoSubtaskRemoveInput!): Boolean!
    todoTagAdd(input: TodoTagInput!): TodoTag!
    todoTagEdit(input: TodoTagEditInput!): TodoTag!
    todoTagRemove(id: ID!): Boolean!
    todoFolderAdd(input: TodoFolderInput!): TodoFolder!
    todoFolderEdit(input: TodoFolderEditInput!): TodoFolder!
    todoFolderRemove(id: ID!): Boolean!
    todoReorder(input: TodoReorderInput!): [Todo!]!
  }

  input TodoInput {
    title: String!
    description: String
    status: TodoStatus
    priority: TodoPriority
    dueDate: DateTime
    tagIds: [ID!]
    folderId: ID
    orderIndex: Int
  }

  input TodoReorderInput {
    folderId: ID
    todoIds: [ID!]!
  }

  input TodoEditInput {
    id: ID!
    title: String
    description: String
    status: TodoStatus
    priority: TodoPriority
    dueDate: DateTime
    tagIds: [ID!]
    folderId: ID
    orderIndex: Int
  }

  input TodoFolderInput {
    name: String!
    color: String!
    orderIndex: Int
  }

  input TodoFolderEditInput {
    id: ID!
    name: String
    color: String
    orderIndex: Int
  }

  input TodoTagInput {
    name: String!
    color: String!
  }

  input TodoTagEditInput {
    id: ID!
    name: String
    color: String
  }

  input TodoSubtaskInput {
    todoId: ID!
    title: String!
    orderIndex: Int
  }

  input TodoSubtaskEditInput {
    todoId: ID!
    subtaskId: ID!
    title: String
    isCompleted: Boolean
    orderIndex: Int
  }

  input TodoSubtaskRemoveInput {
    todoId: ID!
    subtaskId: ID!
  }
`;
