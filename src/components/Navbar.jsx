import { useSelector, useDispatch } from 'react-redux'
import Blockies from 'react-blockies'
import { ethers } from 'ethers'
import logo from '../assets/logo.png'
import eth from '../assets/eth.svg'
import { loadAccount, loadProvider } from '../store/interactions'
import config from '../config.json'

const Navbar = ({ setIsWalletConnected, connectWalletHandler }) => {
  const provider = useSelector(state => state.provider.connection)
  const chainId = useSelector(state => state.provider.chainId)
  const account = useSelector(state => state.provider.account)
  const balance = useSelector(state => state.provider.balance)

  const dispatch = useDispatch()

  const connectHandler = async () => {
    // Get current network from MetaMask first
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }
    
    const currentProvider = new ethers.BrowserProvider(window.ethereum)
    const network = await currentProvider.getNetwork()
    const currentChainId = Number(network.chainId)
    
    // Connect to the current network
    await connectWalletHandler(currentChainId)
  }

  const networkHandler = async (e) => {
    const selectedChainIdHex = e.target.value
    if (selectedChainIdHex === '0') return
    
    const selectedChainId = parseInt(selectedChainIdHex, 16)
    console.log('Switching to network:', selectedChainId)
    
    try {
      // Switch network in MetaMask
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: selectedChainIdHex }],
      })
      
      // After successful switch, MetaMask will emit a 'chainChanged' event
      // which will trigger a page reload in App.jsx
      
    } catch (switchError) {
      // If network not added, add it
      if (switchError.code === 4902) {
        const networkParams = selectedChainId === 11155111 ? {
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
      }
    }
  }

  return(
    <div className='exchange__header grid'>
      <div className='exchange__header--brand flex'>
        <img src={logo} className="logo" alt="Unicorn Logo" />
        <h1>Unicorn Exchange</h1>
      </div>
      
      <div className='exchange__header--networks flex'>
        <img src={eth} alt="ETH Logo" className='Eth Logo' />
        <select 
          name="networks" 
          id="networks" 
          value={chainId ? `0x${chainId.toString(16).toUpperCase()}` : '0'} 
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
                ? '#' 
                : config[chainId]?.explorerURL 
                  ? `${config[chainId].explorerURL}/address/${account}`
                  : '#'
            }
            target='_blank'
            rel='noreferrer'
            onClick={(e) => {
              if (chainId === 1337 || chainId === 31337) {
                e.preventDefault()
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