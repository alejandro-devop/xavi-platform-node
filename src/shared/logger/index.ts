import pino from 'pino';

const isCloudRun = process.env.K_SERVICE !== undefined;
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Cloud Run expects JSON logs with specific fields
  formatters: isCloudRun
    ? {
        level: (label) => ({ severity: label.toUpperCase() }),
        log: (object) => {
          // Add Cloud Trace context if available
          const trace = process.env.CLOUD_TRACE_CONTEXT;
          if (trace) {
            const [traceId] = trace.split('/');
            object['logging.googleapis.com/trace'] =
              `projects/${process.env.GCP_PROJECT}/traces/${traceId}`;
          }
          return object;
        },
      }
    : undefined,

  base: {
    service: process.env.K_SERVICE || 'xavi-api',
    revision: process.env.K_REVISION || 'local',
    env: process.env.NODE_ENV || 'development',
  },

  // Pretty print in development
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
