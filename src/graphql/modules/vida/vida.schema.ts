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
    """
    Hora local de inicio, formato HH:mm. Null mientras el ítem no tenga hora.
    """
    startTime: String
    """
    Duración en minutos (entero positivo). Null mientras el ítem no tenga duración.
    """
    durationMinutes: Int
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

  """
  Una meta con minutos objetivo. Varias categorías pueden apuntar a la misma.
  """
  type VidaGoal {
    id: ID!
    userId: Int!
    """
    Identidad estable de la meta. La automática es 'work'.
    """
    slug: String!
    name: String!
    icon: String
    color: String
    targetMinutes: Int!
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  extend type ActivityCategory {
    """
    Meta a la que apunta esta categoría, o null.
    """
    goalId: ID
    goal: VidaGoal
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
    """
    Apunta (o desapunta) una categoría a una meta. Devuelve la categoría ya con su goalId.
    """
    activityCategoryGoalSet(input: ActivityCategoryGoalSetInput!): ActivityCategory!
  }

  input ActivityCategoryGoalSetInput {
    categoryId: ID!
    """
    false quita el puntero. true lo pone.
    """
    attached: Boolean!
    """
    Meta explícita. Omitida con attached: true, se usa la meta por defecto del usuario,
    creándola si no existe.
    """
    goalId: ID
  }

  input VidaItemCreateInput {
    activityId: ID!
    days: [VidaDayOfWeek!]!
    """
    Hora local de inicio, formato HH:mm. Opcional.
    """
    startTime: String
    """
    Duración en minutos (entero positivo). Opcional.
    """
    durationMinutes: Int
    notes: String
    orderIndex: Int
    """UUID v7 del cliente para idempotencia offline."""
    clientId: ID
  }

  input VidaItemUpdateInput {
    id: ID!
    days: [VidaDayOfWeek!]
    """
    Hora local HH:mm (o null para limpiar).
    """
    startTime: String
    """
    Duración en minutos, entero positivo (o null para limpiar).
    """
    durationMinutes: Int
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
