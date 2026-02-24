import { logger } from '../logger';
import { AppError } from './index';

/**
 * Log levels for error handling
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Error metadata for enriched logging and monitoring
 */
export interface ErrorMetadata {
  userId?: string | number;
  operation?: string;
  resource?: string;
  context?: Record<string, any>;
  stackTrace?: string;
  timestamp?: Date;
  errorName?: string;
}

/**
 * Monitoring adapter interface - permite cambiar de proveedor fácilmente
 */
export interface MonitoringAdapter {
  captureError(error: Error, metadata: ErrorMetadata): void;
  captureMessage(message: string, level: LogLevel, metadata?: ErrorMetadata): void;
  setUser(userId: string | number): void;
}

/**
 * Default monitoring adapter (solo logging)
 * En el futuro se puede reemplazar con DatadogAdapter, SentryAdapter, etc.
 */
class DefaultMonitoringAdapter implements MonitoringAdapter {
  captureError(error: Error, metadata: ErrorMetadata): void {
    logger.error(
      {
        err: error,
        ...metadata,
        errorType: error.name,
        statusCode: error instanceof AppError ? error.statusCode : 500,
      },
      `Error: ${error.message}`
    );
  }

  captureMessage(message: string, level: LogLevel, metadata?: ErrorMetadata): void {
    logger[level](
      {
        ...metadata,
      },
      message
    );
  }

  setUser(userId: string | number): void {
    // En implementaciones futuras (Datadog, Sentry) esto establecería el contexto de usuario
    logger.debug({ userId }, 'User context set for monitoring');
  }
}

/**
 * Centralized Error Handler
 * Proporciona logging estructurado y preparación para herramientas de monitoreo
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private monitoringAdapter: MonitoringAdapter;

  private constructor() {
    // Usar adapter por defecto, puede ser reemplazado con setMonitoringAdapter()
    this.monitoringAdapter = new DefaultMonitoringAdapter();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Cambiar el adapter de monitoreo (ej: para usar Datadog, Sentry, etc.)
   */
  setMonitoringAdapter(adapter: MonitoringAdapter): void {
    this.monitoringAdapter = adapter;
  }

  /**
   * Manejo de errores con logging y monitoreo
   */
  handleError(error: Error, metadata: ErrorMetadata = {}): void {
    const enrichedMetadata = this.enrichMetadata(error, metadata);

    // Determinar el nivel de log basado en el tipo de error
    const logLevel = this.getLogLevel(error);

    // Log and capture based on severity
    if (logLevel === LogLevel.ERROR) {
      this.monitoringAdapter.captureError(error, enrichedMetadata);
    } else {
      this.monitoringAdapter.captureMessage(error.message, logLevel, enrichedMetadata);
    }
  }

  /**
   * Log de información general (no errores)
   */
  logInfo(message: string, metadata: ErrorMetadata = {}): void {
    this.monitoringAdapter.captureMessage(message, LogLevel.INFO, {
      ...metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Log de advertencias
   */
  logWarning(message: string, metadata: ErrorMetadata = {}): void {
    this.monitoringAdapter.captureMessage(message, LogLevel.WARN, {
      ...metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Log de debug
   */
  logDebug(message: string, metadata: ErrorMetadata = {}): void {
    this.monitoringAdapter.captureMessage(message, LogLevel.DEBUG, {
      ...metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Establecer contexto de usuario para el monitoreo
   */
  setUserContext(userId: string | number): void {
    this.monitoringAdapter.setUser(userId);
  }

  /**
   * Enriquecer metadata con información adicional
   */
  private enrichMetadata(error: Error, metadata: ErrorMetadata): ErrorMetadata {
    return {
      ...metadata,
      timestamp: new Date(),
      stackTrace: error.stack,
      errorName: error.name,
    };
  }

  /**
   * Determinar el nivel de log basado en el tipo de error
   */
  private getLogLevel(error: Error): LogLevel {
    if (!(error instanceof AppError)) {
      // Errores desconocidos son siempre ERROR
      return LogLevel.ERROR;
    }

    // Mapear status codes a niveles de log
    const statusCode = error.statusCode;

    if (statusCode >= 500) {
      return LogLevel.ERROR;
    } else if (statusCode >= 400 && statusCode < 500) {
      // Errores cliente (400-499) son warnings
      return LogLevel.WARN;
    } else {
      return LogLevel.INFO;
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
