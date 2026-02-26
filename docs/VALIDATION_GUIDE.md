# Validaciones Extendidas - Guía de Uso

Este documento explica cómo usar las nuevas validaciones extendidas implementadas en el proyecto.

## Tabla de Contenidos

- [Validadores Personalizados](#validadores-personalizados)
- [Validaciones Asíncronas](#validaciones-asíncronas)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Tests](#tests)

## Validadores Personalizados

Se han añadido validadores personalizados en `src/shared/utils/custom-validators.ts` que cubren casos de uso comunes:

### 1. Validaciones de Fechas

#### `validateDateRange`

Valida que una fecha de inicio sea anterior a una fecha de fin.

```typescript
const schema = z
  .object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine(validateDateRange, {
    message: 'Start date must be before end date',
    path: ['startDate'],
  });
```

#### `validateFutureDate`

Valida que una fecha esté en el futuro.

```typescript
const schema = z.object({
  appointmentDate: z
    .string()
    .datetime()
    .refine(validateFutureDate, { message: 'Appointment must be in the future' }),
});
```

#### `validatePastDate`

Valida que una fecha esté en el pasado.

```typescript
const schema = z.object({
  birthDate: z
    .string()
    .datetime()
    .refine(validatePastDate, { message: 'Birth date must be in the past' }),
});
```

### 2. Validaciones de Base de Datos

#### `createUniqueValidator`

Crea un validador para verificar unicidad en la base de datos.

```typescript
// En tu servicio
export async function isEmailUnique(email: string): Promise<boolean> {
  const user = await db.users.findOne({ email });
  return !user; // true si es único
}

// En tu schema
const schema = z.object({
  email: z
    .string()
    .email()
    .refine(createUniqueValidator(isEmailUnique), { message: 'Email already exists' }),
});
```

#### `createExistsValidator`

Crea un validador para verificar que una entidad existe.

```typescript
// En tu servicio
export async function categoryExists(categoryId: string): Promise<boolean> {
  const category = await db.categories.findById(categoryId);
  return !!category;
}

// En tu schema
const schema = z.object({
  categoryId: commonSchemas.uuid.refine(createExistsValidator(categoryExists), {
    message: 'Category does not exist',
  }),
});
```

### 3. Validaciones Condicionales

#### `validateConditionalField`

Requiere un campo basado en el valor de otro campo.

```typescript
const schema = z
  .object({
    type: z.enum(['recurring', 'one-time']),
    frequency: z.string().optional(),
  })
  .refine(validateConditionalField('type', 'recurring', 'frequency'), {
    message: 'Frequency is required for recurring items',
  });
```

#### `validateAtLeastOne`

Requiere al menos uno de los campos especificados.

```typescript
const schema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .refine(validateAtLeastOne('email', 'phone'), {
    message: 'At least one contact method is required',
  });
```

#### `validateExactlyOne`

Requiere exactamente uno de los campos especificados.

```typescript
const schema = z
  .object({
    cardId: z.string().optional(),
    bankAccountId: z.string().optional(),
    cashAmount: z.number().optional(),
  })
  .refine(validateExactlyOne('cardId', 'bankAccountId', 'cashAmount'), {
    message: 'Exactly one payment method must be specified',
  });
```

### 4. Validaciones de Campos Relacionados

#### `validateFieldsMatch`

Valida que dos campos tengan el mismo valor.

```typescript
const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine(validateFieldsMatch('password', 'confirmPassword'), {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

#### `validateNumericRange`

Valida que un valor mínimo sea menor o igual al máximo.

```typescript
const schema = z
  .object({
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
  })
  .refine(validateNumericRange, { message: 'Min price cannot be greater than max price' });
```

### 5. Schemas Comunes Reutilizables

El módulo `commonSchemas` proporciona validaciones frecuentemente usadas:

```typescript
import { commonSchemas } from '../shared/utils/custom-validators';

const schema = z.object({
  id: commonSchemas.uuid, // UUID v4 o v7
  date: commonSchemas.isoDate, // Fecha ISO
  amount: commonSchemas.money, // Decimal con max 2 decimales
  count: commonSchemas.positiveInt, // Entero positivo
  offset: commonSchemas.offset, // Paginación offset (default: 0)
  limit: commonSchemas.limit, // Paginación limit (default: 20)
  sort: commonSchemas.sortDirection, // 'asc' o 'desc' (default: 'desc')
});
```

## Validaciones Asíncronas

Se han añadido nuevas funciones para manejar validaciones asíncronas en `src/graphql/utils/validation.ts`:

### `withAsyncValidation`

Wrapper para resolvers que usan validaciones asíncronas (como checks a base de datos).

```typescript
import { withAsyncValidation } from '../graphql/utils/validation';

const schema = z.object({
  email: z
    .string()
    .email()
    .refine(
      async (email) => {
        const exists = await userService.emailExists(email);
        return !exists;
      },
      { message: 'Email already exists' }
    ),
});

const resolver = withAsyncValidation(schema, async (_, { input }, context) => {
  return await userService.createUser(input);
});
```

### `withAsyncValidatedResolver`

Combina validación asíncrona con manejo de errores. **Recomendado para uso en producción**.

```typescript
import { withAsyncValidatedResolver } from '../graphql/utils/validation';

const resolvers = {
  Mutation: {
    registerUser: withAsyncValidatedResolver(
      userRegistrationSchema,
      async (_, { input }, context) => {
        const user = await userService.createUser(input);
        return { user, token: generateToken(user) };
      },
      'registerUser'
    ),
  },
};
```

## Ejemplos de Uso

### Ejemplo Completo: Registro de Usuario

```typescript
// validators/user.validator.ts
import { z } from 'zod';
import { createUniqueValidator, validateFieldsMatch } from '../shared/utils/custom-validators';
import { isEmailUnique, isUsernameUnique } from '../services/user.service';

export const userRegistrationSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email format')
      .refine(createUniqueValidator(isEmailUnique), { message: 'Email already exists' }),
    username: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[a-zA-Z0-9_]+$/)
      .refine(createUniqueValidator(isUsernameUnique), { message: 'Username already taken' }),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine(validateFieldsMatch('password', 'confirmPassword'), {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// graphql/resolvers/user.resolvers.ts
import { withAsyncValidatedResolver } from '../utils/validation';
import { userRegistrationSchema } from '../../validators/user.validator';

export const userResolvers = {
  Mutation: {
    registerUser: withAsyncValidatedResolver(
      userRegistrationSchema,
      async (_, { input }, context) => {
        const user = await userService.createUser(input);
        const token = generateToken(user);
        return { user, token };
      },
      'registerUser'
    ),
  },
};
```

### Ejemplo: Crear Evento con Validación de Fechas

```typescript
// validators/event.validator.ts
import { z } from 'zod';
import { validateDateRange } from '../shared/utils/custom-validators';

export const createEventSchema = z
  .object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    location: z.string().optional(),
  })
  .refine(validateDateRange, {
    message: 'Start date must be before end date',
    path: ['startDate'],
  });

// graphql/resolvers/event.resolvers.ts
import { withValidatedResolver } from '../utils/validation';
import { createEventSchema } from '../../validators/event.validator';

export const eventResolvers = {
  Mutation: {
    createEvent: withValidatedResolver(
      createEventSchema,
      async (_, { input }, context) => {
        requireAuth(context);
        return await eventService.create(context.user.id, input);
      },
      'createEvent'
    ),
  },
};
```

### Ejemplo: Query con Paginación y Filtros

```typescript
// validators/expense.validator.ts
import { z } from 'zod';
import {
  validateDateRange,
  validateNumericRange,
  commonSchemas,
} from '../shared/utils/custom-validators';

export const queryExpensesSchema = z
  .object({
    offset: commonSchemas.offset,
    limit: commonSchemas.limit,
    sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
    sortDirection: commonSchemas.sortDirection,
    categoryId: commonSchemas.uuid.optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
  })
  .refine((data) => validateDateRange({ startDate: data.startDate, endDate: data.endDate }), {
    message: 'Start date must be before end date',
  })
  .refine((data) => validateNumericRange({ min: data.minAmount, max: data.maxAmount }), {
    message: 'Min amount cannot be greater than max amount',
  });

// graphql/resolvers/expense.resolvers.ts
export const expenseResolvers = {
  Query: {
    expenses: withValidatedResolver(
      queryExpensesSchema,
      async (_, args, context) => {
        requireAuth(context);
        return await expenseService.query(context.user.id, args);
      },
      'expenses'
    ),
  },
};
```

## Tests

### Ejecutar Tests

```bash
# Todos los tests de validación
npm test -- validation

# Tests de validadores personalizados
npm test -- custom-validators

# Tests con cobertura
npm test -- --coverage validation
```

### Escribir Tests para tus Validadores

```typescript
import { validateDateRange } from '../shared/utils/custom-validators';

describe('My Custom Validator', () => {
  it('should validate date range', () => {
    const data = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    };
    expect(validateDateRange(data)).toBe(true);
  });
});
```

### Tests para Validaciones Asíncronas

```typescript
import { createUniqueValidator } from '../shared/utils/custom-validators';

describe('Async Validations', () => {
  it('should validate uniqueness', async () => {
    const mockCheck = jest.fn().mockResolvedValue(true);
    const validator = createUniqueValidator(mockCheck);

    const result = await validator('test@example.com');

    expect(result).toBe(true);
    expect(mockCheck).toHaveBeenCalledWith('test@example.com');
  });
});
```

## Mejores Prácticas

1. **Usa validaciones síncronas cuando sea posible**: Son más rápidas y simples.

2. **Para validaciones de DB, usa validaciones asíncronas**: Utiliza `withAsyncValidatedResolver` para resolvers con checks a base de datos.

3. **Combina validaciones**: Puedes encadenar múltiples `.refine()` para lógica compleja.

4. **Especifica rutas de error**: Usa `path` en el segundo argumento de `refine()` para asociar errores con campos específicos.

5. **Reutiliza schemas comunes**: Usa `commonSchemas` para validaciones frecuentes como UUIDs, dinero, paginación.

6. **Sanitiza datos sensibles**: Los campos como `password`, `token`, etc. se sanitizan automáticamente en los logs.

7. **Escribe tests**: Cada validador personalizado debe tener tests unitarios.

## Archivos Relevantes

- `src/shared/utils/custom-validators.ts` - Validadores personalizados
- `src/graphql/utils/validation.ts` - Wrappers de validación para resolvers
- `src/validators/examples.ts` - Ejemplos de uso
- `tests/unit/shared/custom-validators.test.ts` - Tests de validadores
- `tests/unit/graphql/validation.test.ts` - Tests de wrappers GraphQL

## Recursos Adicionales

- [Documentación de Zod](https://zod.dev/)
- [GraphQL Error Handling](https://www.apollographql.com/docs/apollo-server/data/errors/)
- [Custom Validation Guide](https://zod.dev/?id=refine)
