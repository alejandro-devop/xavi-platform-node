/**
 * EXAMPLE: How to create new strategies using the generic infrastructure
 * 
 * This file demonstrates the pattern for creating reusable strategies.
 * Copy this pattern for your own use cases (emails, notifications, payments, etc.)
 */

import { Strategy, executeStrategy, StrategyCollection, BaseStrategy } from '../patterns/strategy';

// ============================================
// EXAMPLE 1: Simple Strategy (Email sending)
// ============================================

interface EmailParams {
  to: string;
  subject: string;
  body: string;
}

class SendGridEmailStrategy implements Strategy<EmailParams, void> {
  async execute(params: EmailParams): Promise<void> {
    console.log(`[SendGrid] Sending email to ${params.to}`);
    // SendGrid API call here
  }
}

class SESEmailStrategy implements Strategy<EmailParams, void> {
  async execute(params: EmailParams): Promise<void> {
    console.log(`[AWS SES] Sending email to ${params.to}`);
    // AWS SES API call here
  }
}

// Create collection
export const emailStrategies: StrategyCollection<EmailParams, void> = {
  sendgrid: new SendGridEmailStrategy(),
  ses: new SESEmailStrategy(),
};

// Usage:
// await executeStrategy(emailStrategies.sendgrid, { to: '...', subject: '...', body: '...' });

// ============================================
// EXAMPLE 2: Strategy with Return Value
// ============================================

interface PaymentParams {
  amount: number;
  currency: string;
  customerId: string;
}

interface PaymentResult {
  transactionId: string;
  status: 'success' | 'failed';
}

class StripePaymentStrategy implements Strategy<PaymentParams, PaymentResult> {
  async execute(params: PaymentParams): Promise<PaymentResult> {
    console.log(`[Stripe] Processing payment of ${params.amount} ${params.currency}`);
    
    // Stripe API call here
    return {
      transactionId: 'stripe_' + Date.now(),
      status: 'success',
    };
  }
}

class PayPalPaymentStrategy implements Strategy<PaymentParams, PaymentResult> {
  async execute(params: PaymentParams): Promise<PaymentResult> {
    console.log(`[PayPal] Processing payment of ${params.amount} ${params.currency}`);
    
    // PayPal API call here
    return {
      transactionId: 'paypal_' + Date.now(),
      status: 'success',
    };
  }
}

export const paymentStrategies: StrategyCollection<PaymentParams, PaymentResult> = {
  stripe: new StripePaymentStrategy(),
  paypal: new PayPalPaymentStrategy(),
};

// Usage:
// const result = await executeStrategy(paymentStrategies.stripe, { amount: 100, currency: 'USD', customerId: '123' });
// console.log(result.transactionId);

// ============================================
// EXAMPLE 3: Using BaseStrategy with hooks
// ============================================

interface NotificationParams {
  userId: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

class PushNotificationStrategy extends BaseStrategy<NotificationParams, void> {
  protected validate(params: NotificationParams): void {
    if (!params.userId) throw new Error('userId is required');
    if (!params.message) throw new Error('message is required');
  }

  protected async before(params: NotificationParams): Promise<void> {
    console.log(`[Before] Preparing to send notification to user ${params.userId}`);
  }

  async execute(params: NotificationParams): Promise<void> {
    this.validate(params);
    await this.before(params);
    
    console.log(`[Push] Sending notification: ${params.message}`);
    // Push notification API call here
    
    await this.after(params, undefined);
  }

  protected async after(params: NotificationParams, result: void): Promise<void> {
    console.log(`[After] Notification sent successfully to user ${params.userId}`);
  }
}

class SMSNotificationStrategy extends BaseStrategy<NotificationParams, void> {
  async execute(params: NotificationParams): Promise<void> {
    console.log(`[SMS] Sending SMS: ${params.message}`);
    // SMS API call here
  }
}

export const notificationStrategies: StrategyCollection<NotificationParams, void> = {
  push: new PushNotificationStrategy(),
  sms: new SMSNotificationStrategy(),
};

// Usage:
// await executeStrategy(notificationStrategies.push, { userId: '123', message: 'Hello!', priority: 'high' });

// ============================================
// EXAMPLE 4: Strategy with custom executor
// ============================================

interface CacheParams {
  key: string;
  value: any;
  ttl?: number;
}

class RedisCacheStrategy implements Strategy<CacheParams, void> {
  async execute(params: CacheParams): Promise<void> {
    console.log(`[Redis] Setting cache key: ${params.key}`);
    // Redis SET command
  }
}

class MemoryCacheStrategy implements Strategy<CacheParams, void> {
  private cache = new Map<string, any>();

  async execute(params: CacheParams): Promise<void> {
    console.log(`[Memory] Setting cache key: ${params.key}`);
    this.cache.set(params.key, params.value);
  }
}

export const cacheStrategies: StrategyCollection<CacheParams, void> = {
  redis: new RedisCacheStrategy(),
  memory: new MemoryCacheStrategy(),
};

// Custom executor with additional logic
export async function setCache(
  strategy: Strategy<CacheParams, void>,
  key: string,
  value: any,
  ttl?: number
): Promise<void> {
  await executeStrategy(strategy, { key, value, ttl });
}

// Usage:
// await setCache(cacheStrategies.redis, 'user:123', { name: 'John' }, 3600);

// ============================================
// PATTERN SUMMARY
// ============================================

/**
 * To create a new strategy pattern:
 * 
 * 1. Define your params interface
 *    interface MyParams { ... }
 * 
 * 2. Define your result type (optional, use void if no return)
 *    interface MyResult { ... }
 * 
 * 3. Create concrete strategy classes
 *    class StrategyA implements Strategy<MyParams, MyResult> {
 *      async execute(params: MyParams): Promise<MyResult> { ... }
 *    }
 * 
 * 4. Create a typed collection
 *    export const myStrategies: StrategyCollection<MyParams, MyResult> = {
 *      strategyA: new StrategyA(),
 *      strategyB: new StrategyB(),
 *    };
 * 
 * 5. Use it
 *    await executeStrategy(myStrategies.strategyA, params);
 *    
 *    OR create a custom executor function:
 *    export async function doSomething(strategy: Strategy<MyParams, MyResult>, params: MyParams) {
 *      return await executeStrategy(strategy, params);
 *    }
 */
