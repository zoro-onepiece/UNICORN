import { ethers } from 'ethers'
import TOKEN_ABI from '../abis/Token.abi.json';
import EXCHANGE_ABI from '../abis/Exchange.abi.json';

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
    if (!exchange || !tokens || !tokens[0] || !tokens[1] || !account) {
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

export const transferTokens = async (provider, exchange, transferType, token, amount, dispatch) => {
  if (!provider || !exchange || !token || !amount) {
    console.error('Missing required parameters for transfer')
    return
  }

  dispatch({ type: 'TRANSFER_REQUEST' })

  try {
    const signer = await provider.getSigner()
    const amountToTransfer = ethers.parseUnits(amount.toString(), 18)
    
    // Get token address (handle both ethers v5 and v6)
    const tokenAddress = token.target || token.address
    const exchangeAddress = exchange.target || exchange.address

    console.log(`Approving ${amount} tokens...`)
    console.log('Token address:', tokenAddress)
    console.log('Exchange address:', exchangeAddress)

    // Approve tokens first
    const approveTx = await token.connect(signer).approve(exchangeAddress, amountToTransfer)
    await approveTx.wait()
    console.log('Approval confirmed')

    console.log(`${transferType === 'deposit' ? 'Depositing' : 'Withdrawing'} ${amount} tokens...`)
    
    let tx
    if (transferType === 'deposit') {
      tx = await exchange.connect(signer).depositToken(tokenAddress, amountToTransfer)
    } else {
      tx = await exchange.connect(signer).withdrawToken(tokenAddress, amountToTransfer)
    }
    
    await tx.wait()
    console.log(`${transferType} confirmed`)

    dispatch({ type: 'TRANSFER_SUCCESS' })

    // Reload balances after successful transfer
    const account = await signer.getAddress()
    setTimeout(() => {
      // Get updated token contracts and reload balances
      window.location.reload()
    }, 2000)

  } catch (error) {
    console.error(`${transferType} failed:`, error)
    dispatch({ type: 'TRANSFER_FAIL' })
  }
}