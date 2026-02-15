import { ethers } from 'ethers'
import TOKEN_ABI from '../abis/Token.json';
import EXCHANGE_ABI from '../abis/Exchange.json';

export const loadProvider = (dispatch) => {
  // Ethers v6: BrowserProvider
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
    // Ethers v6: Contracts need signer for some operations
    // Get signer for contract interactions
    const signer = await provider.getSigner()

    // First token (URON)
    const token1 = new ethers.Contract(addresses[0], TOKEN_ABI, signer)
    const symbol1 = await token1.symbol()
    dispatch({ type: 'TOKEN_1_LOADED', token: token1, symbol: symbol1 })

    // Second token (mETH or mDAI)
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


// Add these to your interactions.js

export const subscribeToEvents = (exchange, dispatch) => {
  exchange.on('Deposit', (token, user, amount, balance, event) => {
    dispatch({ type: 'TRANSFER_SUCCESS', event })
  })
}


export const loadBalances = async (exchange, tokens, account, dispatch) => {
  try {
    console.log('Loading balances for account:', account)

    // Token 1 Balance (URON) - Wallet balance
    let balance = ethers.formatUnits(await tokens[0].balanceOf(account), 18)
    console.log('URON wallet balance:', balance)
    dispatch({ type: 'TOKEN_1_BALANCE_LOADED', balance })

    // Exchange balance for Token 1 - CORRECT: exchange.balanceOf(token, user)
    balance = ethers.formatUnits(await exchange.balanceOf(tokens[0].address, account), 18)
    console.log('URON exchange balance:', balance)
    dispatch({ type: 'EXCHANGE_TOKEN_1_BALANCE_LOADED', balance })

    // Token 2 Balance (mETH) - Wallet balance
    balance = ethers.formatUnits(await tokens[1].balanceOf(account), 18)
    console.log('mETH wallet balance:', balance)
    dispatch({ type: 'TOKEN_2_BALANCE_LOADED', balance })

    // Exchange balance for Token 2
    balance = ethers.formatUnits(await exchange.balanceOf(tokens[1].address, account), 18)
    console.log('mETH exchange balance:', balance)
    dispatch({ type: 'EXCHANGE_TOKEN_2_BALANCE_LOADED', balance })

  } catch (error) {
    console.error('Error loading balances:', error)
  }
}


export const transferTokens = async (provider, exchange, transferType, token, amount, dispatch) => {
  dispatch({ type: 'TRANSFER_REQUEST' })

  try {
    const signer = await provider.getSigner()
    const amountToTransfer = ethers.parseUnits(amount.toString(), 18)

    console.log(`Approving ${amount} tokens...`)
    // Approve tokens first
    const approveTx = await token.connect(signer).approve(exchange.target || exchange.address, amountToTransfer)
    await approveTx.wait()
    console.log('Approval confirmed')

    console.log(`Depositing ${amount} tokens...`)
    // Deposit tokens
    const depositTx = await exchange.connect(signer).depositToken(token.target || token.address, amountToTransfer)
    await depositTx.wait()
    console.log('Deposit confirmed')

    dispatch({ type: 'TRANSFER_SUCCESS' })

    // Reload balances after successful transfer
    const account = await signer.getAddress()
    const tokens = await Promise.all([
      token,
      // You need to get the second token here - this is tricky
    ])

    // For now, just reload after a short delay
    setTimeout(() => {
      window.location.reload()
    }, 2000)

  } catch (error) {
    console.error('Transfer failed:', error)
    dispatch({ type: 'TRANSFER_FAIL' })
  }
}





