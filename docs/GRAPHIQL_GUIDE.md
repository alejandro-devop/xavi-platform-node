# GraphiQL - Guía de Uso

## 🚀 Acceso Rápido

**URL**: http://localhost:8080/graphiql (solo en desarrollo)

> **Nota**: GraphiQL solo está disponible cuando `NODE_ENV !== 'production'` por razones de seguridad.

## 📖 ¿Qué es GraphiQL?

GraphiQL es un IDE (Entorno de Desarrollo Integrado) interactivo para explorar y probar tu API GraphQL. Es como Postman, pero específicamente diseñado para GraphQL con características avanzadas.

## ✨ Características Principales

### 1. **Explorador de Documentación**

- Haz clic en el botón **"< Docs"** en la esquina superior derecha
- Navega por todas las queries, mutations y tipos disponibles
- Lee descripciones detalladas de cada campo
- Explora el esquema completo de forma interactiva

### 2. **Autocompletado Inteligente**

- Presiona `Ctrl + Space` mientras escribes para ver sugerencias
- El autocompletado es consciente del contexto y del esquema
- Sugerencias incluyen campos, argumentos y tipos

### 3. **Validación en Tiempo Real**

- Los errores de sintaxis se muestran mientras escribes
- Validación de tipos automática
- Sugerencias de corrección en el editor

### 4. **Editor de Headers**

- Haz clic en "Headers" en la parte inferior
- Añade headers personalizados (especialmente útil para autenticación)
- Los headers persisten entre sesiones

### 5. **Historial de Queries**

- Todas tus queries se guardan automáticamente
- Accede al historial desde el panel lateral
- Reutiliza queries anteriores

### 6. **Formateo Automático**

- Presiona `Shift + Ctrl + P` para formatear tu query
- Mantén un código limpio y legible
- Indentación automática

## 🎯 Primeros Pasos

### Query Básica (Sin Autenticación)

```graphql
query HealthCheck {
  health {
    status
    timestamp
  }
}
```

**Resultado esperado:**

```json
{
  "data": {
    "health": {
      "status": "healthy",
      "timestamp": "2026-02-19T..."
    }
  }
}
```

### Query con Autenticación

Para queries que requieren autenticación:

**1. Obtén tu token JWT** (usando el endpoint de login REST):

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu@email.com",
    "password": "tu_password"
  }'
```

**2. En GraphiQL, abre el panel de Headers** (parte inferior):

```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**3. Ejecuta tu query:**

```graphql
query GetMyWallets {
  wallets {
    id
    name
    currency
    balance
    createdAt
  }
}
```

## 📚 Ejemplos de Queries Comunes

### 1. Consultar Wallets con Gastos

```graphql
query WalletsWithExpenses {
  wallets {
    id
    name
    balance
    currency
    expenses: walletExpenses(walletId: $walletId) {
      id
      amount
      description
      date
      category {
        name
        icon
      }
    }
  }
}
```

### 2. Crear un Gasto (Mutation)

```graphql
mutation CreateExpense {
  walletExpenseAdd(
    input: {
      walletId: "wallet-id-here"
      amount: 50.00
      description: "Supermercado"
      date: "2026-02-19"
      isOutcome: true
    }
  ) {
    id
    amount
    description
    wallet {
      name
      balance
    }
  }
}
```

### 3. Usando Variables

En el panel de **Variables** (parte inferior):

```json
{
  "walletId": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 75.5,
  "description": "Gasolina"
}
```

En el editor de queries:

```graphql
mutation CreateExpense($walletId: ID!, $amount: Decimal!, $description: String!) {
  walletExpenseAdd(
    input: {
      walletId: $walletId
      amount: $amount
      description: $description
      date: "2026-02-19"
      isOutcome: true
    }
  ) {
    id
    amount
    description
  }
}
```

## ⌨️ Atajos de Teclado

| Atajo              | Acción                        |
| ------------------ | ----------------------------- |
| `Cmd/Ctrl + Enter` | Ejecutar query                |
| `Ctrl + Space`     | Activar autocompletado        |
| `Shift + Ctrl + P` | Formatear query               |
| `Cmd/Ctrl + F`     | Buscar en el editor           |
| `Cmd/Ctrl + /`     | Comentar/descomentar línea    |
| `Shift + Ctrl + F` | Formatear query (alternativo) |

## 🔍 Exploración del Esquema

### Navegación por Tipos

1. Haz clic en **"< Docs"**
2. Verás tres secciones principales:
   - **Query** - Todas las consultas disponibles (22 queries)
   - **Mutation** - Todas las mutaciones disponibles (79 mutations)
   - **Types** - Todos los tipos de datos disponibles

3. Haz clic en cualquier tipo para ver:
   - Descripción del tipo
   - Campos disponibles
   - Tipos de cada campo
   - Argumentos requeridos/opcionales

### Query de Introspección

GraphQL soporta introspección. Puedes consultar el esquema programáticamente:

```graphql
query IntrospectionQuery {
  __schema {
    types {
      name
      kind
      description
    }
  }
}
```

## 💡 Tips Avanzados

### 1. Fragmentos para Reutilización

```graphql
fragment WalletDetails on Wallet {
  id
  name
  balance
  currency
  createdAt
}

query GetWallets {
  wallets {
    ...WalletDetails
    expenses(limit: 5) {
      id
      amount
      description
    }
  }
}
```

### 2. Aliases para Múltiples Queries

```graphql
query MultipleWallets {
  mainWallet: wallet(id: "wallet-1") {
    name
    balance
  }
  savingsWallet: wallet(id: "wallet-2") {
    name
    balance
  }
}
```

### 3. Directivas @include y @skip

```graphql
query GetWallet($includeExpenses: Boolean!) {
  wallet(id: "wallet-id") {
    name
    balance
    expenses @include(if: $includeExpenses) {
      amount
      description
    }
  }
}
```

Variables:

```json
{
  "includeExpenses": true
}
```

## 🔐 Seguridad

### Solo Desarrollo

GraphiQL está **deshabilitado en producción** por razones de seguridad:

```typescript
// En server.ts
if (process.env.NODE_ENV !== 'production') {
  app.get('/graphiql', ...);
}
```

### Autenticación

- GraphiQL respeta los mismos mecanismos de autenticación que la API
- Usa el header `Authorization: Bearer <token>` para queries autenticadas
- Los tokens expiran según la configuración (ver `JWT_EXPIRES_IN` en `.env`)

## 📊 Operaciones Disponibles

### Resumen del API GraphQL

- **Total de Queries**: 22
- **Total de Mutations**: 79
- **Total de Operaciones**: 101

### Módulos Principales

- **Wallet** (Finanzas): 35 operaciones
- **Habits** (Hábitos): 15 operaciones
- **Activities** (Actividades): 12 operaciones
- **Todos** (Tareas): 10 operaciones
- **Sleep** (Sueño): 8 operaciones
- **Shopping** (Compras): 7 operaciones
- **Learning** (Aprendizaje): 6 operaciones
- **Routines** (Rutinas): 5 operaciones
- **Courses** (Cursos): 3 operaciones

Para ver la documentación completa de todas las operaciones, consulta:

- [GRAPHQL_SCHEMA_COMPLETE.md](./architecture/GRAPHQL_SCHEMA_COMPLETE.md)
- [GRAPHQL_OVERVIEW.md](./architecture/GRAPHQL_OVERVIEW.md)

## 🐛 Troubleshooting

### GraphiQL no carga

**Problema**: Página en blanco o error de carga

**Solución**:

1. Verifica que el servidor esté corriendo: `npm run dev`
2. Confirma que no estás en modo producción
3. Revisa la consola del navegador para errores de CSP
4. Limpia la caché del navegador

### Error de autenticación

**Problema**: "Unauthorized" en queries protegidas

**Solución**:

1. Verifica que el token JWT esté en el header `Authorization`
2. Asegúrate de usar el formato: `Bearer <token>`
3. Confirma que el token no haya expirado
4. Verifica que el usuario exista en la base de datos

### Autocompletado no funciona

**Problema**: `Ctrl+Space` no muestra sugerencias

**Solución**:

1. Espera a que GraphiQL cargue el esquema completamente
2. Verifica que el endpoint GraphQL esté respondiendo
3. Revisa la consola para errores de introspección
4. Recarga la página

## 📚 Recursos Adicionales

- [GraphQL Official Docs](https://graphql.org/learn/)
- [GraphiQL GitHub](https://github.com/graphql/graphiql)
- [Apollo GraphQL Docs](https://www.apollographql.com/docs/)
- Documentación del proyecto en `/docs/architecture/`

## 🎓 Próximos Pasos

1. **Explora el esquema** usando el panel de Docs
2. **Prueba queries básicas** sin autenticación (health check)
3. **Configura autenticación** y prueba queries protegidas
4. **Experimenta con mutations** para modificar datos
5. **Usa variables** para queries dinámicas
6. **Lee la documentación completa** en GRAPHQL_OVERVIEW.md

---

**¡Disfruta explorando tu API GraphQL con GraphiQL!** 🚀
