import { gql } from 'graphql-tag';

export const healthTypeDefs = gql`
  type Health {
    status: String!
    timestamp: DateTime!
  }

  type Query {
    health: Health!
  }
`;
