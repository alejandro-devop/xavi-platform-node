import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { expressMiddleware } from '@as-integrations/express4';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { Request } from 'express';
import { verifyAccessToken } from '../shared/utils/jwt';

export interface GraphQLContext {
  user?: {
    id: number;
    email: string;
  };
}

export function createApolloServer(httpServer: any) {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Disable landing page - use external tools like Postman or GraphiQL
      ApolloServerPluginLandingPageDisabled(),
    ],
    introspection: isDevelopment,
    formatError: (error) => {
      // Log errors
      console.error('GraphQL Error:', error);
      return error;
    },
  });
}

// Context function to extract user from JWT
export async function getGraphQLContext({ req }: { req: Request }): Promise<GraphQLContext> {
  const context: GraphQLContext = {};

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = verifyAccessToken(token);
      context.user = {
        id: parseInt(payload.sub, 10), // Convert string to number
        email: payload.email,
      };
    } catch (error) {
      // Invalid token, but don't throw - just no user in context
      // GraphQL resolvers will handle authentication
    }
  }

  return context;
}
