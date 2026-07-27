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

  type ActivityFollowUpSubtask {
    id: ID!
    followUpId: ID!
    activitySubtaskId: ID
    title: String!
    isCompleted: Boolean!
    orderIndex: Int!
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
    """Subtareas seleccionadas para esta ejecución (progreso de sesión)."""
    sessionSubtasks: [ActivityFollowUpSubtask!]!
    sessionSubtasksCount: ActivitySubtasksCount!
  }

  type ActivityFollowUpsDateGroup {
    date: String!
    followUps: [ActivityFollowUp!]!
  }

  type ActivitySubtask {
    id: ID!
    activityId: ID!
    title: String!
    isCompleted: Boolean!
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ActivitySubtasksCount {
    total: Int!
    completed: Int!
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
    subtasks: [ActivitySubtask!]!
    subtasksCount: ActivitySubtasksCount!
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
    activityFollowUpSubtaskEdit(input: ActivityFollowUpSubtaskEditInput!): ActivityFollowUpSubtask!
    """Añade una subtarea a un follow-up abierto (persiste en la Activity y en la sesión)."""
    activityFollowUpSubtaskAdd(input: ActivityFollowUpSubtaskAddInput!): ActivityFollowUpSubtask!
    activitySubtaskAdd(input: ActivitySubtaskInput!): ActivitySubtask!
    activitySubtaskEdit(input: ActivitySubtaskEditInput!): ActivitySubtask!
    activitySubtaskRemove(input: ActivitySubtaskRemoveInput!): Boolean!
  }

  input ActivityFollowUpSubtaskEditInput {
    followUpId: ID!
    sessionSubtaskId: ID!
    isCompleted: Boolean!
  }

  input ActivityFollowUpSubtaskAddInput {
    followUpId: ID!
    title: String!
  }

  input ActivitySubtaskInput {
    activityId: ID!
    title: String!
    orderIndex: Int
  }

  input ActivitySubtaskEditInput {
    activityId: ID!
    subtaskId: ID!
    title: String
    isCompleted: Boolean
    orderIndex: Int
  }

  input ActivitySubtaskRemoveInput {
    activityId: ID!
    subtaskId: ID!
  }

  input ActivityInput {
    title: String!
    description: String
    status: ActivityStatus
    priority: ActivityPriority
    categoryId: ID
    scheduledDate: DateTime
    todoFolderIds: [ID!]
    """Marca la actividad como plantilla de entrenamiento."""
    isWorkout: Boolean
    """IDs de ejercicios del catálogo (plantilla sugerida al iniciar)."""
    workoutExerciseIds: [ID!]
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
    isWorkout: Boolean
    workoutExerciseIds: [ID!]
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
    """UUID v7 del cliente para idempotencia offline."""
    clientId: ID
  }

  input ActivityFollowUpStartInput {
    activityId: ID!
    date: String!
    startTime: String!
    notes: String
    linkedTodoId: ID
    """UUID v7 del cliente para idempotencia offline."""
    clientId: ID
    """IDs de subtareas de la actividad a incluir en esta ejecución."""
    subtaskIds: [ID!]
  }

  input ActivityFollowUpEditInput {
    id: ID!
    date: String
    startTime: String
    durationMinutes: Int
    notes: String
  }
`;
