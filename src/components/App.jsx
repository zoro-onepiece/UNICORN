import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import config from '../config.json';
import { ethers } from 'ethers';

import {
  loadProvider,
  loadNetwork,
  loadAccount,
  loadTokens,
  loadExchange,
  loadBalances,
  loadAllOrders,     // ADDED THIS
  subscribeToEvents  // ADDED THIS
} from '../store/interactions';

import Navbar from './Navbar'
import Markets from './Markets'
import Balance from './Balance'
import Order from './Order'         // ADDED THIS
import OrderBook from './Orderbook'; // ADDED THIS
import PriceChart from './Pricechart'; // ADDED THIS
import Transactions from './Transactions'; // ADDED THIS
import Trades from './Trades'; // ADDED THIS
function App() {
  const dispatch = useDispatch()
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [networkError, setNetworkError] = useState(null)
  const [initialized, setInitialized] = useState(false)

  const loadBlockchainData = async (chainIdToLoad = null) => {
    // Prevent multiple loads
    if (isLoading) return
    setIsLoading(true)
    setNetworkError(null)

    try {
      console.log('Loading blockchain data for chainId:', chainIdToLoad || 'auto')

      // Check if MetaMask is installed
      if (!window.ethereum) {
        console.log('MetaMask not installed')
        setNetworkError('Please install MetaMask to use this exchange.')
        setIsLoading(false)
        return
      }

      // Connect Ethers to blockchain
      const provider = loadProvider(dispatch)

      // Fetch current network's chainId
      let chainId
      if (chainIdToLoad) {
        chainId = chainIdToLoad
        dispatch({ type: 'NETWORK_LOADED', chainId })
      } else {
        chainId = await loadNetwork(provider, dispatch)
      }

      console.log('Current chainId:', chainId)

      // Check if this network is configured
      if (!config[chainId]) {
        const errorMsg = `Network ${chainId} not configured. Please switch to Hardhat (31337).`
        console.error(errorMsg)
        setNetworkError(errorMsg)
        setIsLoading(false)
        return
      }

      // Check if we have valid contract addresses
      const URON = config[chainId]?.URON
      const mETH = config[chainId]?.mETH
      const hasContracts = URON?.address && URON.address.trim() !== '' &&
        mETH?.address && mETH.address.trim() !== ''

      if (!hasContracts) {
        const warnMsg = `Contracts not deployed on network ${chainId}. Switch to Hardhat (31337) to trade.`
        console.warn(warnMsg)
        setNetworkError(warnMsg)
        setIsLoading(false)
        return
      }

      // FIRST: Load account and get the address
      const account = await loadAccount(provider, dispatch)
      console.log('Account loaded:', account)

      // Load token smart contracts (URON and mETH)
      const loadedTokens = await loadTokens(provider, [URON.address, mETH.address], dispatch)

      // Load exchange smart contract
      const exchangeConfig = config[chainId]?.exchange
      if (exchangeConfig?.address && exchangeConfig.address.trim() !== '') {
        const loadedExchange = await loadExchange(provider, exchangeConfig.address, dispatch)

        // NOW load balances with the account we just loaded
        if (loadedExchange && loadedTokens && loadedTokens[0] && loadedTokens[1] && account) {
          await loadBalances(loadedExchange, loadedTokens, account, dispatch)
        }

        // ==========================================
        // ADDED: Load Orders and Subscribe to Events
        // ==========================================
        if (loadedExchange) {
          await loadAllOrders(provider, loadedExchange, dispatch)
          subscribeToEvents(loadedExchange, dispatch)
        }

      } else {
        console.warn('Exchange address not found in config')
      }

      setIsWalletConnected(true)
      console.log('Blockchain data loaded successfully!')

    } catch (error) {
      console.error('Error loading blockchain data:', error)
      setNetworkError(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const connectWalletHandler = async (chainId = null) => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!')
        return
      }

      // First, connect the wallet (get accounts)
      const provider = loadProvider(dispatch)
      await loadAccount(provider, dispatch)

      // Check current network
      const currentProvider = new ethers.BrowserProvider(window.ethereum)
      const network = await currentProvider.getNetwork()
      const currentChainId = Number(network.chainId)

      // If chainId is provided and different from current, switch
      if (chainId && chainId !== currentChainId) {
        try {
          const hexChainId = '0x' + chainId.toString(16)
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
          })

          // Wait for network switch then reload
          setTimeout(() => {
            window.location.reload()
          }, 1000)
          return
        } catch (switchError) {
          if (switchError.code === 4902) {
            // Network not added, add it
            const networkParams = chainId === 11155111 ? {
              chainId: '0xAA36A7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/']
            } : {
              chainId: '0x7A69',
              chainName: 'Hardhat Local',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['http://127.0.0.1:8545/'],
              blockExplorerUrls: []
            }

            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networkParams],
            })

            // Wait then reload
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          }
        }
      }

      // Load blockchain data for current network
      loadBlockchainData(currentChainId)

    } catch (error) {
      console.error('Connection failed:', error)
      if (error.code === 4001) {
        alert('Connection rejected by user')
      }
    }
  }

 useEffect(() => {
  // Set up listeners for MetaMask events
  if (window.ethereum) {
    const handleAccountsChanged = (accounts) => {
      console.log('Accounts changed:', accounts)
      if (accounts.length > 0) {
        // Reload to refresh with new account
        window.location.reload()
      } else {
        // No accounts, clear state
        dispatch({ type: 'ACCOUNT_LOADED', account: null })
        dispatch({ type: 'ETHER_BALANCE_LOADED', balance: '0' })
        setIsWalletConnected(false)
      }
    }

    const handleChainChanged = (newChainIdHex) => {
      console.log('Chain changed to hex:', newChainIdHex)
      const newChainId = parseInt(newChainIdHex, 16)
      console.log('Chain changed to decimal:', newChainId)
      
      // Clear all state
      dispatch({ type: 'ACCOUNT_LOADED', account: null })
      dispatch({ type: 'ETHER_BALANCE_LOADED', balance: '0' })
      dispatch({ type: 'NETWORK_LOADED', chainId: newChainId })
      setIsWalletConnected(false)
      setNetworkError(null)
      
      // Reload after network change
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    // Initialize - check current network and account
    const init = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const network = await provider.getNetwork()
        const currentChainId = Number(network.chainId)
        console.log('Initial chainId on mount:', currentChainId)
        
        // Update Redux with current chainId
        dispatch({ type: 'NETWORK_LOADED', chainId: currentChainId })
        
        // Check if there's a connected account
        const accounts = await provider.listAccounts()
        if (accounts.length > 0 && window.ethereum.selectedAddress) {
          // Auto-load if account exists
          await connectWalletHandler(currentChainId)
        }
        
        setInitialized(true)
      } catch (error) {
        console.log('Could not get initial network:', error)
        setInitialized(true)
      }
    }

    init()

    // Cleanup listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  } else {
    setInitialized(true)
  }
}, [])

  return (
    <div>
      <Navbar
        setIsWalletConnected={setIsWalletConnected}
        connectWalletHandler={connectWalletHandler}
      />

      {/* Network Error Alert */}
      {networkError && (
        <div className="alert" style={{
          background: networkError.includes('not deployed') ? '#FFA726' : '#FF6B6B',
          color: 'white',
          padding: '1rem',
          margin: '1rem',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <strong>⚠️ {networkError.includes('not deployed') ? 'Info' : 'Error'}:</strong> {networkError}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          color: '#2187D0'
        }}>
          Loading blockchain data...
        </div>
      )}

      <main className='exchange grid'>
        <section className='exchange__section--left grid'>
          <Markets />
          <Balance />
          
          {/* ADDED ORDER COMPONENT */}
          <Order />
        </section>

        <section className='exchange__section--right grid'>
          {/* PriceChart Component (to be added) */}
          {/* Transactions Component (to be added) */}
          {/* Trades Component (to be added) */}

          {/* ADDED ORDERBOOK COMPONENT */}
          <PriceChart />
          
          <Transactions />
          
          <Trades />

          <OrderBook />
        </section>
      </main>
    </div>
  )
}

export default App