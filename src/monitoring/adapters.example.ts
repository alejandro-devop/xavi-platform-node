/**
 * Example Datadog Monitoring Adapter
 *
 * Este ejemplo muestra cómo crear un adapter personalizado para Datadog.
 * Para usarlo:
 *
 * 1. Instalar Datadog APM:
 *    npm install dd-trace
 *
 * 2. En tu app.ts o server.ts:
 *    import tracer from 'dd-trace';
 *    tracer.init({ service: 'xavi-api' });
 *
 *    import { DatadogMonitoringAdapter } from './monitoring/datadog-adapter';
 *    import { errorHandler } from './shared/errors';
 *    errorHandler.setMonitoringAdapter(new DatadogMonitoringAdapter());
 *
 * 3. Configurar variables de entorno:
 *    DD_API_KEY=your-api-key
 *    DD_SITE=datadoghq.com
 *    DD_ENV=production
 *    DD_SERVICE=xavi-api
 */

import { logger } from '../shared/logger';
import type { MonitoringAdapter, ErrorMetadata, LogLevel } from '../shared/errors';

export class DatadogMonitoringAdapter implements MonitoringAdapter {
  private tracer: any;

  constructor() {
    try {
      // Lazy load dd-trace (solo se carga si está instalado)
      this.tracer = require('dd-trace');
    } catch (error) {
      logger.warn('dd-trace not installed, Datadog monitoring disabled');
      this.tracer = null;
    }
  }

  captureError(error: Error, metadata: ErrorMetadata): void {
    // Log local con pino
    logger.error(
      {
        err: error,
        ...metadata,
      },
      `Error: ${error.message}`
    );

    // Enviar a Datadog APM
    if (this.tracer) {
      const span = this.tracer.scope().active();
      if (span) {
        span.setTag('error', true);
        span.setTag('error.type', error.name);
        span.setTag('error.message', error.message);
        span.setTag('error.stack', error.stack);

        // Agregar metadata como tags
        if (metadata.userId) {
          span.setTag('usr.id', metadata.userId);
        }
        if (metadata.operation) {
          span.setTag('operation.name', metadata.operation);
        }
        if (metadata.resource) {
          span.setTag('resource.name', metadata.resource);
        }
      }

      // También enviar log estructurado a Datadog
      this.tracer.dogstatsd?.increment('app.errors', 1, [`error_type:${error.name}`]);
    }
  }

  captureMessage(message: string, level: LogLevel, metadata?: ErrorMetadata): void {
    // Log con pino (que se integra automáticamente con Datadog)
    logger[level](
      {
        ...metadata,
        dd: {
          trace_id: this.getCurrentTraceId(),
          span_id: this.getCurrentSpanId(),
        },
      },
      message
    );

    // Enviar métrica a Datadog
    if (this.tracer && level === 'warn') {
      this.tracer.dogstatsd?.increment('app.warnings', 1, [
        `operation:${metadata?.operation || 'unknown'}`,
      ]);
    }
  }

  setUser(userId: string | number): void {
    if (this.tracer) {
      const span = this.tracer.scope().active();
      if (span) {
        span.setTag('usr.id', userId);
      }

      // También establecer en RUM (Real User Monitoring) si está habilitado
      this.tracer.setUser({
        id: userId.toString(),
      });
    }

    logger.debug({ userId }, 'User context set for Datadog monitoring');
  }

  private getCurrentTraceId(): string | undefined {
    if (!this.tracer) return undefined;
    const span = this.tracer.scope().active();
    return span ? span.context().toTraceId() : undefined;
  }

  private getCurrentSpanId(): string | undefined {
    if (!this.tracer) return undefined;
    const span = this.tracer.scope().active();
    return span ? span.context().toSpanId() : undefined;
  }
}

/**
 * Example Sentry Monitoring Adapter
 *
 * Para Sentry:
 * 1. npm install @sentry/node
 * 2. Importar y configurar en app.ts
 */
export class SentryMonitoringAdapter implements MonitoringAdapter {
  private Sentry: any;

  constructor(dsn: string) {
    try {
      this.Sentry = require('@sentry/node');
      this.Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 1.0,
      });
    } catch (error) {
      logger.warn('@sentry/node not installed, Sentry monitoring disabled');
      this.Sentry = null;
    }
  }

  captureError(error: Error, metadata: ErrorMetadata): void {
    logger.error({ err: error, ...metadata }, `Error: ${error.message}`);

    if (this.Sentry) {
      this.Sentry.captureException(error, {
        tags: {
          operation: metadata.operation,
          resource: metadata.resource,
        },
        user: metadata.userId ? { id: metadata.userId.toString() } : undefined,
        extra: metadata.context,
      });
    }
  }

  captureMessage(message: string, level: LogLevel, metadata?: ErrorMetadata): void {
    logger[level]({ ...metadata }, message);

    if (this.Sentry && (level === 'error' || level === 'warn')) {
      const sentryLevel = level === 'error' ? 'error' : 'warning';
      this.Sentry.captureMessage(message, {
        level: sentryLevel,
        tags: {
          operation: metadata?.operation,
        },
        user: metadata?.userId ? { id: metadata.userId.toString() } : undefined,
        extra: metadata?.context,
      });
    }
  }

  setUser(userId: string | number): void {
    if (this.Sentry) {
      this.Sentry.setUser({ id: userId.toString() });
    }
    logger.debug({ userId }, 'User context set for Sentry monitoring');
  }
}
