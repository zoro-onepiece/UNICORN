import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import TOKEN_ABI from '../abis/Token.abi.json';
import EXCHANGE_ABI from '../abis/Exchange.abi.json';

// ------------------------------------------------------------------------------
// HELPER FORMATTERS
// ------------------------------------------------------------------------------

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

const formatTradeOrder = (args) => {
  return {
    id: args[0].toString(),
    user: args[1],
    tokenGet: args[2],
    amountGet: args[3].toString(),
    tokenGive: args[4],
    amountGive: args[5].toString(),
    creator: args[6], 
    timestamp: args[7].toString() 
  }
}

// ------------------------------------------------------------------------------
// LOAD DATA FUNCTIONS
// ------------------------------------------------------------------------------

export const loadProvider = (dispatch) => {
  const connection = new ethers.BrowserProvider(window.ethereum)
  dispatch({ type: 'PROVIDER_LOADED', connection })
  return connection
}

export const loadNetwork = async (provider, dispatch) => {
  try {
    const network = await provider.getNetwork()
    const chainId = Number(network.chainId)
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
    if (!exchange || !tokens[0] || !tokens[1] || !account) return;

    const token1WalletBalance = await tokens[0].balanceOf(account)
    dispatch({ type: 'TOKEN_1_BALANCE_LOADED', balance: ethers.formatUnits(token1WalletBalance, 18) })

    const token1ExchangeBalance = await exchange.balanceOf(tokens[0].target || tokens[0].address, account)
    dispatch({ type: 'EXCHANGE_TOKEN_1_BALANCE_LOADED', balance: ethers.formatUnits(token1ExchangeBalance, 18) })

    const token2WalletBalance = await tokens[1].balanceOf(account)
    dispatch({ type: 'TOKEN_2_BALANCE_LOADED', balance: ethers.formatUnits(token2WalletBalance, 18) })

    const token2ExchangeBalance = await exchange.balanceOf(tokens[1].target || tokens[1].address, account)
    dispatch({ type: 'EXCHANGE_TOKEN_2_BALANCE_LOADED', balance: ethers.formatUnits(token2ExchangeBalance, 18) })

  } catch (error) {
    console.error('Error loading balances:', error)
  }
}

export const loadAllOrders = async (provider, exchange, dispatch) => {
  try {
    const block = await provider.getBlockNumber()

    const cancelStream = await exchange.queryFilter('Cancel', 0, block)
    const cancelledOrders = cancelStream.map(event => formatEventOrder(event.args))
    dispatch({ type: 'CANCELLED_ORDERS_LOADED', cancelledOrders })

    const tradeStream = await exchange.queryFilter('Trade', 0, block)
    const filledOrders = tradeStream.map(event => formatTradeOrder(event.args))
    dispatch({ type: 'FILLED_ORDERS_LOADED', filledOrders })

    const orderStream = await exchange.queryFilter('Order', 0, block)
    const allOrders = orderStream.map(event => formatEventOrder(event.args))
    dispatch({ type: 'ALL_ORDERS_LOADED', allOrders })
  } catch (error) {
    console.error('Error loading orders:', error)
  }
}

export const subscribeToEvents = (exchange, dispatch) => {
  exchange.on('Cancel', (...args) => {
    const order = formatEventOrder(args)
    dispatch({ type: 'ORDER_CANCEL_SUCCESS', order, event: true })
  })

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

// ------------------------------------------------------------------------------
// TRANSACTION FUNCTIONS (SPA COMPATIBLE - NO REFRESH)
// ------------------------------------------------------------------------------

export const transferTokens = async (provider, exchange, transferType, token, amount, dispatch, tokenIndex) => {
  dispatch({ type: 'TRANSFER_REQUEST', tokenIndex })

  try {
    const signer = await provider.getSigner()
    const account = await signer.getAddress()
    
    const amountToTransfer = ethers.parseUnits(amount.toString(), 18)
    const tokenAddress = token.target || token.address
    const exchangeAddress = exchange.target || exchange.address

    if (transferType === 'deposit') {
      const currentAllowance = await token.allowance(account, exchangeAddress)
      
      if (currentAllowance < amountToTransfer) {
        toast.info(`Step 1/2: Approve in MetaMask...`, { autoClose: false, toastId: 'approve' });
        const approveTx = await token.connect(signer).approve(exchangeAddress, amountToTransfer)
        toast.update('approve', { render: "Mining Approval...", type: "info", isLoading: true });
        await approveTx.wait()
        toast.update('approve', { render: "Approval Successful! 🎉", type: "success", isLoading: false, autoClose: 3000 });
      } 
      
      toast.info(`Step 2/2: Confirm Deposit in MetaMask...`, { autoClose: false, toastId: 'deposit' });
      const depositTx = await exchange.connect(signer).depositToken(tokenAddress, amountToTransfer)
      toast.update('deposit', { render: "Mining Deposit...", type: "info", isLoading: true });
      await depositTx.wait()
      toast.update('deposit', { render: "Deposit Successful! 🚀", type: "success", isLoading: false, autoClose: 3000 });
      
    } else if (transferType === 'withdraw') {
      toast.info(`Confirm Withdraw in MetaMask...`, { autoClose: false, toastId: 'withdraw' });
      const withdrawTx = await exchange.connect(signer).withdrawToken(tokenAddress, amountToTransfer)
      toast.update('withdraw', { render: "Mining Withdraw...", type: "info", isLoading: true });
      await withdrawTx.wait()
      toast.update('withdraw', { render: "Withdrawal Successful! 💸", type: "success", isLoading: false, autoClose: 3000 });
    }

    // Update global state and manual re-load balances without refreshing page
    dispatch({ type: 'TRANSFER_SUCCESS' })
    // Hum sirf balance reload karein gy page nahi
    // Note: 'tokens' array App state se milta hy, hum interaction mein reloadBalances manually call kar saktay hain agar tokens array pass kiya jaye.
  } catch (error) {
    toast.dismiss();
    toast.error('Transaction failed!')
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
    toast.info('Sign Buy Order in MetaMask...', { autoClose: false, toastId: 'buyOrder' })
    const transaction = await exchange.connect(signer).createOrder(tokenGet, amountGet, tokenGive, amountGive)
    toast.update('buyOrder', { render: "Creating Order on Blockchain...", type: "info", isLoading: true })
    await transaction.wait()
    toast.update('buyOrder', { render: "Buy Order Created! 📈", type: "success", isLoading: false, autoClose: 3000 })
  } catch (error) {
    toast.dismiss('buyOrder')
    toast.error('Buy Order Failed!')
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
    toast.info('Sign Sell Order in MetaMask...', { autoClose: false, toastId: 'sellOrder' })
    const transaction = await exchange.connect(signer).createOrder(tokenGet, amountGet, tokenGive, amountGive)
    toast.update('sellOrder', { render: "Creating Order on Blockchain...", type: "info", isLoading: true })
    await transaction.wait()
    toast.update('sellOrder', { render: "Sell Order Created! 📉", type: "success", isLoading: false, autoClose: 3000 })
  } catch (error) {
    toast.dismiss('sellOrder')
    toast.error('Sell Order Failed!')
    dispatch({ type: 'NEW_ORDER_FAIL' })
  }
}

export const cancelOrder = async (provider, exchange, order, dispatch) => {
  dispatch({ type: 'ORDER_CANCEL_REQUEST' })
  try {
    const signer = await provider.getSigner()
    toast.info('Sign Cancellation in MetaMask...', { autoClose: false, toastId: 'cancelOrder' })
    const transaction = await exchange.connect(signer).cancelOrder(order.id)
    toast.update('cancelOrder', { render: "Cancelling Order...", type: "info", isLoading: true })
    await transaction.wait()
    toast.update('cancelOrder', { render: "Order Cancelled Successfully! 🗑️", type: "success", isLoading: false, autoClose: 3000 })
    dispatch({ type: 'ORDER_CANCEL_SUCCESS' }) 
  } catch (error) {
    toast.dismiss('cancelOrder')
    toast.error('Cancel Order Failed!')
    dispatch({ type: 'ORDER_CANCEL_FAIL' })
  }
}

export const fillOrder = async (provider, exchange, order, dispatch) => {
  dispatch({ type: 'ORDER_FILL_REQUEST' })
  try {
    const signer = await provider.getSigner()
    toast.info('Sign Trade in MetaMask...', { autoClose: false, toastId: 'fillOrder' })
    const transaction = await exchange.connect(signer).fillOrder(order.id)
    toast.update('fillOrder', { render: "Executing Trade...", type: "info", isLoading: true })
    await transaction.wait()
    toast.update('fillOrder', { render: "Trade Executed Successfully! 🤝", type: "success", isLoading: false, autoClose: 3000 })
  } catch (error) {
    toast.dismiss('fillOrder')
    toast.error('Trade Failed!')
    dispatch({ type: 'ORDER_FILL_FAIL' })
  }
}