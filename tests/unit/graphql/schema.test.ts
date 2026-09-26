import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../../../src/graphql/schema';
import { resolvers } from '../../../src/graphql/resolvers';

// El esquema se arma uniendo los typeDefs de cada módulo, y un choque entre dos
// —el mismo campo de Mutation declarado con otro tipo— solo revienta al
// arrancar el servidor: ni tsc ni las pruebas de servicios lo ven. Esto lo
// adelanta a `npm test`.
describe('GraphQL schema', () => {
  it('builds from every module without conflicts', () => {
    expect(() => new ApolloServer({ typeDefs, resolvers })).not.toThrow();
  });
});
