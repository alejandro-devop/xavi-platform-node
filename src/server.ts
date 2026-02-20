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

    // Mount GraphQL Playground at /playground (only in dev)
    if (process.env.NODE_ENV !== 'production') {
      app.get('/playground', (_req, res) => {
        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GraphQL Playground - Xavi API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100vh;
      display: flex;
      background: #0f1419;
      color: #e4e4e4;
    }
    .container { display: flex; width: 100%; height: 100vh; }
    .left-panel { flex: 1; display: flex; flex-direction: column; border-right: 1px solid #2a2e35; }
    .right-panel { flex: 1; display: flex; flex-direction: column; }
    .header {
      padding: 15px 20px;
      background: #1a1e24;
      border-bottom: 1px solid #2a2e35;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title { font-size: 14px; font-weight: 600; color: #61dafb; }
    .execute-btn {
      background: #61dafb;
      color: #0f1419;
      border: none;
      padding: 8px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }
    .execute-btn:hover { background: #4fc3dc; }
    .editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    textarea, .output {
      flex: 1;
      padding: 15px;
      background: #1a1e24;
      border: none;
      color: #e4e4e4;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      resize: none;
      outline: none;
      overflow: auto;
    }
    .output { background: #0f1419; white-space: pre-wrap; }
    .success { color: #98c379; }
    .error { color: #e06c75; }
    .info { color: #61afef; font-size: 12px; padding: 10px 15px; background: #1a1e24; border-bottom: 1px solid #2a2e35; }
  </style>
</head>
<body>
  <div class="container">
    <div class="left-panel">
      <div class="header">
        <span class="title">Query</span>
        <button class="execute-btn" id="executeBtn">Execute ▶</button>
      </div>
      <div class="info">Endpoint: /graphql</div>
      <div class="editor-area">
        <textarea id="query" placeholder="# Write your GraphQL query here&#10;&#10;query {&#10;  health {&#10;    status&#10;    timestamp&#10;  }&#10;}">query {
  health {
    status
    timestamp
  }
}</textarea>
      </div>
    </div>
    <div class="right-panel">
      <div class="header">
        <span class="title">Response</span>
      </div>
      <div class="editor-area">
        <div class="output" id="output">// Execute a query to see results</div>
      </div>
    </div>
  </div>
  
  <script>
    async function executeQuery() {
      const query = document.getElementById('query').value;
      const output = document.getElementById('output');
      
      output.textContent = '// Executing...';
      output.className = 'output';
      
      try {
        const response = await fetch('/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        });
        
        const result = await response.json();
        output.textContent = JSON.stringify(result, null, 2);
        output.className = result.errors ? 'output error' : 'output success';
      } catch (error) {
        output.textContent = 'Error: ' + error.message;
        output.className = 'output error';
      }
    }
    
    // Add event listener to button
    document.getElementById('executeBtn').addEventListener('click', executeQuery);
    
    // Allow Cmd+Enter or Ctrl+Enter to execute
    document.getElementById('query').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        executeQuery();
      }
    });
  </script>
</body>
</html>
        `);
      });
      console.log('✅ GraphQL Playground mounted at /playground');
    }

    // Start server immediately
    console.log('Starting HTTP server on port', PORT);
    server = httpServer.listen(PORT, () => {
      console.log('✅ Server listening on port', PORT);
      console.log('📊 GraphQL endpoint: http://localhost:' + PORT + '/graphql');
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
