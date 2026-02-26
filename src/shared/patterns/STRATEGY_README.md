# Generic Strategy Pattern Infrastructure

Infraestructura reutilizable para implementar el patrón Strategy sin repetir código.

## 📁 Archivos

- **`strategy.ts`** - Infraestructura genérica (interfaces, tipos, helpers)
- **`strategy.examples.ts`** - Ejemplos de uso para diferentes casos
- **`balance-strategies.ts`** (en `shared/utils/`) - Implementación real para balances

## 🎯 Conceptos Básicos

### 1. Interface Genérica
```typescript
interface Strategy<TParams, TResult = void> {
  execute(params: TParams): Promise<TResult>;
}
```

### 2. Executor Genérico
```typescript
async function executeStrategy<TParams, TResult>(
  strategy: Strategy<TParams, TResult>,
  params: TParams
): Promise<TResult>
```

### 3. Helpers
- `StrategyCollection<TParams, TResult>` - Type para colecciones
- `BaseStrategy<TParams, TResult>` - Clase base con hooks opcionales

## 🚀 Cómo Crear Una Nueva Estrategia

### Paso 1: Define tus tipos
```typescript
interface MyParams {
  userId: string;
  amount: number;
}

interface MyResult {
  success: boolean;
  transactionId: string;
}
```

### Paso 2: Crea clases concretas
```typescript
import { Strategy } from '../patterns/strategy';

class StrategyA implements Strategy<MyParams, MyResult> {
  async execute(params: MyParams): Promise<MyResult> {
    // Tu lógica aquí
    return { success: true, transactionId: '123' };
  }
}

class StrategyB implements Strategy<MyParams, MyResult> {
  async execute(params: MyParams): Promise<MyResult> {
    // Lógica alternativa
    return { success: true, transactionId: '456' };
  }
}
```

### Paso 3: Crea una colección
```typescript
import { StrategyCollection } from '../patterns/strategy';

export const myStrategies: StrategyCollection<MyParams, MyResult> = {
  strategyA: new StrategyA(),
  strategyB: new StrategyB(),
};
```

### Paso 4: Úsalo
```typescript
import { executeStrategy } from '../patterns/strategy';
import { myStrategies } from './my-strategies';

const result = await executeStrategy(myStrategies.strategyA, {
  userId: '123',
  amount: 100,
});

console.log(result.transactionId); // '123'
```

## 📚 Ejemplos de Uso

### Estrategia Simple (sin retorno)
```typescript
interface EmailParams {
  to: string;
  subject: string;
  body: string;
}

class SendGridStrategy implements Strategy<EmailParams, void> {
  async execute(params: EmailParams): Promise<void> {
    // Enviar email con SendGrid
  }
}

const emailStrategies = {
  sendgrid: new SendGridStrategy(),
};

await executeStrategy(emailStrategies.sendgrid, {
  to: 'user@example.com',
  subject: 'Hello',
  body: 'World',
});
```

### Estrategia con Retorno
```typescript
interface PaymentParams {
  amount: number;
  currency: string;
}

interface PaymentResult {
  transactionId: string;
  status: 'success' | 'failed';
}

class StripeStrategy implements Strategy<PaymentParams, PaymentResult> {
  async execute(params: PaymentParams): Promise<PaymentResult> {
    // Procesar pago con Stripe
    return {
      transactionId: 'stripe_123',
      status: 'success',
    };
  }
}

const paymentStrategies = {
  stripe: new StripeStrategy(),
};

const result = await executeStrategy(paymentStrategies.stripe, {
  amount: 100,
  currency: 'USD',
});
```

### Estrategia con Hooks (usando BaseStrategy)
```typescript
import { BaseStrategy } from '../patterns/strategy';

class MyStrategy extends BaseStrategy<MyParams, MyResult> {
  protected validate(params: MyParams): void {
    if (!params.userId) throw new Error('userId required');
  }

  protected async before(params: MyParams): Promise<void> {
    console.log('Before execution');
  }

  async execute(params: MyParams): Promise<MyResult> {
    this.validate(params);
    await this.before(params);
    
    // Tu lógica
    const result = { success: true, transactionId: '123' };
    
    await this.after(params, result);
    return result;
  }

  protected async after(params: MyParams, result: MyResult): Promise<void> {
    console.log('After execution');
  }
}
```

### Estrategia Específica (con métodos adicionales)

Si necesitas métodos adicionales además de `execute()`, puedes extender la interface:

```typescript
interface BalanceUpdateStrategy extends Strategy<BalanceUpdateParams, void> {
  updateWalletBalance(params: BalanceUpdateParams): Promise<void>;
  updateBudgetBalance(params: BalanceUpdateParams): Promise<void>;
}

class ApplyBalanceStrategy implements BalanceUpdateStrategy {
  async execute(params: BalanceUpdateParams): Promise<void> {
    await this.updateWalletBalance(params);
    await this.updateBudgetBalance(params);
  }

  async updateWalletBalance(params: BalanceUpdateParams): Promise<void> {
    // Lógica específica
  }

  async updateBudgetBalance(params: BalanceUpdateParams): Promise<void> {
    // Lógica específica
  }
}

// Usa Record<string, TuInterface> en lugar de StrategyCollection genérica
export const balanceStrategies: Record<string, BalanceUpdateStrategy> = {
  apply: new ApplyBalanceStrategy(),
};
```

## 🎨 Pattern para Executor Personalizado

Puedes crear funciones wrapper para mayor comodidad:

```typescript
export async function sendEmail(
  strategy: Strategy<EmailParams, void>,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  await executeStrategy(strategy, { to, subject, body });
}

// Uso
await sendEmail(emailStrategies.sendgrid, 'user@example.com', 'Hi', 'Hello World');
```

## 🔄 Caso Real: Balance Strategies

Ver `shared/utils/balance-strategies.ts` para un ejemplo completo de implementación.

**Características:**
- ✅ Interface específica con métodos adicionales
- ✅ Dos estrategias: `apply` y `reverse`
- ✅ Executor personalizado: `updateBalances()`
- ✅ Reutilizable desde expenses, facturas, transferencias, etc.

## 📋 Checklist para Nueva Estrategia

- [ ] Define interface de parámetros
- [ ] Define tipo de resultado (o usa `void`)
- [ ] Crea clases que implementen `Strategy<TParams, TResult>`
- [ ] Implementa método `execute()`
- [ ] Crea colección tipada
- [ ] (Opcional) Crea executor personalizado
- [ ] Usa `executeStrategy()` o tu executor personalizado

## 💡 Ventajas

✅ **Sin boilerplate** - Reutiliza la infraestructura genérica
✅ **Type-safe** - TypeScript valida todo
✅ **Consistente** - Mismo patrón para todos los casos
✅ **Testeable** - Estrategias independientes son fáciles de testear
✅ **Extensible** - Agrega nuevas estrategias sin modificar existentes
✅ **Mantenible** - Lógica centralizada y organizada

## 🔗 Referencias

- Patrón Strategy: https://refactoring.guru/design-patterns/strategy
- Ver ejemplos completos en `strategy.examples.ts`
- Implementación real en `balance-strategies.ts`
