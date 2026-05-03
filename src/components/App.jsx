import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import config from '../config.json';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  loadProvider,
  loadNetwork,
  loadAccount,
  loadTokens,
  loadExchange,
  loadBalances,
  loadAllOrders,
  subscribeToEvents
} from '../store/interactions';

import Navbar from './Navbar';
import Markets from './Markets';
import Balance from './Balance';
import Order from './Order';
import OrderBook from './Orderbook';
import PriceChart from './Pricechart';
import Transactions from './Transactions';
import Trades from './Trades';

function App() {
  const dispatch = useDispatch()
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [networkError, setNetworkError] = useState(null)
  const [initialized, setInitialized] = useState(false)

  const loadBlockchainData = async (chainIdToLoad = null) => {
    if (isLoading) return
    setIsLoading(true)
    setNetworkError(null)

    try {
      if (!window.ethereum) {
        toast.error('Please install MetaMask to use this exchange.')
        setIsLoading(false)
        return
      }

      const provider = loadProvider(dispatch)
      let chainId
      if (chainIdToLoad) {
        chainId = chainIdToLoad
        dispatch({ type: 'NETWORK_LOADED', chainId })
      } else {
        chainId = await loadNetwork(provider, dispatch)
      }

      if (!config[chainId]) {
        toast.error(`Network ${chainId} not configured. Switch to Hardhat (31337).`)
        setIsLoading(false)
        return
      }

      const URON = config[chainId]?.URON
      const mETH = config[chainId]?.mETH
      const hasContracts = URON?.address && URON.address.trim() !== '' &&
        mETH?.address && mETH.address.trim() !== ''

      if (!hasContracts) {
        toast.warn(`Contracts not deployed on network ${chainId}.`)
        setIsLoading(false)
        return
      }

      const account = await loadAccount(provider, dispatch)
      const loadedTokens = await loadTokens(provider, [URON.address, mETH.address], dispatch)
      const exchangeConfig = config[chainId]?.exchange
      
      if (exchangeConfig?.address && exchangeConfig.address.trim() !== '') {
        const loadedExchange = await loadExchange(provider, exchangeConfig.address, dispatch)

        if (loadedExchange && loadedTokens && loadedTokens[0] && loadedTokens[1] && account) {
          await loadBalances(loadedExchange, loadedTokens, account, dispatch)
        }
        if (loadedExchange) {
          await loadAllOrders(provider, loadedExchange, dispatch)
          subscribeToEvents(loadedExchange, dispatch)
        }
      }

      setIsWalletConnected(true)
      toast.success('Blockchain data loaded successfully!')

    } catch (error) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const connectWalletHandler = async (chainId = null) => {
    try {
      if (!window.ethereum) {
        toast.error('Please install MetaMask!')
        return
      }

      const provider = loadProvider(dispatch)
      await loadAccount(provider, dispatch)
      const currentProvider = new ethers.BrowserProvider(window.ethereum)
      const network = await currentProvider.getNetwork()
      const currentChainId = Number(network.chainId)

      if (chainId && chainId !== currentChainId) {
        try {
          const hexChainId = '0x' + chainId.toString(16)
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
          })
          setTimeout(() => { window.location.reload() }, 1000)
          return
        } catch (switchError) {
          if (switchError.code === 4902) {
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
            setTimeout(() => { window.location.reload() }, 1000)
          }
        }
      }
      loadBlockchainData(currentChainId)
    } catch (error) {
      if (error.code === 4001) {
        toast.error('Connection rejected by user')
      }
    }
  }

 useEffect(() => {
  if (window.ethereum) {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        window.location.reload()
      } else {
        dispatch({ type: 'ACCOUNT_LOADED', account: null })
        dispatch({ type: 'ETHER_BALANCE_LOADED', balance: '0' })
        setIsWalletConnected(false)
      }
    }

    const handleChainChanged = (newChainIdHex) => {
      const newChainId = parseInt(newChainIdHex, 16)
      dispatch({ type: 'ACCOUNT_LOADED', account: null })
      dispatch({ type: 'ETHER_BALANCE_LOADED', balance: '0' })
      dispatch({ type: 'NETWORK_LOADED', chainId: newChainId })
      setIsWalletConnected(false)
      setNetworkError(null)
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    const init = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const network = await provider.getNetwork()
        const currentChainId = Number(network.chainId)
        dispatch({ type: 'NETWORK_LOADED', chainId: currentChainId })
        const accounts = await provider.listAccounts()
        if (accounts.length > 0 && window.ethereum.selectedAddress) {
          await connectWalletHandler(currentChainId)
        }
        setInitialized(true)
      } catch (error) {
        setInitialized(true)
      }
    }

    init()
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
      <Navbar setIsWalletConnected={setIsWalletConnected} connectWalletHandler={connectWalletHandler} />
      
      {/* Toast Notification Container */}
      <ToastContainer position="bottom-right" theme="dark" hideProgressBar={false} />

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#2187D0' }}>
          Syncing with Blockchain...
        </div>
      )}

      <main className='exchange grid'>
        <section className='exchange__section--left grid'>
          <Markets />
          <Balance />
          <Order />
        </section>

        <section className='exchange__section--right grid'>
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