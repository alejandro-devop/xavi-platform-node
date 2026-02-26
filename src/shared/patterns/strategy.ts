/**
 * Generic Strategy Pattern Infrastructure
 *
 * Use this to create any strategy pattern without repeating boilerplate.
 *
 * @example
 * // Define your params type
 * interface EmailParams {
 *   to: string;
 *   subject: string;
 * }
 *
 * // Create concrete strategy
 * class SendGridStrategy implements Strategy<EmailParams, void> {
 *   async execute(params: EmailParams): Promise<void> {
 *     // SendGrid implementation
 *   }
 * }
 *
 * // Use it
 * const strategies = {
 *   sendgrid: new SendGridStrategy(),
 * };
 *
 * await executeStrategy(strategies.sendgrid, { to: '...', subject: '...' });
 */

/**
 * Generic Strategy interface
 *
 * @template TParams - Type of parameters the strategy accepts
 * @template TResult - Type of result the strategy returns
 */
export interface Strategy<TParams, TResult = void> {
  /**
   * Execute the strategy with given parameters
   */
  execute(params: TParams): Promise<TResult>;
}

/**
 * Execute a strategy with parameters
 *
 * @param strategy - The strategy to execute
 * @param params - Parameters for the strategy
 * @returns Result from the strategy execution
 *
 * @example
 * await executeStrategy(myStrategy, { foo: 'bar' });
 */
export async function executeStrategy<TParams, TResult = void>(
  strategy: Strategy<TParams, TResult>,
  params: TParams
): Promise<TResult> {
  return await strategy.execute(params);
}

/**
 * Type helper for creating strategy collections
 *
 * @example
 * const strategies: StrategyCollection<EmailParams, void> = {
 *   sendgrid: new SendGridStrategy(),
 *   ses: new SESStrategy(),
 * };
 */
export type StrategyCollection<TParams, TResult = void> = Record<
  string,
  Strategy<TParams, TResult>
>;

/**
 * Abstract base class for strategies with common functionality
 *
 * @example
 * class MyStrategy extends BaseStrategy<MyParams, MyResult> {
 *   async execute(params: MyParams): Promise<MyResult> {
 *     this.validate(params);
 *     // ... implementation
 *   }
 *
 *   protected validate(params: MyParams): void {
 *     if (!params.required) throw new Error('Missing required field');
 *   }
 * }
 */
export abstract class BaseStrategy<TParams, TResult = void> implements Strategy<TParams, TResult> {
  abstract execute(params: TParams): Promise<TResult>;

  /**
   * Optional validation method that can be overridden
   */
  protected validate(params: TParams): void {
    // Override in subclass if needed
  }

  /**
   * Optional before hook
   */
  protected async before(params: TParams): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Optional after hook
   */
  protected async after(params: TParams, result: TResult): Promise<void> {
    // Override in subclass if needed
  }
}
