export const provider = (state = {}, action) => {
  switch (action.type) {
    case 'PROVIDER_LOADED':
      return {
        ...state,
        connection: action.connection
      }
    case 'NETWORK_LOADED':
      return {
        ...state,
        chainId: action.chainId
      }
    case 'ACCOUNT_LOADED':
      return {
        ...state,
        account: action.account
      }
    case 'ETHER_BALANCE_LOADED':
      return {
        ...state,
        balance: action.balance
      }
    default:
      return state
  }
}

const DEFAULT_TOKENS_STATE = {
  loaded: false,
  contracts: [],
  symbols: [],
  balances: ['0', '0']
}

export const tokens = (state = DEFAULT_TOKENS_STATE, action) => {
  switch (action.type) {
    case 'TOKEN_1_LOADED':
      return {
        ...state,
        loaded: true,
        contracts: [...state.contracts, action.token],
        symbols: [...state.symbols, action.symbol],
      }
    case 'TOKEN_2_LOADED':
      return {
        ...state,
        loaded: true,
        contracts: [...state.contracts, action.token],
        symbols: [...state.symbols, action.symbol]
      }
    case 'TOKEN_1_BALANCE_LOADED':
      return {
        ...state,
        balances: [action.balance, state.balances[1] || '0']
      }
    case 'TOKEN_2_BALANCE_LOADED':
      return {
        ...state,
        balances: [state.balances[0] || '0', action.balance]
      }
    default:
      return state
  }
}

const DEFAULT_EXCHANGE_STATE = {
  loaded: false,
  contract: {},
  balances: ['0', '0'],
  transaction: { isSuccessful: false },
  events: [],
  transferInProgress: false
}

export const exchange = (state = DEFAULT_EXCHANGE_STATE, action) => {
  switch (action.type) {
    case 'EXCHANGE_LOADED':
      return { ...state, loaded: true, contract: action.exchange }

    case 'EXCHANGE_TOKEN_1_BALANCE_LOADED':
      return { 
        ...state, 
        balances: [action.balance, state.balances[1] || '0'] 
      }

    case 'EXCHANGE_TOKEN_2_BALANCE_LOADED':
      return { 
        ...state, 
        balances: [state.balances[0] || '0', action.balance] 
      }

    case 'TRANSFER_REQUEST':
      return {
        ...state,
        transferInProgress: true,
        transaction: {
          ...state.transaction,
          isPending: true,
          isSuccessful: false
        }
      }

    case 'TRANSFER_SUCCESS':
      return {
        ...state,
        transferInProgress: false,
        transaction: {
          ...state.transaction,
          isPending: false,
          isSuccessful: true
        }
      }

    case 'TRANSFER_FAIL':
      return {
        ...state,
        transferInProgress: false,
        transaction: {
          ...state.transaction,
          isPending: false,
          isSuccessful: false,
          isError: true
        }
      }
    default:
      return state
  }
}