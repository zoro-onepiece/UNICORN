import { useSelector, useDispatch } from 'react-redux'
import { ethers } from 'ethers'

import config from '../config.json'
import { loadTokens } from '../store/interactions'

const Markets = () => {
  const provider = useSelector(state => state.provider.connection)
  const chainId = useSelector(state => state.provider.chainId)

  const dispatch = useDispatch()

  const marketHandler = async (e) => {
    const addresses = e.target.value.split(',')
    loadTokens(provider, addresses, dispatch)
  }

  // Check if network has deployed contracts
  const hasDeployedContracts = () => {
    if (!chainId || !config[chainId]) return false
    
    const uron = config[chainId]?.URON
    const mETH = config[chainId]?.mETH
    const mDAI = config[chainId]?.mDAI
    
    // Check if addresses are not empty
    return uron?.address && uron.address.length > 0 &&
           mETH?.address && mETH.address.length > 0 &&
           mDAI?.address && mDAI.address.length > 0
  }

  return(
    <div className='component exchange__markets'>
      <div className='component__header'>
        <h2>Select Market</h2>
      </div>

      {chainId && config[chainId] && hasDeployedContracts() ? (
        <select name="markets" id="markets" onChange={marketHandler}>
          {/* Use URON instead of DApp */}
          <option value={`${config[chainId].URON.address},${config[chainId].mETH.address}`}>
            URON / mETH
          </option>
          <option value={`${config[chainId].URON.address},${config[chainId].mDAI.address}`}>
            URON / mDAI
          </option>
        </select>
      ) : (
        <div>
          <p style={{ color: '#FF6B6B', textAlign: 'center' }}>
            {chainId && config[chainId] 
              ? 'Contracts not deployed on this network'
              : 'Select a network to trade'}
          </p>
        </div>
      )}

      <hr />
    </div>
  )
}

export default Markets;