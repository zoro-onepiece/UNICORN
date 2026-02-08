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
  } catch(error) {
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