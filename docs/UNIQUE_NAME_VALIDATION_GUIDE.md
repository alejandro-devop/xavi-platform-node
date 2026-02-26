# Validaciones de Nombres Únicos - Guía de Prueba

## ✅ Implementación Completada

Se han implementado validaciones de nombres únicos para **wallets** y **expense categories** usando los validadores personalizados asíncronos.

## 🔍 ¿Qué se Implementó?

### 1. Métodos de Servicios
Agregados en los servicios para verificar unicidad:

**`walletService.isNameUnique(userId, name, excludeId?)`**
- Verifica si un nombre de wallet es único para un usuario
- `excludeId` opcional para excluir el wallet actual durante actualizaciones

**`expenseCategoryService.isNameUnique(userId, name, excludeId?)`**
- Verifica si un nombre de categoría es único para un usuario
- `excludeId` opcional para excluir la categoría actual durante actualizaciones

### 2. Schemas con Validación Asíncrona

**Wallets:**
- `createWalletInputSchema(userId)` - Con validación de nombre único para creación
- `createWalletUpdateSchema(userId, walletId)` - Con validación de nombre único para actualización

**Categories:**
- `createExpenseCategoryInputSchema(userId)` - Con validación de nombre único para creación
- `createExpenseCategoryUpdateSchema(userId, categoryId)` - Con validación de nombre único para actualización

### 3. Resolvers GraphQL Actualizados
Los resolvers ahora usan `withAsyncValidatedResolver` para soportar validaciones asíncronas.

## 🧪 Tests

Se crearon **14 tests** que cubren:
- ✅ Validación de nombres únicos al crear wallets
- ✅ Validación de nombres únicos al actualizar wallets
- ✅ Validación de nombres únicos al crear categorías
- ✅ Validación de nombres únicos al actualizar categorías
- ✅ Validaciones síncronas junto con asíncronas
- ✅ Actualizaciones parciales sin cambio de nombre
- ✅ Validaciones concurrentes

### Ejecutar Tests

```bash
npm test -- unique-name-validation.test.ts
```

## 🚀 Cómo Probar con GraphQL

### 1. Iniciar el Servidor
```bash
npm run docker:dev
```

### 2. Acceder a GraphiQL
Abre tu navegador en: `http://localhost:4000/graphql`

### 3. Crear un Wallet (Primera vez - ÉXITO)

```graphql
mutation {
  walletAdd(input: {
    name: "Mi Billetera Principal"
    icon: "wallet"
    initialBalance: 1000
    isMain: true
  }) {
    id
    name
    balance
    isMain
  }
}
```

**Resultado esperado:** ✅ Wallet creado exitosamente

### 4. Intentar Crear Wallet con Nombre Duplicado (FALLO)

```graphql
mutation {
  walletAdd(input: {
    name: "Mi Billetera Principal"
    icon: "cash"
    initialBalance: 500
  }) {
    id
    name
  }
}
```

**Resultado esperado:** ❌ Error de validación

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "validationErrors": [
          {
            "path": ["name"],
            "message": "A wallet with this name already exists"
          }
        ]
      }
    }
  ]
}
```

### 5. Crear Categoría (Primera vez - ÉXITO)

```graphql
mutation {
  walletExpenseCategoryAdd(input: {
    name: "Alimentación"
    type: expense
    color: "#FF5733"
    icon: "food"
  }) {
    id
    name
    type
    color
  }
}
```

**Resultado esperado:** ✅ Categoría creada exitosamente

### 6. Intentar Crear Categoría con Nombre Duplicado (FALLO)

```graphql
mutation {
  walletExpenseCategoryAdd(input: {
    name: "Alimentación"
    type: expense
    color: "#00FF00"
  }) {
    id
    name
  }
}
```

**Resultado esperado:** ❌ Error de validación

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "validationErrors": [
          {
            "path": ["name"],
            "message": "A category with this name already exists"
          }
        ]
      }
    }
  ]
}
```

### 7. Actualizar Wallet con Nombre Único (ÉXITO)

```graphql
mutation {
  walletUpdate(
    id: "tu-wallet-id-aqui"
    input: {
      name: "Mi Billetera Actualizada"
    }
  ) {
    id
    name
    balance
  }
}
```

**Resultado esperado:** ✅ Wallet actualizado exitosamente

### 8. Actualizar Wallet con Nombre Existente (FALLO)

Si ya tienes un wallet llamado "Efectivo", intentar cambiar otro wallet a ese nombre:

```graphql
mutation {
  walletUpdate(
    id: "tu-wallet-id-aqui"
    input: {
      name: "Efectivo"
    }
  ) {
    id
    name
  }
}
```

**Resultado esperado:** ❌ Error de validación

### 9. Actualizar Wallet Manteniendo el Mismo Nombre (ÉXITO)

```graphql
mutation {
  walletUpdate(
    id: "tu-wallet-id-aqui"
    input: {
      name: "Mi Billetera Principal"
      balance: 2000
    }
  ) {
    id
    name
    balance
  }
}
```

**Resultado esperado:** ✅ Wallet actualizado (el nombre no cambia, no hay conflicto)

## 📊 Casos de Prueba Cubiertos

| Escenario | Wallet | Category | Estado |
|-----------|--------|----------|--------|
| Crear con nombre único | ✅ | ✅ | Funciona |
| Crear con nombre duplicado | ❌ | ❌ | Error (esperado) |
| Actualizar con nombre único | ✅ | ✅ | Funciona |
| Actualizar con nombre duplicado | ❌ | ❌ | Error (esperado) |
| Actualizar sin cambiar nombre | ✅ | ✅ | Funciona |
| Actualizar solo otros campos | ✅ | ✅ | Funciona |

## 🔧 Archivos Modificados

### Servicios
- `src/services/wallet.service.ts` - Método `isNameUnique` agregado
- `src/services/expense-category.service.ts` - Método `isNameUnique` agregado

### Schemas
- `src/validators/schemas/wallet.schemas.ts` - Factory functions con validación async
- `src/validators/schemas/expense-category.schemas.ts` - Factory functions con validación async

### Resolvers
- `src/graphql/modules/wallet/wallet.resolvers.ts` - Usa `withAsyncValidatedResolver`
- `src/graphql/modules/expense-category/expense-category.resolvers.ts` - Usa `withAsyncValidatedResolver`

### Tests
- `tests/unit/validators/unique-name-validation.test.ts` - 14 tests (todos pasando ✅)

## 💡 Características Clave

1. **Validación a Nivel de Usuario**: Los nombres solo deben ser únicos dentro del contexto del usuario
2. **Exclusión en Actualizaciones**: Al actualizar, se excluye el ID actual para permitir mantener el mismo nombre
3. **Validación Asíncrona**: Usa `createUniqueValidator` con queries a la base de datos
4. **Mensajes de Error Claros**: "A wallet/category with this name already exists"
5. **Integración con GraphQL**: Errores formateados como `BAD_USER_INPUT` con detalles de validación
6. **Validaciones Síncronas Primero**: Longitud, formato, etc. se validan antes de hacer queries a la DB

## 🎯 Próximos Pasos Sugeridos

1. ✅ **Probar manualmente** con GraphiQL siguiendo esta guía
2. ✅ **Verificar comportamiento** con diferentes usuarios (cada uno puede tener "Efectivo" como nombre)
3. ✅ **Validar performance** - Los queries son eficientes (índices en `name` y `userId`)
4. ✅ **Documentar** en el API documentation si existe

## 🐛 Troubleshooting

**Si las validaciones no funcionan:**
1. Verificar que el servidor esté corriendo
2. Verificar que tienes un token de autenticación válido
3. Verificar en los logs del servidor para ver los queries de base de datos
4. Ejecutar los tests para verificar la lógica: `npm test -- unique-name-validation.test.ts`

**Si los tests fallan:**
1. Verificar que la base de datos de test esté limpia
2. Verificar que los mocks estén configurados correctamente
3. Revisar los logs de error detallados

## ✨ Ejemplo Completo de Flujo

```graphql
# 1. Crear primer wallet
mutation {
  walletAdd(input: {
    name: "Efectivo"
    icon: "cash"
  }) {
    id
    name
  }
}

# 2. Crear segundo wallet con nombre diferente (OK)
mutation {
  walletAdd(input: {
    name: "Banco"
    icon: "bank"
  }) {
    id
    name
  }
}

# 3. Intentar crear tercero con nombre duplicado (FALLA)
mutation {
  walletAdd(input: {
    name: "Efectivo"
    icon: "wallet"
  }) {
    id
    name
  }
}
# Error: "A wallet with this name already exists"

# 4. Actualizar el segundo wallet con nombre único (OK)
mutation {
  walletUpdate(
    id: "ID-DEL-SEGUNDO-WALLET"
    input: {
      name: "Banco BBVA"
    }
  ) {
    id
    name
  }
}

# 5. Intentar actualizar con nombre del primero (FALLA)
mutation {
  walletUpdate(
    id: "ID-DEL-SEGUNDO-WALLET"
    input: {
      name: "Efectivo"
    }
  ) {
    id
    name
  }
}
# Error: "A wallet with this name already exists"
```

¡Las validaciones de nombres únicos están listas para usar! 🎉
