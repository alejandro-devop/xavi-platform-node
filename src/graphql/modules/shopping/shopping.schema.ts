import { gql } from 'graphql-tag';

export const shoppingTypeDefs = gql`
  type ShoppingList {
    id: ID!
    userId: ID!
    name: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    listItems: [ShoppingListItem!]!
  }

  type ShoppingCatalogItem {
    id: ID!
    userId: ID!
    name: String!
    price: Decimal
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ShoppingListItem {
    id: ID!
    shoppingListId: ID!
    price: Decimal
    quantity: Decimal!
    item: ShoppingCatalogItem!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ShoppingListCollection {
    shoppingLists: [ShoppingList!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  type ShoppingCatalogItemCollection {
    items: [ShoppingCatalogItem!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  extend type Query {
    shoppingList(id: ID!): ShoppingList
    shoppingLists(page: Int, limit: Int): ShoppingListCollection!
    shoppingCatalogItem(id: ID!): ShoppingCatalogItem
    shoppingCatalogItems(page: Int, limit: Int): ShoppingCatalogItemCollection!
    shoppingListItems(listId: ID!): [ShoppingListItem!]!
  }

  extend type Mutation {
    shoppingListAdd(input: ShoppingListInput!): ShoppingList!
    shoppingListUpdate(input: ShoppingListUpdateInput!): ShoppingList!
    shoppingListRemove(id: ID!): Boolean!
    shoppingCatalogItemAdd(input: ShoppingCatalogItemInput!): ShoppingCatalogItem!
    shoppingCatalogItemUpdate(input: ShoppingCatalogItemUpdateInput!): ShoppingCatalogItem!
    shoppingCatalogItemRemove(id: ID!): Boolean!
    shoppingListItemAdd(input: ShoppingListItemAddInput!): ShoppingListItem!
    shoppingListItemCreateWithCatalog(
      input: ShoppingListItemCreateWithCatalogInput!
    ): ShoppingListItem!
    shoppingListItemUpdate(input: ShoppingListItemUpdateInput!): ShoppingListItem!
    shoppingListItemRemove(input: ShoppingListItemRemoveInput!): Boolean!
  }

  input ShoppingListInput {
    name: String!
  }

  input ShoppingListUpdateInput {
    id: ID!
    name: String!
  }

  input ShoppingCatalogItemInput {
    name: String!
    price: Decimal
  }

  input ShoppingCatalogItemUpdateInput {
    id: ID!
    name: String
    price: Decimal
  }

  input ShoppingListItemAddInput {
    listId: ID!
    itemId: ID!
    price: Decimal
    quantity: Decimal
  }

  """Creates a new catalog item (unique per user by name) and adds it to the list in one step."""
  input ShoppingListItemCreateWithCatalogInput {
    listId: ID!
    name: String!
    catalogPrice: Decimal
    price: Decimal
    quantity: Decimal
  }

  input ShoppingListItemUpdateInput {
    listId: ID!
    listItemId: ID!
    price: Decimal
    quantity: Decimal
  }

  input ShoppingListItemRemoveInput {
    listId: ID!
    listItemId: ID!
  }
`;
