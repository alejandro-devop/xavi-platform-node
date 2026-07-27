import { gql } from 'graphql-tag';

export const activityDayPlanTypeDefs = gql`
  type ActivityDayPlanItem {
    id: ID!
    userId: Int!
    activityId: ID!
    """
    Fecha local del plan, formato YYYY-MM-DD.
    """
    date: String!
    """
    Hora local de inicio, formato HH:mm.
    """
    startTime: String!
    """
    Hora local de fin, formato HH:mm.
    """
    endTime: String!
    orderIndex: Int!
    completedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    activity: Activity!
  }

  extend type Query {
    activityDayPlan(date: String!): [ActivityDayPlanItem!]!
  }

  extend type Mutation {
    """
    Reemplaza (atómicamente) el plan del día indicado con los ítems dados.
    """
    activityDayPlanSet(input: ActivityDayPlanSetInput!): [ActivityDayPlanItem!]!
    """
    Añade un ítem al plan del día sin reemplazar el resto (p. ej. Tomar desde Vida).
    """
    activityDayPlanItemAdd(input: ActivityDayPlanItemAddInput!): ActivityDayPlanItem!
    activityDayPlanItemEdit(input: ActivityDayPlanItemEditInput!): ActivityDayPlanItem!
    activityDayPlanItemRemove(input: ActivityDayPlanItemRemoveInput!): Boolean!
  }

  input ActivityDayPlanSetInput {
    date: String!
    items: [ActivityDayPlanSetItemInput!]!
  }

  input ActivityDayPlanSetItemInput {
    activityId: ID!
    startTime: String!
    endTime: String!
    orderIndex: Int
    """UUID v7 del cliente para idempotencia offline."""
    clientId: ID
  }

  input ActivityDayPlanItemAddInput {
    date: String!
    activityId: ID!
    startTime: String!
    endTime: String!
    orderIndex: Int
    """UUID v7 del cliente para idempotencia offline."""
    clientId: ID
  }

  input ActivityDayPlanItemEditInput {
    itemId: ID!
    startTime: String
    endTime: String
    orderIndex: Int
    isCompleted: Boolean
  }

  input ActivityDayPlanItemRemoveInput {
    itemId: ID!
  }
`;
