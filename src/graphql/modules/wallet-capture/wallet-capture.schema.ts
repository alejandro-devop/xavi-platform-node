import { gql } from 'graphql-tag';

export const walletCaptureTypeDefs = gql`
  extend type WalletExpense {
    """
    De dónde vino, si se anotó desde fuera de la app: apple_pay, siri o
    shortcut. Nulo si se anotó en la app.
    """
    source: String
  }

  extend type Mutation {
    """
    El token con el que el teléfono anota gastos desde fuera de la app (Siri,
    Atajos) por POST /api/capture/expense. Solo sirve para eso. La app pide uno
    nuevo cada vez que se abre con sesión.
    """
    walletCaptureToken: String!
  }
`;
