import { gql } from 'graphql-tag';

export const sweeterWayTypeDefs = gql`
  type SWBondPartner {
    id: ID!
    name: String!
    email: String!
  }

  type CinnamonBond {
    id: ID!
    requesterId: ID!
    addresseeId: ID!
    status: String!
    requestedAt: DateTime!
    respondedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    """The other user in the bond, relative to the authenticated viewer."""
    partner: SWBondPartner
  }

  type SweeterList {
    id: ID!
    bondId: ID!
    title: String!
    description: String
    category: String!
    createdBy: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SWListItem {
    id: ID!
    listId: ID!
    title: String!
    description: String
    address: String
    url: String
    status: String!
    completedAt: DateTime
    addedBy: ID!
    rating: Int
    wouldReturn: Boolean
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SWItemLog {
    id: ID!
    itemId: ID!
    userId: ID!
    comment: String
    liked: Boolean
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SWNotification {
    id: ID!
    recipientId: ID!
    actorId: ID!
    type: String!
    entityType: String!
    entityId: ID!
    readAt: DateTime
    payload: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SWUserPreferences {
    id: ID!
    userId: ID!
    emailNotifications: Boolean!
    inAppNotifications: Boolean!
    pushToken: String
    pushNotificationsEnabled: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  extend type Query {
    swMyBond: CinnamonBond
    """Pending bond requests involving the current user (sent or received)."""
    swMyPendingBondRequests: [CinnamonBond!]!
    swMyLists: [SweeterList!]!
    swListItems(listId: ID!): [SWListItem!]!
    swItemLogs(itemId: ID!): [SWItemLog!]!
    swMyNotifications(unreadOnly: Boolean): [SWNotification!]!
    swMyPreferences: SWUserPreferences!
  }

  extend type Mutation {
    swSendCinnamonRequest(addresseeEmail: String!): CinnamonBond!
    swRespondCinnamonRequest(bondId: ID!, accept: Boolean!): CinnamonBond!
    swDissolveBond(bondId: ID!): Boolean!

    swCreateList(input: SWCreateListInput!): SweeterList!
    swUpdateList(id: ID!, input: SWUpdateListInput!): SweeterList!
    swDeleteList(id: ID!): Boolean!

    swAddListItem(listId: ID!, input: SWAddListItemInput!): SWListItem!
    swUpdateListItem(id: ID!, input: SWUpdateListItemInput!): SWListItem!
    swCompleteListItem(id: ID!): SWListItem!
    swRateListItem(id: ID!, rating: Int!, wouldReturn: Boolean!): SWListItem!

    swUpsertItemLog(itemId: ID!, input: SWUpsertItemLogInput!): SWItemLog!

    swMarkNotificationsRead(ids: [ID!]!): Int!
    swUpdatePreferences(input: SWUpdatePreferencesInput!): SWUserPreferences!
  }

  input SWCreateListInput {
    title: String!
    description: String
    category: String!
  }

  input SWUpdateListInput {
    title: String
    description: String
    category: String
  }

  input SWAddListItemInput {
    title: String!
    description: String
    address: String
    url: String
  }

  input SWUpdateListItemInput {
    title: String
    description: String
    address: String
    url: String
  }

  input SWUpsertItemLogInput {
    comment: String
    liked: Boolean
  }

  input SWUpdatePreferencesInput {
    emailNotifications: Boolean
    inAppNotifications: Boolean
    pushToken: String
    pushNotificationsEnabled: Boolean
  }
`;
