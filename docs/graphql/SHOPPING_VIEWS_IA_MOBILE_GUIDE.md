# Guía autónoma para IA: vistas de listas de compra (React Native × GraphQL)

Este documento es **contrato suficiente** para implementar el flujo **shopping lists** contra la API GraphQL **sin acceso al repositorio del backend ni introspection**. Incluye: tipos SDL del dominio, queries/mutations nombradas, reglas de validación, forma de errores esperada y tácticas para reducir peticiones HTTP.

Para **React Native**: usa el mismo transporte (`fetch`, Apollo Client, urql, etc.) según definan en el proyecto; aquí solo se especifica protocolo GraphQL sobre HTTP.

---

## 1. Transporte HTTP

| Aspecto | Valor |
|---------|--------|
| Método | `POST` |
| Ruta típica | `/graphql` (base URL según ambiente dev/staging/prod) |
| Cabeceras | `Content-Type: application/json`, `Authorization: Bearer <JWT de acceso>` |
| Cuerpo | JSON estándar GraphQL `{ "query": string, "variables": object \| null }` |

**Autenticación:** todas las operaciones listadas aquí están pensadas para un usuario ya autenticado; sin JWT válido responderá como no autorizado según configuración global del servidor (no repetida aquí porque depende del despliegue).

**Opcional:** si en algún momento se permite **intropection** contra un entorno de pruebas, el schema incrustado en la §3 debe coincidir con el servidor; ante duda, prima lo que este documento y las respuestas reales muestran.

---

## 2. Escalares habituales (`DateTime`, `Decimal`)

Las respuestas y variables usan estos escalares definidos por el servidor (nombres canónicos en GraphQL):

- **`DateTime`** — habitualmente fecha/hora en formato ISO 8601 (string en JSON).
- **`Decimal`** — números decimales; en **variables GraphQL por JSON** conviene pasarlos como **string decimal** (`"2.99"`) cuando el servidor use un escalar Decimal custom, o número si tu cliente está configurado así; ante error de formato, usar string.

---

## 3. Schema GraphQL — dominio Shopping (SDL íntegro)

Copia/pega esta referencia al diseñar operaciones y tipos locales (TypeScript, etc.). No incluye tipos globales como `Query`/`Mutation` raíz completos ni `DateTime`/`Decimal` declarados aquí (**definición del servidor**, no duplicada en este archivo).

```
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
  isPurchased: Boolean!
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
  shoppingListItemsSetPurchased(
    input: ShoppingListItemsSetPurchasedInput!
  ): ShoppingList!
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

"""Crea un ítem en el catálogo (único por usuario por nombre) y lo añade a la lista en un paso."""
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

input ShoppingListItemsSetPurchasedInput {
  listId: ID!
  purchasedListItemIds: [ID!]
  unpurchasedListItemIds: [ID!]
}
```

**Notas de nullabilidad en queries:**

- `shoppingList(id)` y `shoppingCatalogItem(id)` pueden devolver **`null`** si el recurso no existe o no aplica al usuario actual.
- `shoppingLists`, `shoppingCatalogItems`, `shoppingListItems(listId)` son no nulos pero pueden devolver listas/arreglos vacíos.

---

## 4. Reglas de validación de entrada (backend)

Todos los **`id` / `listId` / `itemId` / `listItemId`** en argumentos esperan **UUID** válidos (formato estándar).

| Ámbito | Reglas |
|--------|--------|
| **Paginación** (`shoppingLists`, `shoppingCatalogItems`) | `page`: entero **≥ 1**, por defecto **1** si se omite. `limit`: entero **≥ 1**, máximo **100**, por defecto **20** si se omite. |
| **`name` (lista, catálogo)** | Cadena **1–255** caracteres. |
| **`ShoppingCatalogItemAdd`** | `name` obligatorio; `price` opcional, si va: número **≥ 0**. |
| **`ShoppingCatalogItemUpdate`** | Debe incluirse **al menos uno** de `name` o `price`. `price` puede ser **`null`** (borrar/limpiar según comportamiento servidor). Si se envían: `name` 1–255; `price` ≥ 0 o `null`. |
| **`ShoppingListItemAdd`** | `quantity` opcional pero si va: número **\> 0**. `price` opcional; puede ser **`null`** o número **≥ 0**. |
| **`ShoppingListItemCreateWithCatalog`** | `name` 1–255; `catalogPrice` opcional **≥ 0**; `price` opcional `null` o **≥ 0**; `quantity` opcional **\> 0**. |
| **`ShoppingListItemUpdate`** | Obligatorio al menos **`price`** o **`quantity`**; `quantity` si va es **\> 0**; `price` puede ser `null` o **≥ 0**. |
| **`ShoppingListItemsSetPurchased`** | Al menos uno de `purchasedListItemIds` o `unpurchasedListItemIds` con al menos un id; cada arreglo **máx. 200** UUIDs (sin duplicados internos); **ningún id** puede aparecer en ambos arreglos. Campos omitidos = `[]`. |

---

## 5. Concepto de modelo (nombre de datos en cliente)

| Tipo SDL | Uso |
|----------|-----|
| `ShoppingList` | Lista llamada ej. «Compra semanal». |
| `ShoppingCatalogItem` | Producto reutilizable del usuario («Leche»). |
| `ShoppingListItem` | **Línea** dentro de una lista: cantidad, precio opcional en línea, `isPurchased`, y `item` (catálogo anidado). |

**IDS distintos:** el id de **`ShoppingCatalogItem`** (`item.id`) **no** es el mismo que el id de **`ShoppingListItem`** (línea). En estado local de RN usa por ejemplo `catalogItemId` vs `listItemId`.

---

## 6. Fragmentos recomendados (una forma estable de pedir datos)

Usa estos fragmentos para que todas las vistas pidan los mismos campos y puedas reusar caches.

```graphql
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

fragment ShoppingListFields on ShoppingList {
  id
  userId
  name
  createdAt
  updatedAt
}
```

Incluye siempre **`isPurchased`** en líneas para UI “comprado / pendiente” sin queries extra.

---

## 7. Tabla de operaciones (referencia rápida)

| Operación | Tipo | Argumentos | Tipo de retorno |
|-----------|------|------------|-----------------|
| `shoppingList` | Query | `id: ID!` | `ShoppingList` nullable |
| `shoppingLists` | Query | `page`, `limit` opcionales | `ShoppingListCollection!` |
| `shoppingCatalogItem` | Query | `id: ID!` | `ShoppingCatalogItem` nullable |
| `shoppingCatalogItems` | Query | `page`, `limit` opcionales | `ShoppingCatalogItemCollection!` |
| `shoppingListItems` | Query | `listId: ID!` | `[ShoppingListItem!]!` |
| `shoppingListAdd` | Mutation | `input: ShoppingListInput!` | `ShoppingList!` |
| `shoppingListUpdate` | Mutation | `input: ShoppingListUpdateInput!` | `ShoppingList!` |
| `shoppingListRemove` | Mutation | `id: ID!` | `Boolean!` |
| `shoppingCatalogItemAdd` | Mutation | `input: ShoppingCatalogItemInput!` | `ShoppingCatalogItem!` |
| `shoppingCatalogItemUpdate` | Mutation | `input: ShoppingCatalogItemUpdateInput!` | `ShoppingCatalogItem!` |
| `shoppingCatalogItemRemove` | Mutation | `id: ID!` | `Boolean!` |
| `shoppingListItemAdd` | Mutation | `input: ShoppingListItemAddInput!` | `ShoppingListItem!` |
| `shoppingListItemCreateWithCatalog` | Mutation | `input: ShoppingListItemCreateWithCatalogInput!` | `ShoppingListItem!` |
| `shoppingListItemUpdate` | Mutation | `input: ShoppingListItemUpdateInput!` | `ShoppingListItem!` |
| `shoppingListItemRemove` | Mutation | `input: ShoppingListItemRemoveInput!` | `Boolean!` |
| `shoppingListItemsSetPurchased` | Mutation | `input: ShoppingListItemsSetPurchasedInput!` | `ShoppingList!` |

---

## 8. Listas: listar, crear, editar, eliminar

### 8.1 Listar — `shoppingLists`

La respuesta de **`shoppingLists` incluye, por cada lista, el arreglo `listItems`** ya resuelto (líneas + `item`), en la **misma** petición. Puedes construir pantalla lista + navegación a detalle usando **solo** esta query y el cache cliente, sin volver a pedir **`shoppingList(id)`** únicamente para cargar líneas.

```graphql
query ShoppingListsOverview($page: Int, $limit: Int) {
  shoppingLists(page: $page, limit: $limit) {
    page
    limit
    total
    shoppingLists {
      ...ShoppingListFields
      listItems {
        ...ShoppingListItemFields
      }
    }
  }
}
```

Variables ejemplo: `{ "page": 1, "limit": 20 }`.

### 8.2 Una lista — `shoppingList`

Para deep link, cold start o lista no presente en la página actual del listado:

```graphql
query ShoppingListDetail($id: ID!) {
  shoppingList(id: $id) {
    ...ShoppingListFields
    listItems {
      ...ShoppingListItemFields
    }
  }
}
```

### 8.3 Crear — `shoppingListAdd`

```graphql
mutation ShoppingListAdd($input: ShoppingListInput!) {
  shoppingListAdd(input: $input) {
    ...ShoppingListFields
    listItems {
      ...ShoppingListItemFields
    }
  }
}
```

**Comportamiento esperado de negocio:** la lista recién creada se devuelve con **`listItems` vacío** (`[]`). No es obligatorio seguir con otra query para “confirmar” si no hay líneas aún.

### 8.4 Editar nombre — `shoppingListUpdate`

```graphql
mutation ShoppingListUpdate($input: ShoppingListUpdateInput!) {
  shoppingListUpdate(input: $input) {
    ...ShoppingListFields
    listItems {
      ...ShoppingListItemFields
    }
  }
}
```

**Comportamiento esperado:** la mutación puede devolver **`listItems` vacíos** aunque en servidor la lista tenga líneas; para mostrar líneas tras renombrar, **mantén el cache previo** o **vuelve a ejecutar** `ShoppingListsOverview` / `ShoppingListDetail`.

### 8.5 Eliminar — `shoppingListRemove`

```graphql
mutation ShoppingListRemove($id: ID!) {
  shoppingListRemove(id: $id)
}
```

Retorna `true` si el borrado lógico en servidor tuvo éxito en el flujo esperado.

---

## 9. Catálogo: listar, crear, editar, eliminar

Operan sobre **`ShoppingCatalogItem`**, no sobre líneas de lista.

### 9.1 Listar — `shoppingCatalogItems`

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

### 9.2 Detalle — `shoppingCatalogItem`

```graphql
query ShoppingCatalogItem($id: ID!) {
  shoppingCatalogItem(id: $id) {
    ...ShoppingCatalogItemFields
  }
}
```

### 9.3 Crear — `shoppingCatalogItemAdd`

```graphql
mutation ShoppingCatalogItemAdd($input: ShoppingCatalogItemInput!) {
  shoppingCatalogItemAdd(input: $input) {
    ...ShoppingCatalogItemFields
  }
}
```

### 9.4 Actualizar — `shoppingCatalogItemUpdate`

```graphql
mutation ShoppingCatalogItemUpdate($input: ShoppingCatalogItemUpdateInput!) {
  shoppingCatalogItemUpdate(input: $input) {
    ...ShoppingCatalogItemFields
  }
}
```

### 9.5 Eliminar — `shoppingCatalogItemRemove`

```graphql
mutation ShoppingCatalogItemRemove($id: ID!) {
  shoppingCatalogItemRemove(id: $id)
}
```

---

## 10. Líneas de lista: listar, añadir, crear+catálogo, editar, quitar

### 10.1 Solo líneas — `shoppingListItems`

```graphql
query ShoppingListItems($listId: ID!) {
  shoppingListItems(listId: $listId) {
    ...ShoppingListItemFields
  }
}
```

**Cuándo evitarla:** si ya obtuviste `listItems` dentro de `shoppingLists` o `shoppingList`, esta query **duplica** trabajo de red salvo que quieras a propósito una carga mínima de una sola lista.

### 10.2 Añadir línea con catálogo existente — `shoppingListItemAdd`

```graphql
mutation ShoppingListItemAdd($input: ShoppingListItemAddInput!) {
  shoppingListItemAdd(input: $input) {
    ...ShoppingListItemFields
  }
}
```

### 10.3 Crear producto en catálogo y añadir a la lista en un paso — `shoppingListItemCreateWithCatalog`

```graphql
mutation ShoppingListItemCreateWithCatalog($input: ShoppingListItemCreateWithCatalogInput!) {
  shoppingListItemCreateWithCatalog(input: $input) {
    ...ShoppingListItemFields
  }
}
```

**Ahorro de peticiones:** sustituye la secuencia `shoppingCatalogItemAdd` + `shoppingListItemAdd` cuando el usuario escribe un nombre nuevo desde la lista.

**Errores de negocio frecuentes:** nombre de catálogo **duplicado** para el mismo usuario (`ConflictError`); producto **ya presente** en esa lista (`ConflictError` con mensaje equivalente a “already in the shopping list”).

### 10.4 Editar precio/cantidad de línea — `shoppingListItemUpdate`

```graphql
mutation ShoppingListItemUpdate($input: ShoppingListItemUpdateInput!) {
  shoppingListItemUpdate(input: $input) {
    ...ShoppingListItemFields
  }
}
```

**No** uses esta mutación para marcar o desmarcar comprado; para eso existe §11.

### 10.5 Quitar línea de la lista — `shoppingListItemRemove`

```graphql
mutation ShoppingListItemRemove($input: ShoppingListItemRemoveInput!) {
  shoppingListItemRemove(input: $input)
}
```

No elimina el `ShoppingCatalogItem` del usuario, solo la fila de la lista.

---

## 11. Marcar / desmarcar comprado — `shoppingListItemsSetPurchased`

Una sola mutación para **`isPurchased = true`** y/o **`false`** en la misma petición. Devuelve la **`ShoppingList`** completa con **`listItems`** actualizados.

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

```graphql
input ShoppingListItemsSetPurchasedInput {
  listId: ID!
  purchasedListItemIds: [ID!]
  unpurchasedListItemIds: [ID!]
}
```

Variables ejemplo (marcar dos y desmarcar uno en el mismo request):

```json
{
  "input": {
    "listId": "LIST-UUID",
    "purchasedListItemIds": ["LINE-UUID-1", "LINE-UUID-2"],
    "unpurchasedListItemIds": ["LINE-UUID-3"]
  }
}
```

Solo marcar: envía ids en `purchasedListItemIds` y `unpurchasedListItemIds: []` u omite el segundo. Solo desmarcar: al revés.

**Reglas:**

- Al menos un id en total (en uno u otro arreglo).
- Un mismo `listItemId` **no** puede estar en ambos arreglos.
- Cada arreglo: hasta **200** ids; duplicados se normalizan en servidor.
- Si algún id no pertenece a `listId`, error de solicitud incorrecta; la transacción no aplica cambios parciales.

**Eficiencia:** al togglear varias casillas, envía **una** mutación con los ids que pasan a comprado y los que pasan a pendiente.

---

## 12. Errores GraphQL y mensajes de negocio útiles

- **Validación de argumentos:** errores con extensión típica `extensions.code === 'BAD_USER_INPUT'`; a veces detalle adicional en extensiones (p. ej. lista `validationErrors` según versión del servidor).
- **No encontrado:** listas o ítems inexistentes o inaccesibles — mensajes como `Shopping list not found`, `Item not found`, `List item not found`.
- **Permisos:** recurso de otro usuario — mensajes de “permission” / “forbidden” según capa de errores.
- **Conflicto:** `An item with this name already exists` (catálogo duplicado por nombre); `This item is already in the shopping list` (misma lista).
- **Solicitud inválida:** p. ej. actualizar sin campos, o marcar/desmarcar comprados con conjunto de ids que no coincide con filas de la lista.

En RN, muestra el `message` del error GraphQL y, si existe, mapea `extensions.code` a copy amigable.

---

## 13. Estrategia para el mínimo número de peticiones

1. **Pantalla principal:** una sola query `ShoppingListsOverview` con `listItems { item { … } }` anidado; la pantalla de detalle de una lista lee del **mismo** payload/cache.
2. **`shoppingList(id)`** solo si la lista **no** está en memoria (link profundo, otra página de paginación no cargada).
3. **No** llames `shoppingListItems` si ya tienes `listItems` del overview o del detalle.
4. **Alta desde texto libre:** `shoppingListItemCreateWithCatalog` (un round-trip).
5. **Marcar / desmarcar comprado:** una sola mutación `shoppingListItemsSetPurchased` con ambos arreglos según los toggles del usuario; reemplaza en estado la lista devuelta.
6. **Tras `shoppingListAdd` / `shoppingListUpdate`:** asume `listItems` vacíos en respuesta; haz merge local o refetch del overview, sin asumir otra query “de detalle” obligatoria.

---

## 14. Ejemplo mínimo de petición HTTP (ilustrativo)

```http
POST /graphql HTTP/1.1
Host: <api-host>
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "query": "query($p:Int,$l:Int){ shoppingLists(page:$p,limit:$l){ total shoppingLists{ id name listItems{ id quantity isPurchased item{ id name } } } } }",
  "variables": { "p": 1, "l": 20 }
}
```

(Ajusta host, query string y variables a tu operación con nombre y fragmentos.)

---

*Fin del contrato autónomo para el dominio Shopping en GraphQL.*
