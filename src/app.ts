import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { getCorsOptions } from './shared/config/cors';
import { requestLogger, errorHandler } from './shared/middleware';
import routes from './routes';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(
    helmet({
      // API consumed by SPA on another origin (e.g. localhost:5173 → Cloud Run).
      // `same-origin` makes browsers report a CORS failure even with Access-Control-Allow-Origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://unpkg.com'],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
                connectSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                fontSrc: ["'self'", 'data:'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
              },
            },
    })
  );
  app.use(cors(getCorsOptions()));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // Logging
  app.use(requestLogger);

  // Routes
  app.use('/api', routes);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
