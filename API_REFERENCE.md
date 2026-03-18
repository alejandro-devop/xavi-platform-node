# API Reference - Xavi Platform

Este documento describe la estructura de las APIs GraphQL y de Autenticación del servicio Xavi Platform para facilitar la integración del frontend.

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [GraphQL API](#graphql-api)
- [Tipos de Datos](#tipos-de-datos)
- [Queries](#queries)
- [Mutations](#mutations)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## Autenticación

### Base URL
```
POST /api/auth/*
Content-Type: application/json
```

### Estructura de Respuestas HTTP

#### Respuesta Exitosa
```typescript
{
  "status": true,
  "data": T,  // Tipo genérico según el endpoint
  "message": "string", // Opcional
  "meta": {
    "env": "development" | "production"
  }
}
```

#### Respuesta de Error
```typescript
{
  "status": false,
  "errors": ["string", "string"],  // Array de mensajes de error
  "env": "development" | "production"
}
```

---

### Endpoints de Autenticación

#### 1. Registro (Register)

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe"
}
```

**Validaciones:**
- `email`: Formato de email válido
- `password`: Mínimo 8 caracteres, debe contener al menos:
  - Una letra mayúscula
  - Una letra minúscula
  - Un número
- `name`: Mínimo 2 caracteres

**Response (201):**
```json
{
  "status": true,
  "data": {
    "user": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "isAccountVerified": false,
      "createdAt": "2026-02-26T10:30:00.000Z"
    },
    "message": "Registration successful. Please verify your email.",
    "verificationCode": "123456"  // Solo en desarrollo
  },
  "meta": {
    "env": "development"
  }
}
```

---

#### 2. Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "status": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "isAccountVerified": true
    }
  },
  "meta": {
    "env": "development"
  }
}
```

---

#### 3. Verificar Email

**Endpoint:** `POST /api/auth/verify-email`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "status": true,
  "data": {
    "message": "Email verified successfully"
  },
  "meta": {
    "env": "development"
  }
}
```

---

#### 4. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "status": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "isAccountVerified": true
    }
  },
  "meta": {
    "env": "development"
  }
}
```

---

#### 5. Logout

**Endpoint:** `POST /api/auth/logout`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "status": true,
  "data": {
    "message": "Logged out successfully"
  },
  "meta": {
    "env": "development"
  }
}
```

---

#### 6. Get Profile

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "status": true,
  "data": {
    "user": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "isAccountVerified": true
    }
  },
  "meta": {
    "env": "development"
  }
}
```

---

## GraphQL API

### Base URL
```
POST /graphql
Content-Type: application/json
Authorization: Bearer <accessToken>
```

### Estructura de Petición GraphQL

```json
{
  "query": "query o mutation en formato string",
  "variables": {
    "key": "value"
  }
}
```

### Estructura de Respuesta GraphQL

```json
{
  "data": {
    "queryOrMutationName": {
      // Datos solicitados
    }
  },
  "errors": [  // Opcional, solo si hay errores
    {
      "message": "Error message",
      "locations": [{"line": 1, "column": 1}],
      "path": ["fieldName"]
    }
  ]
}
```

---

## Tipos de Datos

### Scalars Personalizados

```graphql
scalar DateTime  # ISO 8601: "2026-02-26T10:30:00.000Z"
scalar Date      # ISO 8601: "2026-02-26"
scalar JSON      # Objeto JSON
scalar Decimal   # Número decimal de alta precisión
```

### Enums

```graphql
enum ExpenseCategoryType {
  income
  expense
}

enum FrequencyType {
  Daily
  Weekly
  Monthly
  Yearly
}

enum RepeatType {
  none
  daily
  weekly
  biweekly
  monthly
}
```

---

## Tipos de Datos Principales

### Wallet (Billetera)

```graphql
type Wallet {
  id: ID!
  userId: ID!
  name: String!
  icon: String
  initialBalance: Decimal!
  balance: Decimal!
  isMain: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  
  # Relaciones
  expenses: [WalletExpense!]
  scheduledExpenses: [ScheduledExpense!]
  budgets: [WalletBudget!]
}
```

### WalletExpenseCategory (Categoría de Gasto)

```graphql
type WalletExpenseCategory {
  id: ID!
  userId: ID!
  name: String!
  type: ExpenseCategoryType!
  description: String
  color: String
  icon: String
  isSystem: Boolean!
  isTransaction: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### WalletExpense (Gasto)

```graphql
type WalletExpense {
  id: ID!
  userId: ID!
  walletId: ID!
  categoryId: ID
  budgetId: ID
  date: Date!
  description: String!
  debit: Decimal!
  credit: Decimal!
  isIncome: Boolean!
  isOutcome: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  
  # Relaciones
  wallet: Wallet
  category: WalletExpenseCategory
  budget: WalletBudget
}
```

### WalletBudget (Presupuesto)

```graphql
type WalletBudget {
  id: ID!
  userId: ID!
  walletId: ID
  frequencyId: ID
  name: String!
  description: String
  icon: String
  amount: Decimal!
  balance: Decimal!
  startDate: Date!
  endDate: Date!
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  
  # Relaciones
  wallet: Wallet
  frequency: WalletFrequency
  expenses: [WalletExpense!]
  followUps: [WalletBudgetFollowUp!]
}
```

### ScheduledExpense (Gasto Programado)

```graphql
type ScheduledExpense {
  id: ID!
  userId: Int!
  walletId: ID!
  categoryId: ID
  budgetId: ID
  parentId: ID
  expenseId: ID
  amount: Float!
  description: String!
  dueDate: String!
  isPaid: Boolean!
  paidDate: String
  repeatType: RepeatType
  endDate: String
  createdAt: String!
  updatedAt: String!
  
  # Relaciones
  wallet: Wallet
  category: WalletExpenseCategory
  budget: WalletBudget
  parent: ScheduledExpense
  expense: WalletExpense
}
```

### WalletFrequency (Frecuencia)

```graphql
type WalletFrequency {
  id: ID!
  userId: ID!
  name: String!
  description: String
  frequencyType: FrequencyType!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### WalletPeriod (Período)

```graphql
type WalletPeriod {
  id: ID!
  userId: ID!
  name: String!
  description: String
  startDate: Date!
  endDate: Date!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

---

## Queries

### Wallets

```graphql
# Obtener una billetera por ID
query {
  wallet(id: ID!): Wallet
}

# Obtener todas las billeteras del usuario
query {
  wallets: [Wallet!]!
}
```

### Expense Categories

```graphql
# Obtener una categoría por ID
query {
  walletExpenseCategory(id: ID!): WalletExpenseCategory
}

# Obtener todas las categorías (opcionalmente filtradas por tipo)
query {
  walletExpenseCategories(type: ExpenseCategoryType): [WalletExpenseCategory!]!
}
```

### Expenses

```graphql
# Obtener un gasto por ID
query {
  walletExpense(id: ID!): WalletExpense
}

# Obtener gastos con filtros
query {
  walletExpenses(
    walletId: ID
    categoryId: ID
    budgetId: ID
    startDate: Date
    endDate: Date
    isIncome: Boolean
    isOutcome: Boolean
  ): [WalletExpense!]!
}
```

### Budgets

```graphql
# Obtener un presupuesto por ID
query {
  walletBudget(id: ID!): WalletBudget
}

# Obtener presupuestos con filtros
query {
  walletBudgets(walletId: ID, isActive: Boolean): [WalletBudget!]!
}

# Obtener un seguimiento de presupuesto
query {
  walletBudgetFollowUp(id: ID!): WalletBudgetFollowUp
}

# Obtener seguimientos de un presupuesto
query {
  walletBudgetFollowUps(budgetId: ID!): [WalletBudgetFollowUp!]!
}
```

### Scheduled Expenses

```graphql
# Obtener un gasto programado por ID
query {
  scheduledExpense(id: ID!): ScheduledExpense!
}

# Obtener gastos programados con filtros
query {
  scheduledExpenses(filter: ScheduledExpenseFilter): [ScheduledExpense!]!
}
```

### Frequencies

```graphql
# Obtener una frecuencia por ID
query {
  walletFrequency(id: ID!): WalletFrequency
}

# Obtener todas las frecuencias
query {
  walletFrequencies: [WalletFrequency!]!
}
```

### Periods

```graphql
# Obtener un período por ID
query {
  walletPeriod(id: ID!): WalletPeriod
}

# Obtener todos los períodos
query {
  walletPeriods: [WalletPeriod!]!
}
```

---

## Mutations

### Wallets

```graphql
# Crear billetera
mutation {
  walletAdd(input: WalletInput!): Wallet!
}

# Actualizar billetera
mutation {
  walletUpdate(id: ID!, input: WalletUpdateInput!): Wallet!
}

# Eliminar billetera
mutation {
  walletRemove(id: ID!): Boolean!
}

# Limpiar todas las billeteras
mutation {
  walletCleanSlate: Boolean!
}
```

### Expense Categories

```graphql
# Crear categoría
mutation {
  walletExpenseCategoryAdd(input: WalletExpenseCategoryInput!): WalletExpenseCategory!
}

# Actualizar categoría
mutation {
  walletExpenseCategoryUpdate(id: ID!, input: WalletExpenseCategoryUpdateInput!): WalletExpenseCategory!
}

# Eliminar categoría
mutation {
  walletExpenseCategoryRemove(id: ID!): Boolean!
}
```

### Expenses

```graphql
# Crear gasto
mutation {
  walletExpenseAdd(input: WalletExpenseInput!): WalletExpense!
}

# Actualizar gasto
mutation {
  walletExpenseUpdate(id: ID!, input: WalletExpenseUpdateInput!): WalletExpense!
}

# Eliminar gasto
mutation {
  walletExpenseRemove(id: ID!): Boolean!
}
```

### Budgets

```graphql
# Crear presupuesto
mutation {
  walletBudgetAdd(input: WalletBudgetInput!): WalletBudget!
}

# Actualizar presupuesto
mutation {
  walletBudgetUpdate(id: ID!, input: WalletBudgetUpdateInput!): WalletBudget!
}

# Eliminar presupuesto
mutation {
  walletBudgetRemove(id: ID!): Boolean!
}

# Aplicar presupuesto a gastos
mutation {
  applyBudgetToExpenses(expensesIds: [ID!]!, budgetId: ID!, scheduled: Boolean): Boolean!
}

# Crear seguimiento de presupuesto
mutation {
  walletBudgetFollowUpAdd(input: WalletBudgetFollowUpInput!): WalletBudgetFollowUp!
}

# Actualizar seguimiento
mutation {
  walletBudgetFollowUpUpdate(id: ID!, input: WalletBudgetFollowUpUpdateInput!): WalletBudgetFollowUp!
}

# Eliminar seguimiento
mutation {
  walletBudgetFollowUpRemove(id: ID!): Boolean!
}
```

### Scheduled Expenses

```graphql
# Crear gasto programado
mutation {
  createScheduledExpense(input: CreateScheduledExpenseInput!): [ScheduledExpense!]!
}

# Actualizar gasto programado
mutation {
  updateScheduledExpense(id: ID!, input: UpdateScheduledExpenseInput!): ScheduledExpense!
}

# Actualización masiva de gastos programados
mutation {
  bulkUpdateScheduledExpenses(input: BulkUpdateScheduledExpensesInput!): [ScheduledExpense!]!
}

# Eliminar gasto programado
mutation {
  deleteScheduledExpense(id: ID!): Boolean!
}

# Eliminación masiva
mutation {
  bulkDeleteScheduledExpenses(input: BulkDeleteScheduledExpensesInput!): Boolean!
}

# Marcar como pagado
mutation {
  payScheduledExpense(input: PayScheduledExpenseInput!): ScheduledExpense!
}

# Revertir pago
mutation {
  revertScheduledExpensePayment(id: ID!): ScheduledExpense!
}

# Limpiar gastos programados
mutation {
  cleanSlateScheduledExpenses: Boolean!
}
```

### Frequencies

```graphql
# Crear frecuencia
mutation {
  walletFrequencyAdd(input: WalletFrequencyInput!): WalletFrequency!
}

# Actualizar frecuencia
mutation {
  walletFrequencyUpdate(id: ID!, input: WalletFrequencyUpdateInput!): WalletFrequency!
}

# Eliminar frecuencia
mutation {
  walletFrequencyRemove(id: ID!): Boolean!
}
```

### Periods

```graphql
# Crear período
mutation {
  walletPeriodAdd(input: WalletPeriodInput!): WalletPeriod!
}

# Actualizar período
mutation {
  walletPeriodUpdate(id: ID!, input: WalletPeriodUpdateInput!): WalletPeriod!
}

# Eliminar período
mutation {
  walletPeriodRemove(id: ID!): Boolean!
}
```

---

## Ejemplos de Uso

### 1. Crear una Billetera

**Request:**
```graphql
mutation CreateWallet($input: WalletInput!) {
  walletAdd(input: $input) {
    id
    name
    icon
    initialBalance
    balance
    isMain
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Mi Billetera Principal",
    "icon": "💰",
    "initialBalance": 5000.00,
    "balance": 5000.00,
    "isMain": true
  }
}
```

**Response:**
```json
{
  "data": {
    "walletAdd": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "name": "Mi Billetera Principal",
      "icon": "💰",
      "initialBalance": "5000.00",
      "balance": "5000.00",
      "isMain": true,
      "createdAt": "2026-02-26T10:30:00.000Z"
    }
  }
}
```

---

### 2. Crear una Categoría de Gasto

**Request:**
```graphql
mutation CreateExpenseCategory($input: WalletExpenseCategoryInput!) {
  walletExpenseCategoryAdd(input: $input) {
    id
    name
    type
    color
    icon
    description
    isSystem
    isTransaction
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Transporte",
    "type": "expense",
    "color": "#FF5733",
    "icon": "🚗",
    "description": "Gastos de transporte y combustible",
    "isTransaction": false
  }
}
```

**Response:**
```json
{
  "data": {
    "walletExpenseCategoryAdd": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "name": "Transporte",
      "type": "expense",
      "color": "#FF5733",
      "icon": "🚗",
      "description": "Gastos de transporte y combustible",
      "isSystem": false,
      "isTransaction": false,
      "createdAt": "2026-02-26T10:30:00.000Z"
    }
  }
}
```

---

### 3. Crear un Gasto

**Request:**
```graphql
mutation CreateExpense($input: WalletExpenseInput!) {
  walletExpenseAdd(input: $input) {
    id
    walletId
    categoryId
    budgetId
    date
    description
    debit
    credit
    isIncome
    isOutcome
    createdAt
    wallet {
      name
      balance
    }
    category {
      name
      icon
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "01234567-89ab-cdef-0123-456789abcdef",
    "categoryId": "01234567-89ab-cdef-0123-456789abcdef",
    "date": "2026-02-26",
    "description": "Gasolina para el auto",
    "debit": 500.00,
    "credit": 0,
    "isIncome": false,
    "isOutcome": true
  }
}
```

**Response:**
```json
{
  "data": {
    "walletExpenseAdd": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "walletId": "01234567-89ab-cdef-0123-456789abcdef",
      "categoryId": "01234567-89ab-cdef-0123-456789abcdef",
      "budgetId": null,
      "date": "2026-02-26",
      "description": "Gasolina para el auto",
      "debit": "500.00",
      "credit": "0.00",
      "isIncome": false,
      "isOutcome": true,
      "createdAt": "2026-02-26T10:30:00.000Z",
      "wallet": {
        "name": "Mi Billetera Principal",
        "balance": "4500.00"
      },
      "category": {
        "name": "Transporte",
        "icon": "🚗"
      }
    }
  }
}
```

---

### 4. Crear un Presupuesto

**Request:**
```graphql
mutation CreateBudget($input: WalletBudgetInput!) {
  walletBudgetAdd(input: $input) {
    id
    walletId
    frequencyId
    name
    description
    icon
    amount
    balance
    startDate
    endDate
    isActive
    createdAt
    wallet {
      name
    }
    frequency {
      name
      frequencyType
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "01234567-89ab-cdef-0123-456789abcdef",
    "frequencyId": "01234567-89ab-cdef-0123-456789abcdef",
    "name": "Presupuesto Mensual Transporte",
    "description": "Presupuesto para gastos de transporte del mes",
    "icon": "🚗",
    "amount": 3000.00,
    "startDate": "2026-02-01",
    "endDate": "2026-02-28",
    "isActive": true
  }
}
```

**Response:**
```json
{
  "data": {
    "walletBudgetAdd": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "walletId": "01234567-89ab-cdef-0123-456789abcdef",
      "frequencyId": "01234567-89ab-cdef-0123-456789abcdef",
      "name": "Presupuesto Mensual Transporte",
      "description": "Presupuesto para gastos de transporte del mes",
      "icon": "🚗",
      "amount": "3000.00",
      "balance": "3000.00",
      "startDate": "2026-02-01",
      "endDate": "2026-02-28",
      "isActive": true,
      "createdAt": "2026-02-26T10:30:00.000Z",
      "wallet": {
        "name": "Mi Billetera Principal"
      },
      "frequency": {
        "name": "Mensual",
        "frequencyType": "Monthly"
      }
    }
  }
}
```

---

### 5. Crear un Gasto Programado Recurrente

**Request:**
```graphql
mutation CreateScheduledExpense($input: CreateScheduledExpenseInput!) {
  createScheduledExpense(input: $input) {
    id
    walletId
    categoryId
    budgetId
    parentId
    amount
    description
    dueDate
    isPaid
    repeatType
    endDate
    createdAt
    wallet {
      name
    }
    category {
      name
      icon
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "01234567-89ab-cdef-0123-456789abcdef",
    "categoryId": "01234567-89ab-cdef-0123-456789abcdef",
    "budgetId": "01234567-89ab-cdef-0123-456789abcdef",
    "amount": 1500.00,
    "description": "Renta mensual",
    "dueDate": "2026-03-01",
    "repeatType": "monthly",
    "endDate": "2026-12-31"
  }
}
```

**Response:**
```json
{
  "data": {
    "createScheduledExpense": [
      {
        "id": "01234567-89ab-cdef-0123-456789abcdef",
        "walletId": "01234567-89ab-cdef-0123-456789abcdef",
        "categoryId": "01234567-89ab-cdef-0123-456789abcdef",
        "budgetId": "01234567-89ab-cdef-0123-456789abcdef",
        "parentId": null,
        "amount": 1500.00,
        "description": "Renta mensual",
        "dueDate": "2026-03-01",
        "isPaid": false,
        "repeatType": "monthly",
        "endDate": "2026-12-31",
        "createdAt": "2026-02-26T10:30:00.000Z",
        "wallet": {
          "name": "Mi Billetera Principal"
        },
        "category": {
          "name": "Vivienda",
          "icon": "🏠"
        }
      }
      // ... más instancias generadas para cada mes
    ]
  }
}
```

---

### 6. Marcar Gasto Programado como Pagado

**Request:**
```graphql
mutation PayScheduledExpense($input: PayScheduledExpenseInput!) {
  payScheduledExpense(input: $input) {
    id
    isPaid
    paidDate
    expenseId
    expense {
      id
      description
      debit
      date
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "01234567-89ab-cdef-0123-456789abcdef",
    "paidDate": "2026-02-26"
  }
}
```

**Response:**
```json
{
  "data": {
    "payScheduledExpense": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "isPaid": true,
      "paidDate": "2026-02-26",
      "expenseId": "01234567-89ab-cdef-0123-456789abcdef",
      "expense": {
        "id": "01234567-89ab-cdef-0123-456789abcdef",
        "description": "Renta mensual",
        "debit": "1500.00",
        "date": "2026-02-26"
      }
    }
  }
}
```

---

### 7. Actualizar una Billetera

**Request:**
```graphql
mutation UpdateWallet($id: ID!, $input: WalletUpdateInput!) {
  walletUpdate(id: $id, input: $input) {
    id
    name
    icon
    balance
    isMain
    updatedAt
  }
}
```

**Variables:**
```json
{
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "input": {
    "name": "Billetera Actualizada",
    "icon": "💳",
    "balance": 7500.00
  }
}
```

**Response:**
```json
{
  "data": {
    "walletUpdate": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "name": "Billetera Actualizada",
      "icon": "💳",
      "balance": "7500.00",
      "isMain": true,
      "updatedAt": "2026-02-26T11:00:00.000Z"
    }
  }
}
```

---

### 8. Obtener Gastos con Filtros

**Request:**
```graphql
query GetExpenses(
  $walletId: ID
  $categoryId: ID
  $startDate: Date
  $endDate: Date
  $isOutcome: Boolean
) {
  walletExpenses(
    walletId: $walletId
    categoryId: $categoryId
    startDate: $startDate
    endDate: $endDate
    isOutcome: $isOutcome
  ) {
    id
    description
    debit
    credit
    date
    isIncome
    isOutcome
    wallet {
      name
      icon
    }
    category {
      name
      icon
      color
    }
    budget {
      name
      balance
    }
  }
}
```

**Variables:**
```json
{
  "walletId": "01234567-89ab-cdef-0123-456789abcdef",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "isOutcome": true
}
```

**Response:**
```json
{
  "data": {
    "walletExpenses": [
      {
        "id": "01234567-89ab-cdef-0123-456789abcdef",
        "description": "Gasolina para el auto",
        "debit": "500.00",
        "credit": "0.00",
        "date": "2026-02-26",
        "isIncome": false,
        "isOutcome": true,
        "wallet": {
          "name": "Mi Billetera Principal",
          "icon": "💰"
        },
        "category": {
          "name": "Transporte",
          "icon": "🚗",
          "color": "#FF5733"
        },
        "budget": {
          "name": "Presupuesto Mensual Transporte",
          "balance": "2500.00"
        }
      }
      // ... más gastos
    ]
  }
}
```

---

### 9. Aplicar Presupuesto a Múltiples Gastos

**Request:**
```graphql
mutation ApplyBudgetToExpenses(
  $expensesIds: [ID!]!
  $budgetId: ID!
  $scheduled: Boolean
) {
  applyBudgetToExpenses(
    expensesIds: $expensesIds
    budgetId: $budgetId
    scheduled: $scheduled
  )
}
```

**Variables:**
```json
{
  "expensesIds": [
    "01234567-89ab-cdef-0123-456789abcdef",
    "12345678-9abc-def0-1234-56789abcdef0"
  ],
  "budgetId": "01234567-89ab-cdef-0123-456789abcdef",
  "scheduled": false
}
```

**Response:**
```json
{
  "data": {
    "applyBudgetToExpenses": true
  }
}
```

---

### 10. Crear Frecuencia

**Request:**
```graphql
mutation CreateFrequency($input: WalletFrequencyInput!) {
  walletFrequencyAdd(input: $input) {
    id
    name
    description
    frequencyType
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Quincenal",
    "description": "Cada dos semanas",
    "frequencyType": "Weekly"
  }
}
```

**Response:**
```json
{
  "data": {
    "walletFrequencyAdd": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "name": "Quincenal",
      "description": "Cada dos semanas",
      "frequencyType": "Weekly",
      "createdAt": "2026-02-26T10:30:00.000Z"
    }
  }
}
```

---

### 11. Crear Período

**Request:**
```graphql
mutation CreatePeriod($input: WalletPeriodInput!) {
  walletPeriodAdd(input: $input) {
    id
    name
    description
    startDate
    endDate
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Q1 2026",
    "description": "Primer trimestre del año fiscal 2026",
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  }
}
```

**Response:**
```json
{
  "data": {
    "walletPeriodAdd": {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "name": "Q1 2026",
      "description": "Primer trimestre del año fiscal 2026",
      "startDate": "2026-01-01",
      "endDate": "2026-03-31",
      "createdAt": "2026-02-26T10:30:00.000Z"
    }
  }
}
```

---

### 12. Actualización Masiva de Gastos Programados

**Request:**
```graphql
mutation BulkUpdateScheduledExpenses($input: BulkUpdateScheduledExpensesInput!) {
  bulkUpdateScheduledExpenses(input: $input) {
    id
    description
    amount
    categoryId
    budgetId
    updatedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "parentId": "01234567-89ab-cdef-0123-456789abcdef",
    "amount": 1800.00,
    "description": "Renta mensual - Actualizada",
    "categoryId": "01234567-89ab-cdef-0123-456789abcdef"
  }
}
```

**Response:**
```json
{
  "data": {
    "bulkUpdateScheduledExpenses": [
      {
        "id": "01234567-89ab-cdef-0123-456789abcdef",
        "description": "Renta mensual - Actualizada",
        "amount": 1800.00,
        "categoryId": "01234567-89ab-cdef-0123-456789abcdef",
        "budgetId": "01234567-89ab-cdef-0123-456789abcdef",
        "updatedAt": "2026-02-26T11:00:00.000Z"
      }
      // ... más instancias actualizadas
    ]
  }
}
```

---

## Notas Importantes

### Autenticación GraphQL

Todas las peticiones GraphQL requieren un token de acceso válido en el header:

```
Authorization: Bearer <accessToken>
```

### Manejo de Errores GraphQL

Los errores en GraphQL se devuelven en el array `errors` de la respuesta:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Not authenticated",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

### Tipos de Errores Comunes

- `UNAUTHENTICATED`: No se proporcionó token o es inválido
- `FORBIDDEN`: El usuario no tiene permisos para la operación
- `BAD_USER_INPUT`: Los datos de entrada son inválidos
- `NOT_FOUND`: El recurso solicitado no existe
- `CONFLICT`: Conflicto con el estado actual (ej: email duplicado)
- `INTERNAL_SERVER_ERROR`: Error del servidor

### Validaciones en Inputs

- Los campos marcados con `!` son obligatorios
- Los tipos `Decimal` deben enviarse como strings para mantener precisión
- Las fechas deben estar en formato ISO 8601
- Los IDs son strings de UUID v7

### Relaciones

Los tipos pueden incluir relaciones con otros tipos. Para obtener datos relacionados, simplemente inclúyelos en tu query:

```graphql
query {
  wallets {
    id
    name
    expenses {
      id
      description
      category {
        name
        icon
      }
    }
  }
}
```

### Paginación

Actualmente no hay paginación implementada. Todas las queries devuelven todos los registros del usuario autenticado.

---

## GraphiQL

Para probar las queries y mutations, puedes usar GraphiQL en:

```
http://localhost:8080/graphiql
```

Recuerda configurar el header de autorización en la interfaz de GraphiQL.

---

## Versionamiento

- Versión actual de la API: **1.0**
- Esta documentación fue generada el: **26 de Febrero de 2026**

---

## Soporte

Para preguntas o problemas con la API, contacta al equipo de desarrollo.
