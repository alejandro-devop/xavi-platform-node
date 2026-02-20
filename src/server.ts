import { createApp } from './app';
import { initializeServices } from './shared/config';
import { closeDbPool } from './shared/database/pool';
import { closeRedisClient } from './shared/redis/client';
import { logger } from './shared/logger';
import { createApolloServer, getGraphQLContext } from './graphql/server';
import { expressMiddleware } from '@as-integrations/express4';
import { json } from 'express';
import http from 'http';

const PORT = process.env.PORT || 8080;
let server: http.Server;
let apolloServer: any;

// Add console.log for debugging Cloud Run
console.log('=== STARTING XAVI API ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('K_SERVICE:', process.env.K_SERVICE);

async function start() {
  try {
    console.log('Entering start function...');
    logger.info('Starting server initialization...');

    // Create Express app FIRST (before DB/Redis)
    console.log('Creating Express app...');
    const app = createApp();

    // Create HTTP server for Apollo
    const httpServer = http.createServer(app);

    // Create and start Apollo Server
    console.log('Initializing Apollo GraphQL Server...');
    apolloServer = createApolloServer(httpServer);
    await apolloServer.start();
    console.log('✅ Apollo Server started');

    // Mount GraphQL endpoint at /graphql
    app.use(
      '/graphql',
      json(),
      expressMiddleware(apolloServer, {
        context: getGraphQLContext,
      })
    );
    console.log('✅ GraphQL endpoint mounted at /graphql');

    // Mount GraphiQL IDE at /graphiql (only in dev) - Full featured GraphQL explorer with docs
    if (process.env.NODE_ENV !== 'production') {
      app.get('/graphiql', (_req, res) => {
        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GraphiQL - Xavi Platform API</title>
  <link rel="stylesheet" href="https://unpkg.com/graphiql@3.1.1/graphiql.min.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      overflow: hidden;
    }
    #graphiql {
      height: 100vh;
    }
    .graphiql-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    /* Custom styling for the toolbar */
    .graphiql-toolbar {
      background: #1a1e24;
    }
    .graphiql-toolbar-button {
      color: #61dafb;
    }
  </style>
</head>
<body>
  <div id="graphiql">Loading...</div>
  
  <script 
    crossorigin 
    src="https://unpkg.com/react@18/umd/react.production.min.js"
  ></script>
  <script 
    crossorigin 
    src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
  ></script>
  <script 
    crossorigin 
    src="https://unpkg.com/graphiql@3.1.1/graphiql.min.js"
  ></script>
  
  <script>
    const root = ReactDOM.createRoot(document.getElementById('graphiql'));
    const fetcher = GraphiQL.createFetcher({
      url: '/graphql',
    });
    
    // Default query to help users get started
    const defaultQuery = \`# ¡Bienvenido a GraphiQL!
# 
# GraphiQL es un IDE interactivo para explorar tu API GraphQL.
# 
# Características:
# - Autocompletado inteligente (Ctrl+Space)
# - Explorador de esquema (botón "Docs" a la derecha)
# - Historial de queries
# - Variables y headers personalizados
# - Prettier integrado (Shift+Ctrl+P para formatear)
#
# Atajos de teclado:
# - Ejecutar query: Cmd/Ctrl + Enter
# - Auto-completar: Ctrl + Space
# - Formatear: Shift + Ctrl + P
# - Buscar en el editor: Cmd/Ctrl + F
#
# Ejemplo básico - Health Check:

query HealthCheck {
  health {
    status
    timestamp
  }
}

# Ejemplo - Consultar wallets:
# (requiere autenticación - añade Authorization header)

# query GetWallets {
#   wallets {
#     id
#     name
#     currency
#     balance
#     createdAt
#   }
# }

# Para queries autenticadas, añade un header:
# {
#   "Authorization": "Bearer TU_TOKEN_AQUI"
# }
\`;

    root.render(
      React.createElement(GraphiQL, {
        fetcher: fetcher,
        defaultQuery: defaultQuery,
        headerEditorEnabled: true,
        shouldPersistHeaders: true,
      })
    );
  </script>
</body>
</html>
        `);
      });
      console.log('✅ GraphiQL IDE mounted at /graphiql');
    }

    // Start server immediately
    console.log('Starting HTTP server on port', PORT);
    server = httpServer.listen(PORT, () => {
      console.log('✅ Server listening on port', PORT);
      console.log('📊 GraphQL endpoint: http://localhost:' + PORT + '/graphql');
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚀 GraphiQL IDE: http://localhost:' + PORT + '/graphiql');
      }
      logger.info({ port: PORT }, 'Server started successfully');
    });

    // Initialize services (DB, Redis, etc.) AFTER server is listening
    console.log('Initializing services...');
    logger.info('Initializing database and Redis connections...');
    await initializeServices();
    console.log('✅ Services initialized');
    logger.info('Services initialized successfully');

    // Graceful shutdown on SIGTERM (Cloud Run sends this)
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      await shutdown();
    });

    // Graceful shutdown on SIGINT (Ctrl+C locally)
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, starting graceful shutdown');
      await shutdown();
    });
  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown() {
  try {
    // Stop Apollo Server
    if (apolloServer) {
      await apolloServer.stop();
      logger.info('Apollo Server stopped');
    }

    // Stop accepting new requests
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    // Close database connections
    await closeDbPool();

    // Close Redis connections
    await closeRedisClient();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Shutdown error:', error);
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

console.log('Calling start()...');
start();
