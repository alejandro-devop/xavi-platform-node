import { gql } from 'graphql-tag';

export const vidaTypeDefs = gql`
  """
  Días de la plantilla Vida (sin hora). Valores alineados con DayOfWeek de routines.
  """
  enum VidaDayOfWeek {
    monday
    tuesday
    wednesday
    thursday
    friday
    saturday
    sunday
  }

  type VidaItem {
    id: ID!
    userId: Int!
    activityId: ID!
    days: [VidaDayOfWeek!]!
    notes: String
    isActive: Boolean!
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    activity: Activity
  }

  type VidaTakenToday {
    id: ID!
    userId: Int!
    vidaItemId: ID!
    """
    Fecha civil local, formato YYYY-MM-DD.
    """
    date: String!
    createdAt: DateTime!
  }

  type VidaSuggestion {
    item: VidaItem!
    takenToday: Boolean!
  }

  extend type Query {
    """
    Plantilla Vida del usuario. Por defecto solo ítems activos.
    """
    vidaItems(includeInactive: Boolean): [VidaItem!]!
    """
    Sugerencias para una fecha: ítems activos cuyo days incluye el weekday de date.
    """
    vidaSuggestionsForDate(date: String!): [VidaSuggestion!]!
    vidaTakenToday(date: String!): [VidaTakenToday!]!
  }

  extend type Mutation {
    vidaItemCreate(input: VidaItemCreateInput!): VidaItem!
    vidaItemUpdate(input: VidaItemUpdateInput!): VidaItem!
    vidaItemDelete(input: VidaItemDeleteInput!): Boolean!
    vidaMarkTakenToday(input: VidaMarkTakenTodayInput!): VidaTakenToday!
    vidaUnmarkTakenToday(input: VidaUnmarkTakenTodayInput!): Boolean!
  }

  input VidaItemCreateInput {
    activityId: ID!
    days: [VidaDayOfWeek!]!
    notes: String
    orderIndex: Int
    """UUID v7 del cliente para idempotencia offline."""
    clientId: ID
  }

  input VidaItemUpdateInput {
    id: ID!
    days: [VidaDayOfWeek!]
    notes: String
    isActive: Boolean
    orderIndex: Int
  }

  input VidaItemDeleteInput {
    id: ID!
  }

  input VidaMarkTakenTodayInput {
    vidaItemId: ID!
    date: String!
  }

  input VidaUnmarkTakenTodayInput {
    vidaItemId: ID!
    date: String!
  }
`;
