import { useSelector, useDispatch } from 'react-redux'
import Blockies from 'react-blockies'
import { ethers } from 'ethers'

import logo from '../assets/logo.png'
import eth from '../assets/eth.svg'

import { loadAccount, loadProvider } from '../store/interactions'

import config from '../config.json';


const Navbar = () => {


  const provider = useSelector(state => state.provider.connection)
  const chainId = useSelector(state => state.provider.chainId)
  const account = useSelector(state => state.provider.account)
  const balance = useSelector(state => state.provider.balance)

  const dispatch = useDispatch()

const connectHandler = async () => {
  try {
    // First check current network
    const tempProvider = new ethers.BrowserProvider(window.ethereum)
    const network = await tempProvider.getNetwork()
    const currentChainId = Number(network.chainId)
    
    console.log('Current network before connection:', currentChainId)
    
    // Check if this network is configured with contracts
    const hasContracts = config[currentChainId]?.URON?.address && 
                        config[currentChainId]?.mETH?.address
    
    if (!config[currentChainId] || !hasContracts) {
      const networkName = currentChainId === 11155111 ? 'Sepolia' : `chain ${currentChainId}`
      const shouldSwitch = window.confirm(
        `Contracts not deployed on ${networkName}. Switch to Hardhat (31337) to use the exchange?`
      )
      
      if (shouldSwitch) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }],
        })
        // Wait for chain change and reload
        await new Promise(resolve => setTimeout(resolve, 1000))
        window.location.reload()
        return
      } else {
        // User wants to stay on Sepolia without contracts
        // Clear any existing wallet connection state
        dispatch({ type: 'ACCOUNT_LOADED', account: null })
        dispatch({ type: 'ETHER_BALANCE_LOADED', balance: '0' })
        return
      }
    }
    
    // Now connect with the current provider
    const currentProvider = provider || loadProvider(dispatch)
    await loadAccount(currentProvider, dispatch)
    
  } catch (error) {
    console.error('Connection failed:', error)
    if (error.code === 4001) {
      alert('Connection rejected by user')
    }
  }
}

  const networkHandler = async (e) => {
    const selectedChainId = e.target.value
    if (selectedChainId === '0') return
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: selectedChainId }],
      })
    } catch (switchError) {
      // If network not added, add it (simplified)
      if (switchError.code === 4902) {
        try {
          const networkParams = selectedChainId === '0xAA36A7' ? {
            chainId: '0xAA36A7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/']
          } : {
            chainId: '0x7A69',
            chainName: 'Hardhat Local',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['http://127.0.0.1:8545/'],
            blockExplorerUrls: []
          }
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams],
          })
        } catch (addError) {
          console.error('Failed to add network:', addError)
        }
      }
    }
  }

  return(
  <div className='exchange__header grid'>
    <div className='exchange__header--brand flex'>
      <img src={logo} className="logo" alt="Unicorn Logo"></img>
      <h1>🦄 Unicorn Exchange</h1>
    </div>

    <div className='exchange__header--networks flex'>
      <img src={eth} alt="ETH Logo" className='Eth Logo' />

      {/* Always show network selector, even without chainId */}
      <select 
        name="networks" 
        id="networks" 
        value={chainId ? `0x${chainId.toString(16)}` : '0'} 
        onChange={networkHandler}
      >
        <option value="0" disabled>Select Network</option>
        <option value="0x7A69">Hardhat Network (31337)</option>
        <option value="0xAA36A7">Sepolia Testnet</option>
      </select>
    </div>

    <div className='exchange__header--account flex'>
      {balance ? (
        <p><small>My Balance</small>{Number(balance).toFixed(4)} ETH</p>
      ) : (
        <p><small>My Balance</small>0 ETH</p>
      )}
      {account ? (
  <a
    href={
      chainId === 1337 || chainId === 31337 
        ? '#'  // No explorer for local networks
        : config[chainId]?.explorerURL 
          ? `${config[chainId].explorerURL}/address/${account}`
          : '#'
    }
    target='_blank'
    rel='noreferrer'
    onClick={(e) => {
      if (chainId === 1337 || chainId === 31337) {
        e.preventDefault()
        // Copy address to clipboard
        navigator.clipboard.writeText(account)
        alert(`Address ${account} copied to clipboard`)
      }
    }}
  >
    {account.slice(0,5) + '...' + account.slice(38,42)}
    <Blockies
      seed={account}
      size={10}
      scale={3}
      color="#2187D0"
      bgColor="#F1F2F9"
      spotColor="#767F92"
      className="identicon"
    />
  </a>
) : (
  <button className="button" onClick={connectHandler}>Connect</button>
)}
    </div>
  </div>
)
}

export default Navbar