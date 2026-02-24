# Sistema de Error Handling Centralizado

## Descripción General

El sistema de error handling centralizado proporciona logging estructurado, múltiples niveles de severidad y preparación para herramientas de monitoreo como Datadog, Sentry, etc.

## Características

✅ **Logging Centralizado**: Todos los errores se manejan en un solo lugar  
✅ **Múltiples Niveles**: error, warn, info, debug  
✅ **Metadata Enriquecida**: userId, operación, contexto, stack traces  
✅ **Fácil Integración**: Cambiar de proveedor sin tocar código existente  
✅ **GraphQL Ready**: Utilidades específicas para resolvers

## Arquitectura

```
src/
├── shared/
│   └── errors/
│       ├── index.ts                 # Errores custom (AppError, etc.)
│       └── error-handler.ts         # Error handler centralizado
├── graphql/
│   └── utils/
│       └── error-handler.ts         # Utilidades para GraphQL
└── monitoring/
    └── adapters.example.ts          # Ejemplos de adapters (Datadog, Sentry)
```

## Uso Básico

### En GraphQL Resolvers

Los resolvers de GraphQL usan el wrapper `withErrorHandling`:

```typescript
import { withErrorHandling, requireAuth } from '../../utils/error-handler';
import { walletService } from '../../../services/wallet.service';

export const walletResolvers = {
  Query: {
    wallet: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context, 'wallet');
      return await walletService.getWalletById(id, context.user.id);
    }, 'wallet'),
  },

  Mutation: {
    walletAdd: withErrorHandling(async (_: any, { input }: any, context: any) => {
      requireAuth(context, 'walletAdd');
      return await walletService.createWallet(context.user.id, input);
    }, 'walletAdd'),
  },
};
```

**Beneficios:**

- Logging automático de errores con metadata
- Conversión automática a GraphQLError
- Tracking de usuario automático
- Sanitización de datos sensibles

### Logging Manual

Para logging manual en servicios u otras partes del código:

```typescript
import { errorHandler, LogLevel } from '../shared/errors';

// Log de información
errorHandler.logInfo('Wallet created successfully', {
  userId: user.id,
  operation: 'createWallet',
  resource: wallet.id,
});

// Log de advertencia
errorHandler.logWarning('Wallet balance is low', {
  userId: user.id,
  context: { balance: wallet.balance, threshold: 10 },
});

// Log de error manual
try {
  // ... código que puede fallar
} catch (error) {
  errorHandler.handleError(error as Error, {
    userId: user.id,
    operation: 'processPayment',
    resource: payment.id,
  });
  throw error; // Re-throw si es necesario
}

// Log de debug
errorHandler.logDebug('Database query executed', {
  operation: 'getWallets',
  context: { queryTime: '45ms', rowCount: 10 },
});
```

## Niveles de Logging

| Nivel     | Uso                              | Ejemplo                                   |
| --------- | -------------------------------- | ----------------------------------------- |
| **ERROR** | Errores del servidor (500+)      | Fallo de base de datos, error inesperado  |
| **WARN**  | Errores del cliente (400-499)    | Recurso no encontrado, validación fallida |
| **INFO**  | Operaciones exitosas importantes | Usuario creado, pago procesado            |
| **DEBUG** | Información de debugging         | Query ejecutado, caché hit/miss           |

Los niveles se determinan automáticamente basados en el tipo de error (AppError y su statusCode).

## Integración con Herramientas de Monitoreo

### Cambiar a Datadog

1. **Instalar dependencia:**

   ```bash
   npm install dd-trace
   ```

2. **Crear adapter** (puedes usar el ejemplo en `src/monitoring/adapters.example.ts`):

   ```typescript
   // src/monitoring/datadog-adapter.ts
   import { DatadogMonitoringAdapter } from './adapters.example';
   export { DatadogMonitoringAdapter };
   ```

3. **Configurar en app.ts:**

   ```typescript
   import tracer from 'dd-trace';
   tracer.init({ service: 'xavi-api' });

   import { DatadogMonitoringAdapter } from './monitoring/datadog-adapter';
   import { errorHandler } from './shared/errors';

   errorHandler.setMonitoringAdapter(new DatadogMonitoringAdapter());
   ```

4. **Variables de entorno:**
   ```env
   DD_API_KEY=your-api-key
   DD_SITE=datadoghq.com
   DD_ENV=production
   DD_SERVICE=xavi-api
   ```

### Cambiar a Sentry

1. **Instalar dependencia:**

   ```bash
   npm install @sentry/node
   ```

2. **Configurar en app.ts:**

   ```typescript
   import { SentryMonitoringAdapter } from './monitoring/adapters.example';
   import { errorHandler } from './shared/errors';

   errorHandler.setMonitoringAdapter(new SentryMonitoringAdapter('your-sentry-dsn'));
   ```

### Crear Adapter Personalizado

Para crear tu propio adapter:

```typescript
import { MonitoringAdapter, ErrorMetadata, LogLevel } from '../shared/errors';

export class CustomMonitoringAdapter implements MonitoringAdapter {
  captureError(error: Error, metadata: ErrorMetadata): void {
    // Enviar error a tu servicio de monitoreo
    console.log('Error:', error.message, metadata);
  }

  captureMessage(message: string, level: LogLevel, metadata?: ErrorMetadata): void {
    // Enviar mensaje a tu servicio de monitoreo
    console.log(`[${level}] ${message}`, metadata);
  }

  setUser(userId: string | number): void {
    // Establecer contexto de usuario
    console.log('User context:', userId);
  }
}

// Usar adapter
import { errorHandler } from './shared/errors';
errorHandler.setMonitoringAdapter(new CustomMonitoringAdapter());
```

## Metadata Disponible

```typescript
interface ErrorMetadata {
  userId?: string | number; // ID del usuario
  operation?: string; // Nombre de la operación (ej: 'walletAdd')
  resource?: string; // Recurso afectado (ej: wallet ID)
  context?: Record<string, any>; // Contexto adicional
  stackTrace?: string; // Stack trace del error
  timestamp?: Date; // Timestamp del evento
  errorName?: string; // Nombre del error
}
```

## Ventajas del Sistema

### 1. Cambio de Proveedor Sin Drama

Cambiar de herramienta de monitoreo es tan simple como cambiar el adapter:

```typescript
// De default a Datadog
errorHandler.setMonitoringAdapter(new DatadogMonitoringAdapter());

// De Datadog a Sentry
errorHandler.setMonitoringAdapter(new SentryMonitoringAdapter(dsn));

// De Sentry a tu solución custom
errorHandler.setMonitoringAdapter(new CustomAdapter());
```

**No necesitas tocar ningún otro archivo.** Todo el código de los resolvers, servicios, etc. sigue igual.

### 2. Logging Consistente

Todos los errores se loggean con el mismo formato y metadata:

```json
{
  "level": "error",
  "time": "2024-01-15T10:30:00Z",
  "err": {
    "type": "NotFoundError",
    "message": "Wallet not found",
    "stack": "..."
  },
  "userId": "user-123",
  "operation": "wallet",
  "context": {
    "args": { "id": "wallet-456" },
    "graphql": true
  },
  "statusCode": 404,
  "service": "xavi-api",
  "env": "production"
}
```

### 3. Sanitización Automática

Datos sensibles (password, token, etc.) se redactan automáticamente:

```typescript
// Args originales
{ email: "user@example.com", password: "secret123" }

// En logs
{ email: "user@example.com", password: "[REDACTED]" }
```

### 4. Cloud Run Ready

El logger está configurado para Cloud Run con:

- Formato JSON estructurado
- Campos de severidad compatibles
- Trace context automático
- Pretty printing en desarrollo

## Testing

El sistema es completamente compatible con los tests existentes. Los resolvers siguen lanzando `GraphQLError` como antes:

```typescript
test('should throw error when not authenticated', async () => {
  await expect(
    walletResolvers.Query.wallet(null, { id: 'wallet-1' }, { user: null })
  ).rejects.toThrow(GraphQLError);
});
```

## Best Practices

### ✅ DO

- Usar `withErrorHandling` para todos los resolvers de GraphQL
- Usar `errorHandler.logInfo()` para operaciones importantes exitosas
- Incluir metadata relevante (userId, operation, resource)
- Dejar que el error handler determine el nivel de log automáticamente

### ❌ DON'T

- No usar `console.log()` o `console.error()` directamente
- No duplicar try-catch en resolvers (withErrorHandling ya lo hace)
- No loggear información sensible sin sanitizar
- No olvidar agregar metadata de contexto

## Configuración de Logs

El nivel de logs se controla con la variable de entorno `LOG_LEVEL`:

```env
# Desarrollo (muestra todo)
LOG_LEVEL=debug

# Staging (muestra info, warn, error)
LOG_LEVEL=info

# Producción (solo warn y error)
LOG_LEVEL=warn
```

## Estado Actual

✅ **Implementado en:**

- GraphQL resolvers de wallet
- GraphQL resolvers de expense
- GraphQL resolvers de expense-category

⏳ **Por implementar:**

- GraphQL resolvers de budget, scheduled-expense, etc. (cuando se implementen)
- REST API controllers (opcional, según prioridades)
- Background jobs (si existen)

## Ejemplo Completo

Ver el código en acción:

- **Error Handler**: [src/shared/errors/error-handler.ts](../src/shared/errors/error-handler.ts)
- **GraphQL Utils**: [src/graphql/utils/error-handler.ts](../src/graphql/utils/error-handler.ts)
- **Resolver Example**: [src/graphql/modules/wallet/wallet.resolvers.ts](../src/graphql/modules/wallet/wallet.resolvers.ts)
- **Adapter Examples**: [src/monitoring/adapters.example.ts](../src/monitoring/adapters.example.ts)
