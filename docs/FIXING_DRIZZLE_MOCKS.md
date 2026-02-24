# Guía para Arreglar los Mocks de Drizzle ORM

## Problema Identificado

Los tests de servicios están usando mocks que no coinciden con la API de Drizzle ORM. Drizzle usa un patrón de "relational queries" que es diferente al query builder tradicional.

### ❌ Lo que NO funciona

```typescript
// Nuestro mock actual (INCORRECTO)
mockDb.select().from(walletWallets).where(...).mockResolvedValue(...)
```

### ✅ Lo que SÍ funciona

```typescript
// API real de Drizzle
await db.query.walletWallets.findFirst({
  where: eq(walletWallets.id, walletId),
});

// Mock correcto
mockDb.query.walletWallets.findFirst.mockResolvedValue(wallet);
```

## Patrones de Drizzle a Mockear

### 1. Query Methods (findFirst, findMany)

```typescript
// Estructura del mock
const mockDb = {
  query: {
    walletWallets: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    walletExpenseCategories: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    walletExpenses: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
};

// Uso en tests
mockDb.query.walletWallets.findFirst.mockResolvedValue({
  id: '1',
  name: 'Test Wallet',
  userId: 'user-1',
});
```

### 2. Insert Methods

```typescript
// API real
await db.insert(walletWallets).values(newWallet).returning();

// Mock con chaining
const mockReturning = jest.fn().mockResolvedValue([newWallet]);
const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

mockDb.insert = mockInsert;

// Uso
mockDb.insert.mockReturnValue({
  values: jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue([newWallet]),
  }),
});
```

### 3. Update Methods

```typescript
// API real
await db.update(walletWallets).set(updates).where(eq(walletWallets.id, id)).returning();

// Mock con chaining
mockDb.update.mockReturnValue({
  set: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([updatedWallet]),
    }),
  }),
});
```

### 4. Delete Methods

```typescript
// API real
await db.delete(walletWallets).where(eq(walletWallets.id, id)).returning();

// Mock con chaining
mockDb.delete.mockReturnValue({
  where: jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue([deletedWallet]),
  }),
});
```

## Plan de Acción

### Paso 1: Actualizar `tests/helpers/mocks.ts`

Crear una estructura de mock completa que soporte todos los patrones de Drizzle:

```typescript
export const createMockDb = () => {
  // Query methods (relational queries)
  const mockQuery = {
    walletWallets: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    walletExpenseCategories: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    walletExpenses: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  // Insert method
  const mockInsert = jest.fn();

  // Update method
  const mockUpdate = jest.fn();

  // Delete method
  const mockDelete = jest.fn();

  const mockDb = {
    query: mockQuery,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };

  return mockDb;
};

// Helper para configurar insert chain
export const mockInsertChain = (mockDb: any, returnValue: any) => {
  mockDb.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([returnValue]),
    }),
  });
};

// Helper para configurar update chain
export const mockUpdateChain = (mockDb: any, returnValue: any) => {
  mockDb.update.mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([returnValue]),
      }),
    }),
  });
};

// Helper para configurar delete chain
export const mockDeleteChain = (mockDb: any, returnValue: any) => {
  mockDb.delete.mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([returnValue]),
    }),
  });
};
```

### Paso 2: Actualizar Tests de Wallet Service

Ejemplo de cómo debe verse un test actualizado:

```typescript
describe('WalletService.getWalletById', () => {
  it('debería retornar un wallet por id', async () => {
    const wallet = createMockWallet();

    // Mock usando relational query
    mockDb.query.walletWallets.findFirst.mockResolvedValue(wallet);

    const result = await walletService.getWalletById('wallet-1', 'user-1');

    expect(mockDb.query.walletWallets.findFirst).toHaveBeenCalledWith({
      where: expect.any(Function), // Drizzle usa funciones para where
    });
    expect(result).toEqual(wallet);
  });
});

describe('WalletService.createWallet', () => {
  it('debería crear un nuevo wallet', async () => {
    const newWallet = createMockWallet();
    const input = { name: newWallet.name, userId: newWallet.userId };

    // Mock usando insert chain
    mockInsertChain(mockDb, newWallet);

    const result = await walletService.createWallet(input);

    expect(mockDb.insert).toHaveBeenCalledWith(walletWallets);
    expect(result).toEqual(newWallet);
  });
});
```

### Paso 3: Verificar los Servicios Reales

Antes de actualizar los tests, revisar cómo se usa Drizzle en los servicios:

```bash
# Buscar patrones de uso
grep -n "db.query" src/services/*.ts
grep -n "db.insert" src/services/*.ts
grep -n "db.update" src/services/*.ts
grep -n "db.delete" src/services/*.ts
```

### Paso 4: Actualizar Tests en Orden

1. **wallet.service.test.ts** (más simple, buen punto de partida)
2. **expense-category.service.test.ts** (similar a wallet)
3. **expense.service.test.ts** (más complejo, tiene transacciones)

### Paso 5: Manejar Transacciones

Los tests de expense service usan transacciones:

```typescript
// API real
await pool.query('BEGIN');
try {
  // operaciones
  await pool.query('COMMIT');
} catch (error) {
  await pool.query('ROLLBACK');
  throw error;
}

// Mock
mockPool.query.mockImplementation((query: string) => {
  if (query === 'BEGIN') return Promise.resolve();
  if (query === 'COMMIT') return Promise.resolve();
  if (query === 'ROLLBACK') return Promise.resolve();
  return Promise.resolve({ rows: [], rowCount: 0 });
});
```

## Comandos Útiles

```bash
# Ver estructura actual de un servicio
cat src/services/wallet.service.ts | grep -A5 "db\."

# Ejecutar tests específicos
npm test -- wallet.service.test.ts

# Ver solo errores
npm test -- wallet.service.test.ts 2>&1 | grep -A3 "Error:"

# Ejecutar un solo test
npm test -- wallet.service.test.ts -t "debería retornar un wallet por id"
```

## Alternativa: Usar Base de Datos Real

Si los mocks son demasiado complejos, considerar:

```typescript
// tests/setup.ts
beforeAll(async () => {
  // Conectar a base de datos de test
  await db.migrate.latest();
});

afterEach(async () => {
  // Limpiar datos
  await db.delete(walletExpenses);
  await db.delete(walletExpenseCategories);
  await db.delete(walletWallets);
});
```

**Pros:**

- Tests más realistas
- No necesitas mockear Drizzle
- Prueban queries reales

**Contras:**

- Más lentos
- Requieren Docker/DB disponible
- Más setup

## Recursos

- [Drizzle ORM Queries](https://orm.drizzle.team/docs/rqb)
- [Jest Mocking Guide](https://jestjs.io/docs/mock-functions)
- Nuestro código real: `src/services/wallet.service.ts`

---

**Estado**: Documentación para implementación futura  
**Prioridad**: Alta (bloquea coverage de tests)  
**Tiempo estimado**: 2-3 horas
