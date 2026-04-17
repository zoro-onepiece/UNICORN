import { ethers } from 'ethers'
import TOKEN_ABI from '../abis/Token.abi.json';
import EXCHANGE_ABI from '../abis/Exchange.abi.json';


// ------------------------------------------------------------------------------
// HELPER: Format Ethers v6 Event Args for Redux (For queryFilter)
// ------------------------------------------------------------------------------
// HELPER: Format Ethers v6 Event Args for Redux (For queryFilter)

// Formatter for Order and Cancel events (7 arguments)
const formatEventOrder = (args) => {
  return {
    id: args[0].toString(),
    user: args[1],
    tokenGet: args[2],
    amountGet: args[3].toString(),
    tokenGive: args[4],
    amountGive: args[5].toString(),
    timestamp: args[6].toString()
  }
}

// Formatter for Trade events (8 arguments)
const formatTradeOrder = (args) => {
  return {
    id: args[0].toString(),
    user: args[1],
    tokenGet: args[2],
    amountGet: args[3].toString(),
    tokenGive: args[4],
    amountGive: args[5].toString(),
    creator: args[6], // Trade events include the creator address here!
    timestamp: args[7].toString() // Timestamp is shifted to index 7
  }
}

// ------------------------------------------------------------------------------
// LOAD ALL ORDERS
export const loadAllOrders = async (provider, exchange, dispatch) => {
  try {
    const block = await provider.getBlockNumber()

    // Fetch canceled orders
    const cancelStream = await exchange.queryFilter('Cancel', 0, block)
    const cancelledOrders = cancelStream.map(event => formatEventOrder(event.args))
    dispatch({ type: 'CANCELLED_ORDERS_LOADED', cancelledOrders })

    // Fetch filled orders (TRADES) -> Uses the new Trade formatter!
    const tradeStream = await exchange.queryFilter('Trade', 0, block)
    const filledOrders = tradeStream.map(event => formatTradeOrder(event.args))
    dispatch({ type: 'FILLED_ORDERS_LOADED', filledOrders })

    // Fetch all orders
    const orderStream = await exchange.queryFilter('Order', 0, block)
    const allOrders = orderStream.map(event => formatEventOrder(event.args))
    dispatch({ type: 'ALL_ORDERS_LOADED', allOrders })
  } catch (error) {
    console.error('Error loading orders:', error)
  }
}

// ---------

// ------------------------------------------------------------------------------
// SUBSCRIBE TO EVENTS
// ------------------------------------------------------------------------------
// SUBSCRIBE TO EVENTS
export const subscribeToEvents = (exchange, dispatch) => {
  
  exchange.on('Cancel', (...args) => {
    const order = formatEventOrder(args)
    dispatch({ type: 'ORDER_CANCEL_SUCCESS', order, event: true })
  })

  // YOU WERE MISSING THIS ONE!
  exchange.on('Trade', (...args) => {
    const order = formatTradeOrder(args)
    dispatch({ type: 'ORDER_FILL_SUCCESS', order, event: true })
  })

  exchange.on('Deposit', () => {
    dispatch({ type: 'TRANSFER_SUCCESS', event: true }) 
  })

  exchange.on('Withdraw', () => {
    dispatch({ type: 'TRANSFER_SUCCESS', event: true })
  })

  exchange.on('Order', (...args) => {
    const order = formatEventOrder(args)
    dispatch({ type: 'NEW_ORDER_SUCCESS', order, event: true })
  })
}
export const loadProvider = (dispatch) => {
  const connection = new ethers.BrowserProvider(window.ethereum)
  dispatch({ type: 'PROVIDER_LOADED', connection })
  return connection
}

export const loadNetwork = async (provider, dispatch) => {
  try {
    const network = await provider.getNetwork()
    const chainId = Number(network.chainId)
    console.log('ChainId loaded:', chainId)
    dispatch({ type: 'NETWORK_LOADED', chainId })
    return chainId
  } catch (error) {
    console.error('Error in loadNetwork:', error)
    throw error
  }
}

export const loadAccount = async (provider, dispatch) => {
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  const account = ethers.getAddress(accounts[0])
  dispatch({ type: 'ACCOUNT_LOADED', account })

  let balance = await provider.getBalance(account)
  balance = ethers.formatEther(balance)
  dispatch({ type: 'ETHER_BALANCE_LOADED', balance })

  return account
}

export const loadTokens = async (provider, addresses, dispatch) => {
  try {
    const signer = await provider.getSigner()
    
    const token1 = new ethers.Contract(addresses[0], TOKEN_ABI, signer)
    const symbol1 = await token1.symbol()
    dispatch({ type: 'TOKEN_1_LOADED', token: token1, symbol: symbol1 })

    const token2 = new ethers.Contract(addresses[1], TOKEN_ABI, signer)
    const symbol2 = await token2.symbol()
    dispatch({ type: 'TOKEN_2_LOADED', token: token2, symbol: symbol2 })

    return [token1, token2]
  } catch (error) {
    console.error('Error loading tokens:', error)
    throw error
  }
}

export const loadExchange = async (provider, address, dispatch) => {
  try {
    const signer = await provider.getSigner()
    const exchange = new ethers.Contract(address, EXCHANGE_ABI, signer)
    dispatch({ type: 'EXCHANGE_LOADED', exchange })
    return exchange
  } catch (error) {
    console.error('Error loading exchange:', error)
    throw error
  }
}

export const loadBalances = async (exchange, tokens, account, dispatch) => {
  try {
    if (!exchange ||!exchange.target ||!tokens || !tokens[0] || !tokens[1] || !account) {
      console.log('Missing required data for loading balances:', { exchange: !!exchange, tokens, account })
      return
    }

    console.log('Loading balances for account:', account)
    console.log('Exchange contract:', exchange.target || exchange.address)
    console.log('Token1 address:', tokens[0].target || tokens[0].address)
    console.log('Token2 address:', tokens[1].target || tokens[1].address)

    // Get wallet balances using token contracts
    const token1WalletBalance = await tokens[0].balanceOf(account)
    console.log('Token1 raw wallet balance:', token1WalletBalance.toString())
    const token1WalletBalanceFormatted = ethers.formatUnits(token1WalletBalance, 18)
    console.log('URON wallet balance:', token1WalletBalanceFormatted)
    dispatch({ type: 'TOKEN_1_BALANCE_LOADED', balance: token1WalletBalanceFormatted })

    // Get exchange balances using exchange.balanceOf (works in ethers v6)
    const token1ExchangeBalance = await exchange.balanceOf(tokens[0].target || tokens[0].address, account)
    console.log('Token1 raw exchange balance:', token1ExchangeBalance.toString())
    const token1ExchangeBalanceFormatted = ethers.formatUnits(token1ExchangeBalance, 18)
    console.log('URON exchange balance:', token1ExchangeBalanceFormatted)
    dispatch({ type: 'EXCHANGE_TOKEN_1_BALANCE_LOADED', balance: token1ExchangeBalanceFormatted })

    // Token 2 (mETH)
    const token2WalletBalance = await tokens[1].balanceOf(account)
    const token2WalletBalanceFormatted = ethers.formatUnits(token2WalletBalance, 18)
    console.log('mETH wallet balance:', token2WalletBalanceFormatted)
    dispatch({ type: 'TOKEN_2_BALANCE_LOADED', balance: token2WalletBalanceFormatted })

    const token2ExchangeBalance = await exchange.balanceOf(tokens[1].target || tokens[1].address, account)
    const token2ExchangeBalanceFormatted = ethers.formatUnits(token2ExchangeBalance, 18)
    console.log('mETH exchange balance:', token2ExchangeBalanceFormatted)
    dispatch({ type: 'EXCHANGE_TOKEN_2_BALANCE_LOADED', balance: token2ExchangeBalanceFormatted })

  } catch (error) {
    console.error('Error loading balances:', error)
    console.error('Error details:', {
      exchange: exchange?.target || exchange?.address,
      token1: tokens?.[0]?.target || tokens?.[0]?.address,
      token2: tokens?.[1]?.target || tokens?.[1]?.address,
      account
    })
  }
}

export const transferTokens = async (provider, exchange, transferType, token, amount, dispatch, tokenIndex) => {
  if (!provider || !exchange || !token || !amount) {
    console.error('Missing required parameters for transfer')
    return
  }

  // Pass tokenIndex to indicate which token is being transferred
  dispatch({ type: 'TRANSFER_REQUEST', tokenIndex })

  try {
    const signer = await provider.getSigner()
    const amountToTransfer = ethers.parseUnits(amount.toString(), 18)
    
    const tokenAddress = token.target || token.address
    const exchangeAddress = exchange.target || exchange.address

    console.log(`Transfer Type: ${transferType}`)
    console.log(`Amount: ${amount} (${amountToTransfer.toString()} wei)`)
    console.log('Token address:', tokenAddress)
    console.log('Exchange address:', exchangeAddress)

    // Get current allowance before approving
    const currentAllowance = await token.allowance(await signer.getAddress(), exchangeAddress)
    console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, 18)}`)

    if (transferType === 'deposit') {
      // Only need to approve if allowance is insufficient
      if (currentAllowance < amountToTransfer) {
        console.log(`Approving ${amount} tokens...`)
        const approveTx = await token.connect(signer).approve(exchangeAddress, amountToTransfer)
        await approveTx.wait()
        console.log('Approval confirmed')
      } else {
        console.log('Allowance already sufficient, skipping approval')
      }
      
      console.log(`Depositing ${amount} tokens...`)
      const depositTx = await exchange.connect(signer).depositToken(tokenAddress, amountToTransfer)
      await depositTx.wait()
      console.log('Deposit confirmed')
      
    } else if (transferType === 'withdraw') {
      // For withdraw, we don't need approval - just withdraw
      console.log(`Withdrawing ${amount} tokens...`)
      const withdrawTx = await exchange.connect(signer).withdrawToken(tokenAddress, amountToTransfer)
      await withdrawTx.wait()
      console.log('Withdraw confirmed')
    }

    dispatch({ type: 'TRANSFER_SUCCESS' })

    // Wait a moment then reload to refresh balances
    setTimeout(() => {
      window.location.reload()
    }, 2000)

  } catch (error) {
    console.error(`${transferType} failed:`, error)
    
    // More detailed error logging
    if (error.code === 'CALL_EXCEPTION') {
      console.error('Transaction failed on blockchain - check contract logic')
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      alert(`Insufficient ${transferType === 'deposit' ? 'wallet' : 'exchange'} balance`)
    } else if (error.code === 4001) {
      console.error('User rejected transaction')
    }
    
    dispatch({ type: 'TRANSFER_FAIL' })
  }
}


export const makeBuyOrder = async (provider, exchange, tokens, order, dispatch) => {
  const tokenGet = tokens[0].target || tokens[0].address
  const amountGet = ethers.parseUnits(Number(order.amount).toFixed(18), 18)
  
  const tokenGive = tokens[1].target || tokens[1].address
  const totalCost = Number(order.amount) * Number(order.price)
  const amountGive = ethers.parseUnits(totalCost.toFixed(18), 18)

  dispatch({ type: 'NEW_ORDER_REQUEST' })

  try {
    const signer = await provider.getSigner()
    const transaction = await exchange.connect(signer).createOrder(tokenGet, amountGet, tokenGive, amountGive)
    await transaction.wait()
  } catch (error) {
    console.error('Buy Order Failed:', error)
    dispatch({ type: 'NEW_ORDER_FAIL' })
  }
}

export const makeSellOrder = async (provider, exchange, tokens, order, dispatch) => {
  const tokenGet = tokens[1].target || tokens[1].address
  const totalReceived = Number(order.amount) * Number(order.price)
  const amountGet = ethers.parseUnits(totalReceived.toFixed(18), 18)
  
  const tokenGive = tokens[0].target || tokens[0].address
  const amountGive = ethers.parseUnits(Number(order.amount).toFixed(18), 18)

  dispatch({ type: 'NEW_ORDER_REQUEST' })

  try {
    const signer = await provider.getSigner()
    const transaction = await exchange.connect(signer).createOrder(tokenGet, amountGet, tokenGive, amountGive)
    await transaction.wait()
  } catch (error) {
    console.error('Sell Order Failed:', error)
    dispatch({ type: 'NEW_ORDER_FAIL' })
  }
}




export const cancelOrder = async (provider, exchange, order, dispatch) => {
  dispatch({ type: 'ORDER_CANCEL_REQUEST' })
  try {
    const signer = await provider.getSigner()
    const transaction = await exchange.connect(signer).cancelOrder(order.id)
    await transaction.wait()
    dispatch({ type: 'ORDER_CANCEL_SUCCESS' }) // Wait for the event listener to catch it
  } catch (error) {
    console.error('Cancel Order Failed:', error)
    dispatch({ type: 'ORDER_CANCEL_FAIL' })
  }
}

// ------------------------------------------------------------------------------
// FILL ORDER (Execute a Trade)

export const fillOrder = async (provider, exchange, order, dispatch) => {
  dispatch({ type: 'ORDER_FILL_REQUEST' })
  try {
    const signer = await provider.getSigner()
    const transaction = await exchange.connect(signer).fillOrder(order.id)
    await transaction.wait()
  } catch (error) {
    console.error('Fill Order Failed:', error)
    dispatch({ type: 'ORDER_FILL_FAIL' })
  }
}