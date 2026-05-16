# Shopping — GraphQL para Bruno / clientes

**Colección lista para importar:** carpeta del repo [`bruno/xavi-shopping-graphql/`](../../bruno/xavi-shopping-graphql/) en formato **OpenCollection YAML** (Bruno **3.0+**; raíz `opencollection.yml`). En Bruno: **Import Collection** e importa **esa carpeta** como colección (no uses **Import OpenAPI** si te pide un YAML distinto). Detalles en su `README.md`.

---

Endpoint HTTP (referencia): **`POST /graphql`**

Cabecera: **`Authorization: Bearer <access_token>`** (JWT del flujo de auth del producto).

Variables y nombres de operación son libres en Bruno; aquí se usan nombres descriptivos para exportar como colección.

---

## Fragmentos reutilizables

```graphql
fragment ShoppingListFields on ShoppingList {
  id
  userId
  name
  createdAt
  updatedAt
}

fragment ShoppingCatalogItemFields on ShoppingCatalogItem {
  id
  userId
  name
  price
  createdAt
  updatedAt
}

fragment ShoppingListItemFields on ShoppingListItem {
  id
  shoppingListId
  price
  quantity
  isPurchased
  createdAt
  updatedAt
  item {
    ...ShoppingCatalogItemFields
  }
}
```

---

## Queries

### `ShoppingList` — una lista con ítems en línea

```graphql
query ShoppingList($id: ID!) {
  shoppingList(id: $id) {
    ...ShoppingListFields
    listItems {
      ...ShoppingListItemFields
    }
  }
}
```

**Variables (ejemplo)**

```json
{
  "id": "LIST-UUID"
}
```

---

### `ShoppingLists` — listar listas (paginado)

```graphql
query ShoppingLists($page: Int, $limit: Int) {
  shoppingLists(page: $page, limit: $limit) {
    page
    limit
    total
    shoppingLists {
      ...ShoppingListFields
      listItems
    }
  }
}
```

`listItems` viene vacío en esta colección; para el detalle usar `ShoppingList`.

**Variables (ejemplo)**

```json
{
  "page": 1,
  "limit": 20
}
```

---

### `ShoppingCatalogItem` — un ítem del catálogo

```graphql
query ShoppingCatalogItem($id: ID!) {
  shoppingCatalogItem(id: $id) {
    ...ShoppingCatalogItemFields
  }
}
```

**Variables**

```json
{
  "id": "ITEM-UUID"
}
```

---

### `ShoppingCatalogItems` — listar catálogo (paginado)

```graphql
query ShoppingCatalogItems($page: Int, $limit: Int) {
  shoppingCatalogItems(page: $page, limit: $limit) {
    page
    limit
    total
    items {
      ...ShoppingCatalogItemFields
    }
  }
}
```

**Variables**

```json
{
  "page": 1,
  "limit": 20
}
```

---

### `ShoppingListItems` — solo líneas de una lista

```graphql
query ShoppingListItems($listId: ID!) {
  shoppingListItems(listId: $listId) {
    ...ShoppingListItemFields
  }
}
```

**Variables**

```json
{
  "listId": "LIST-UUID"
}
```

---

## Mutations

### `ShoppingListAdd`

```graphql
mutation ShoppingListAdd($input: ShoppingListInput!) {
  shoppingListAdd(input: $input) {
    ...ShoppingListFields
    listItems
  }
}
```

**Variables**

```json
{
  "input": {
    "name": "Compra semanal"
  }
}
```

---

### `ShoppingListUpdate`

```graphql
mutation ShoppingListUpdate($input: ShoppingListUpdateInput!) {
  shoppingListUpdate(input: $input) {
    ...ShoppingListFields
    listItems
  }
}
```

**Variables**

```json
{
  "input": {
    "id": "LIST-UUID",
    "name": "Nuevo nombre"
  }
}
```

---

### `ShoppingListRemove`

```graphql
mutation ShoppingListRemove($id: ID!) {
  shoppingListRemove(id: $id)
}
```

**Variables**

```json
{
  "id": "LIST-UUID"
}
```

---

### `ShoppingCatalogItemAdd`

```graphql
mutation ShoppingCatalogItemAdd($input: ShoppingCatalogItemInput!) {
  shoppingCatalogItemAdd(input: $input) {
    ...ShoppingCatalogItemFields
  }
}
```

**Variables**

```json
{
  "input": {
    "name": "Leche",
    "price": 2.99
  }
}
```

---

### `ShoppingCatalogItemUpdate`

```graphql
mutation ShoppingCatalogItemUpdate($input: ShoppingCatalogItemUpdateInput!) {
  shoppingCatalogItemUpdate(input: $input) {
    ...ShoppingCatalogItemFields
  }
}
```

**Variables** (al menos uno de `name` o `price`; `price` puede ser `null`)

```json
{
  "input": {
    "id": "ITEM-UUID",
    "price": 3.5
  }
}
```

---

### `ShoppingCatalogItemRemove`

```graphql
mutation ShoppingCatalogItemRemove($id: ID!) {
  shoppingCatalogItemRemove(id: $id)
}
```

**Variables**

```json
{
  "id": "ITEM-UUID"
}
```

---

### `ShoppingListItemAdd` — asociar ítem del catálogo a una lista

```graphql
mutation ShoppingListItemAdd($input: ShoppingListItemAddInput!) {
  shoppingListItemAdd(input: $input) {
    ...ShoppingListItemFields
  }
}
```

**Variables**

```json
{
  "input": {
    "listId": "LIST-UUID",
    "itemId": "ITEM-UUID",
    "price": 1.8,
    "quantity": 2
  }
}
```

---

### `ShoppingListItemUpdate` — precio/cantidad en la lista

```graphql
mutation ShoppingListItemUpdate($input: ShoppingListItemUpdateInput!) {
  shoppingListItemUpdate(input: $input) {
    ...ShoppingListItemFields
  }
}
```

**Variables** (al menos uno de `price` o `quantity`)

```json
{
  "input": {
    "listId": "LIST-UUID",
    "listItemId": "LINE-UUID",
    "price": 2.1,
    "quantity": 3
  }
}
```

---

### `ShoppingListItemRemove` — quitar ítem de la lista

```graphql
mutation ShoppingListItemRemove($input: ShoppingListItemRemoveInput!) {
  shoppingListItemRemove(input: $input)
}
```

**Variables**

```json
{
  "input": {
    "listId": "LIST-UUID",
    "listItemId": "LINE-UUID"
  }
}
```

---

### `ShoppingListItemsSetPurchased` — marcar y/o desmarcar comprado (lote)

```graphql
mutation ShoppingListItemsSetPurchased($input: ShoppingListItemsSetPurchasedInput!) {
  shoppingListItemsSetPurchased(input: $input) {
    ...ShoppingListFields
    listItems {
      ...ShoppingListItemFields
    }
  }
}
```

**Variables** (al menos uno de los dos arreglos debe tener ids; un mismo id no puede estar en ambos)

```json
{
  "input": {
    "listId": "LIST-UUID",
    "purchasedListItemIds": ["LINE-UUID-1"],
    "unpurchasedListItemIds": ["LINE-UUID-2"]
  }
}
```

Solo marcar: `"unpurchasedListItemIds": []` o omitir el campo. Solo desmarcar: `"purchasedListItemIds": []` o omitir.

---

## Notas

- Los UUID pueden ser v7 u otros UUID válidos según la generación del backend.
- Escalares `Decimal` y `DateTime` siguen la configuración del servidor Apollo del repo.
- Errores de validación Zod llegan como `GraphQLError` con `extensions.code === 'BAD_USER_INPUT'` y detalle en `validationErrors` cuando aplica.
