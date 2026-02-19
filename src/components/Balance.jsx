import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dapp from '../assets/dapp.svg';
import { loadBalances, transferTokens } from '../store/interactions';

const Balance = () => {
    const [token1TransferAmount, setToken1TransferAmount] = useState('')
    const [token2TransferAmount, setToken2TransferAmount] = useState('')
    const [activeTab, setActiveTab] = useState('deposit')
    const [transferStatus, setTransferStatus] = useState({ token1: false, token2: false })
    
    const dispatch = useDispatch()

    const provider = useSelector(state => state.provider.connection)
    const account = useSelector(state => state.provider.account)
    const exchange = useSelector(state => state.exchange.contract)

    const tokens = useSelector(state => state.tokens.contracts)
    const symbols = useSelector(state => state.tokens.symbols)
    const tokenBalances = useSelector(state => state.tokens.balances)
    const exchangeBalances = useSelector(state => state.exchange.balances)
    const transferInProgress = useSelector(state => state.exchange.transferInProgress)

    // Safe getter for token addresses (handles ethers v5 and v6)
    const getTokenAddress = (token) => {
        if (!token) return null
        return token.target || token.address
    }

    const amountHandler = (e, token) => {
        const value = e.target.value
        // Only allow numbers and decimals
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            if (tokens[0] && token && getTokenAddress(token) === getTokenAddress(tokens[0])) {
                setToken1TransferAmount(value)
            } else if (tokens[1] && token && getTokenAddress(token) === getTokenAddress(tokens[1])) {
                setToken2TransferAmount(value)
            }
        }
    }

    const submitHandler = async (e, token, type) => {
        e.preventDefault()

        if (!provider || !account || !exchange) {
            console.error('Missing required data for transaction')
            alert('Wallet not properly connected. Please reconnect.')
            return
        }

        if (!token) {
            console.error('Token contract not loaded')
            alert('Token contract not loaded. Please refresh.')
            return
        }

        const amount = token === tokens[0] 
            ? token1TransferAmount 
            : token2TransferAmount

        if (!amount || amount === '0' || amount === '') {
            alert('Please enter an amount greater than 0')
            return
        }

        // Set transfer status for this token
        if (token === tokens[0]) {
            setTransferStatus(prev => ({ ...prev, token1: true }))
        } else {
            setTransferStatus(prev => ({ ...prev, token2: true }))
        }

        try {
            await transferTokens(provider, exchange, type, token, amount, dispatch)
            
            // Clear input after successful transaction
            if (token === tokens[0]) {
                setToken1TransferAmount('')
            } else {
                setToken2TransferAmount('')
            }
            
            alert(`${type} successful!`)
            
        } catch (error) {
            console.error(`${type} failed:`, error)
            alert(`${type} failed: ${error.message || 'Unknown error'}`)
        } finally {
            // Clear transfer status
            if (token === tokens[0]) {
                setTransferStatus(prev => ({ ...prev, token1: false }))
            } else {
                setTransferStatus(prev => ({ ...prev, token2: false }))
            }
        }
    }

    useEffect(() => {
        const loadAllBalances = async () => {
            if (exchange && tokens[0] && tokens[1] && account) {
                try {
                    await loadBalances(exchange, tokens, account, dispatch)
                } catch (error) {
                    console.error('Error loading balances in useEffect:', error)
                }
            }
        }

        loadAllBalances()
    }, [exchange, tokens, account, transferInProgress, dispatch])

    // Format balance for display
    const formatBalance = (balance) => {
        if (!balance || balance === '0' || balance === '0.0') return '0.0000'
        return Number(balance).toFixed(4)
    }

    // Check if token is loaded and ready
    const isTokenReady = (token) => {
        return token && getTokenAddress(token)
    }

    return (
        <div className='component exchange__transfers'>
            <div className='component__header flex-between'>
                <h2>Balance</h2>
                <div className='tabs'>
                    <button 
                        className={`tab ${activeTab === 'deposit' ? 'tab--active' : ''}`}
                        onClick={() => setActiveTab('deposit')}
                    >
                        Deposit
                    </button>
                    <button 
                        className={`tab ${activeTab === 'withdraw' ? 'tab--active' : ''}`}
                        onClick={() => setActiveTab('withdraw')}
                    >
                        Withdraw
                    </button>
                </div>
            </div>

            {/* URON Section */}
            <div className='exchange__transfers--form'>
                <div className='flex-between'>
                    <p>
                        <small>Token</small><br />
                        <img src={dapp} alt="URON Logo" style={{ width: '20px', marginRight: '5px' }} />
                        <span style={{ fontWeight: 'bold' }}>
                            {symbols && symbols[0] ? symbols[0] : 'URON'}
                        </span>
                    </p>
                    <p>
                        <small>Wallet</small><br />
                        <span style={{ color: tokenBalances && tokenBalances[0] ? '#25CE8F' : '#767F92' }}>
                            {tokenBalances ? formatBalance(tokenBalances[0]) : '0.0000'}
                        </span>
                    </p>
                    <p>
                        <small>Exchange</small><br />
                        <span style={{ color: exchangeBalances && exchangeBalances[0] ? '#2187D0' : '#767F92' }}>
                            {exchangeBalances ? formatBalance(exchangeBalances[0]) : '0.0000'}
                        </span>
                    </p>
                </div>

                <form onSubmit={(e) => submitHandler(e, tokens[0], activeTab)}>
                    <label htmlFor="token0">
                        {symbols && symbols[0] ? symbols[0] : 'URON'} Amount ({activeTab})
                    </label>
                    <input
                        type="text"
                        id='token0'
                        placeholder='0.0000'
                        value={token1TransferAmount}
                        onChange={(e) => amountHandler(e, tokens[0])}
                        disabled={transferInProgress || transferStatus.token1 || !isTokenReady(tokens[0])}
                        style={{ 
                            opacity: transferInProgress || transferStatus.token1 ? 0.6 : 1,
                            cursor: transferInProgress || transferStatus.token1 ? 'not-allowed' : 'text'
                        }}
                    />
                    <button 
                        className='button' 
                        type='submit' 
                        disabled={transferInProgress || transferStatus.token1 || !isTokenReady(tokens[0])}
                        style={{ 
                            opacity: transferInProgress || transferStatus.token1 ? 0.6 : 1,
                            cursor: transferInProgress || transferStatus.token1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <span>
                            {transferStatus.token1 
                                ? 'Processing...' 
                                : transferInProgress 
                                    ? 'Loading...' 
                                    : activeTab === 'deposit' ? 'Deposit' : 'Withdraw'
                            }
                        </span>
                    </button>
                </form>
            </div>

            <hr />

            {/* mETH Section */}
            <div className='exchange__transfers--form'>
                <div className='flex-between'>
                    <p>
                        <small>Token</small><br />
                        <img src={dapp} alt="mETH Logo" style={{ width: '20px', marginRight: '5px' }} />
                        <span style={{ fontWeight: 'bold' }}>
                            {symbols && symbols[1] ? symbols[1] : 'mETH'}
                        </span>
                    </p>
                    <p>
                        <small>Wallet</small><br />
                        <span style={{ color: tokenBalances && tokenBalances[1] ? '#25CE8F' : '#767F92' }}>
                            {tokenBalances ? formatBalance(tokenBalances[1]) : '0.0000'}
                        </span>
                    </p>
                    <p>
                        <small>Exchange</small><br />
                        <span style={{ color: exchangeBalances && exchangeBalances[1] ? '#2187D0' : '#767F92' }}>
                            {exchangeBalances ? formatBalance(exchangeBalances[1]) : '0.0000'}
                        </span>
                    </p>
                </div>

                <form onSubmit={(e) => submitHandler(e, tokens[1], activeTab)}>
                    <label htmlFor="token1">
                        {symbols && symbols[1] ? symbols[1] : 'mETH'} Amount ({activeTab})
                    </label>
                    <input
                        type="text"
                        id='token1'
                        placeholder='0.0000'
                        value={token2TransferAmount}
                        onChange={(e) => amountHandler(e, tokens[1])}
                        disabled={transferInProgress || transferStatus.token2 || !isTokenReady(tokens[1])}
                        style={{ 
                            opacity: transferInProgress || transferStatus.token2 ? 0.6 : 1,
                            cursor: transferInProgress || transferStatus.token2 ? 'not-allowed' : 'text'
                        }}
                    />
                    <button 
                        className='button' 
                        type='submit' 
                        disabled={transferInProgress || transferStatus.token2 || !isTokenReady(tokens[1])}
                        style={{ 
                            opacity: transferInProgress || transferStatus.token2 ? 0.6 : 1,
                            cursor: transferInProgress || transferStatus.token2 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <span>
                            {transferStatus.token2 
                                ? 'Processing...' 
                                : transferInProgress 
                                    ? 'Loading...' 
                                    : activeTab === 'deposit' ? 'Deposit' : 'Withdraw'
                            }
                        </span>
                    </button>
                </form>
            </div>

            <hr />
        </div>
    );
}

export default Balance;