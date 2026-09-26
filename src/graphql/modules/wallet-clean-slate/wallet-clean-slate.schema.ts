import { gql } from 'graphql-tag';

export const walletCleanSlateTypeDefs = gql`
  """
  Qué hacer con billeteras o tarjetas en un clean slate.
  """
  enum WalletCleanSlateMode {
    KEEP
    """
    Billeteras: balance e initialBalance a 0. Tarjetas: currentDebt a 0.
    """
    RESET_BALANCES
    DELETE
  }

  input WalletCleanSlateInput {
    """
    Movimientos, transferencias, cargos y pagos de tarjeta. No mueve los saldos.
    """
    transactions: Boolean
    scheduledExpenses: Boolean
    """
    Solo las categorías propias; las de sistema se conservan.
    """
    categories: Boolean
    budgets: Boolean
    """
    Listas de compras y catálogo.
    """
    shopping: Boolean
    """
    DELETE arrastra movimientos, transferencias, programados y presupuestos.
    """
    wallets: WalletCleanSlateMode
    creditCards: WalletCleanSlateMode
  }

  """
  Cuántos registros se borraron o reiniciaron.
  """
  type WalletCleanSlateResult {
    transactions: Int!
    transfers: Int!
    creditCardCharges: Int!
    creditCardPayments: Int!
    scheduledExpenses: Int!
    categories: Int!
    budgets: Int!
    shoppingLists: Int!
    catalogItems: Int!
    walletsDeleted: Int!
    walletsReset: Int!
    creditCardsDeleted: Int!
    creditCardsReset: Int!
  }

  extend type Mutation {
    """
    Clean slate protocol: borra o reinicia los datos de finanzas elegidos, en
    una sola transacción.
    """
    walletCleanSlate(input: WalletCleanSlateInput!): WalletCleanSlateResult!
  }
`;
