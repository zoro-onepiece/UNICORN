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



const DEFAULT_EXCHANGE_STATE = {
  loaded: false,
  contract: {},
  balances: ['0', '0'],
  transaction: { isSuccessful: false },
  events: [],
  transferInProgress: false
}

export const tokens = (state = DEFAULT_TOKENS_STATE, action) => {
  switch (action.type) {
    case 'TOKEN_1_LOADED':
      return {
        ...state,
        loaded: true,
        // Replace index 0, keep index 1 as is
        contracts: [action.token, state.contracts[1]],
        symbols: [action.symbol, state.symbols[1]],
      }
    case 'TOKEN_2_LOADED':
      return {
        ...state,
        loaded: true,
        // Keep index 0 as is, replace index 1
        contracts: [state.contracts[0], action.token],
        symbols: [state.symbols[0], action.symbol]
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