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
      page: Int
      limit: Int
    ): TodoCollection!
  }

  extend type Mutation {
    todoAdd(input: TodoInput!): Todo!
    todoEdit(input: TodoEditInput!): Todo!
    todoRemove(id: ID!): Boolean!
    todoComplete(id: ID!): Todo!
    todoSubtaskAdd(input: TodoSubtaskInput!): TodoSubtask!
    todoSubtaskEdit(input: TodoSubtaskEditInput!): TodoSubtask!
    todoSubtaskRemove(input: TodoSubtaskRemoveInput!): Boolean!
  }

  input TodoInput {
    title: String!
    description: String
    status: TodoStatus
    priority: TodoPriority
    dueDate: DateTime
  }

  input TodoEditInput {
    id: ID!
    title: String
    description: String
    status: TodoStatus
    priority: TodoPriority
    dueDate: DateTime
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
