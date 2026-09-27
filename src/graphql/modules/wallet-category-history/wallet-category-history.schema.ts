import { gql } from 'graphql-tag';

export const walletCategoryHistoryTypeDefs = gql`
  """
  Una descripción y la categoría con la que se ha guardado.
  """
  type WalletCategoryHistoryEntry {
    """
    En minúsculas y sin espacios en los bordes.
    """
    description: String!
    categoryId: ID!
    """
    Cada movimiento cuenta uno; una serie de programados, uno.
    """
    uses: Int!
    """
    YYYY-MM-DD del uso más reciente.
    """
    lastUsed: String!
  }

  extend type Query {
    """
    Con qué categoría se ha guardado cada descripción (movimientos y
    programados), lo más reciente primero. Para sugerir la categoría en el
    cliente sin preguntar al servidor por cada letra.
    """
    walletCategoryHistory: [WalletCategoryHistoryEntry!]!
  }
`;
