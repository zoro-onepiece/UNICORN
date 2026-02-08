import { useSelector, useDispatch } from 'react-redux'
import { ethers } from 'ethers'

import config from '../config.json'
import { loadTokens } from '../store/interactions'

const Markets = () => {
  const provider = useSelector(state => state.provider.connection)
  const chainId = useSelector(state => state.provider.chainId)
  const account = useSelector(state => state.provider.account)

  const dispatch = useDispatch()

  const marketHandler = async (e) => {
    if (!account) {
      alert('Please connect your wallet first!')
      return
    }
    
    const addresses = e.target.value.split(',')
    try {
      await loadTokens(provider, addresses, dispatch)
    } catch (error) {
      alert(`Error loading market: ${error.message}`)
    }
  }

  // Check if network has deployed contracts
  const hasDeployedContracts = () => {
    if (!chainId || !config[chainId]) return false
    
    const uron = config[chainId]?.URON
    const mETH = config[chainId]?.mETH
    const mDAI = config[chainId]?.mDAI
    
    return uron?.address && uron.address.trim() !== '' &&
           mETH?.address && mETH.address.trim() !== '' &&
           mDAI?.address && mDAI.address.trim() !== ''
  }

  return(
    <div className='component exchange__markets'>
      <div className='component__header'>
        <h2>Select Market</h2>
      </div>

      {chainId && config[chainId] && hasDeployedContracts() && account ? (
        <select name="markets" id="markets" onChange={marketHandler}>
          <option value={`${config[chainId].URON.address},${config[chainId].mETH.address}`}>
            URON / mETH
          </option>
          <option value={`${config[chainId].URON.address},${config[chainId].mDAI.address}`}>
            URON / mDAI
          </option>
        </select>
      ) : !account ? (
        <div>
          <p style={{ color: '#767F92', textAlign: 'center' }}>
            Connect wallet to select market
          </p>
        </div>
      ) : !hasDeployedContracts() ? (
        <div>
          <p style={{ color: '#FFA726', textAlign: 'center' }}>
            Contracts not deployed on this network
          </p>
        </div>
      ) : (
        <div>
          <p style={{ color: '#767F92', textAlign: 'center' }}>
            Select a network to trade
          </p>
        </div>
      )}

      <hr />
    </div>
  )
}

export default Markets