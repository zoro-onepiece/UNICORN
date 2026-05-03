import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

// Import your custom logos
import uronLogo from '../assets/uron.png';
import methLogo from '../assets/meth.png';
import mdaiLogo from '../assets/mdai.png';

import { loadBalances, transferTokens } from '../store/interactions';

const Balance = () => {
    const [token1TransferAmount, setToken1TransferAmount] = useState('')
    const [token2TransferAmount, setToken2TransferAmount] = useState('')
    const [activeTab, setActiveTab] = useState('deposit')

    const dispatch = useDispatch()

    const provider = useSelector(state => state.provider.connection)
    const account = useSelector(state => state.provider.account)
    const exchange = useSelector(state => state.exchange.contract)

    const tokens = useSelector(state => state.tokens.contracts)
    const symbols = useSelector(state => state.tokens.symbols)
    const tokenBalances = useSelector(state => state.tokens.balances)
    const exchangeBalances = useSelector(state => state.exchange.balances)
    const transferInProgress = useSelector(state => state.exchange.transferInProgress)

    // Helper to get dynamic icons
    const getIcon = (symbol) => {
        if (symbol === 'mETH') return methLogo;
        if (symbol === 'mDAI') return mdaiLogo;
        return uronLogo; 
    }

    const getTokenAddress = (token) => {
        if (!token) return null
        return token.target || token.address
    }

    const amountHandler = (e, token) => {
        const value = e.target.value
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            if (tokens[0] && token && getTokenAddress(token) === getTokenAddress(tokens[0])) {
                setToken1TransferAmount(value)
            } else if (tokens[1] && token && getTokenAddress(token) === getTokenAddress(tokens[1])) {
                setToken2TransferAmount(value)
            }
        }
    }

    const submitHandler = async (e, token, type, tokenIndex) => {
        e.preventDefault()

        if (!provider || !account || !exchange) {
            toast.error('Wallet not properly connected. Please reconnect.')
            return
        }

        const amount = tokenIndex === 0 ? token1TransferAmount : token2TransferAmount

        if (!amount || amount === '0' || amount === '') {
            toast.warn('Please enter an amount greater than 0')
            return
        }

        try {
            await transferTokens(provider, exchange, type, token, amount, dispatch, tokenIndex)
            if (tokenIndex === 0) setToken1TransferAmount('')
            else setToken2TransferAmount('')
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        const loadAllBalances = async () => {
            if (exchange && tokens[0] && tokens[1] && account) {
                await loadBalances(exchange, tokens, account, dispatch)
            }
        }
        loadAllBalances()
    }, [exchange, tokens, account, transferInProgress, dispatch])

    const formatBalance = (balance) => {
        if (!balance || balance === '0' || balance === '0.0') return '0.0000'
        return Number(balance).toFixed(4)
    }

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

            {/* Token 1 Section (Usually URON) */}
            <div className='exchange__transfers--form'>
                <div className='flex-between'>
                    <p>
                        <small>Token</small><br />
                        <img src={getIcon(symbols ? symbols[0] : 'URON')} alt="Token Logo" style={{ width: '24px', marginRight: '8px', verticalAlign: 'middle' }} />
                        <span style={{ fontWeight: 'bold' }}>{symbols ? symbols[0] : 'URON'}</span>
                    </p>
                    <p>
                        <small>Wallet</small><br />
                        <span>{tokenBalances ? formatBalance(tokenBalances[0]) : '0.0000'}</span>
                    </p>
                    <p>
                        <small>Exchange</small><br />
                        <span>{exchangeBalances ? formatBalance(exchangeBalances[0]) : '0.0000'}</span>
                    </p>
                </div>

                <form onSubmit={(e) => submitHandler(e, tokens[0], activeTab, 0)}>
                    <input
                        type="text"
                        placeholder='0.0000'
                        value={token1TransferAmount}
                        onChange={(e) => amountHandler(e, tokens[0])}
                        disabled={transferInProgress?.token1 || !isTokenReady(tokens[0])}
                    />
                    <button className='button' type='submit' disabled={transferInProgress?.token1 || !isTokenReady(tokens[0])}>
                        <span>{transferInProgress?.token1 ? 'Processing...' : activeTab === 'deposit' ? 'Deposit' : 'Withdraw'}</span>
                    </button>
                </form>
            </div>

            <hr />

            {/* Token 2 Section (Dynamic: mETH or mDAI) */}
            <div className='exchange__transfers--form'>
                <div className='flex-between'>
                    <p>
                        <small>Token</small><br />
                        <img src={getIcon(symbols ? symbols[1] : 'mETH')} alt="Token Logo" style={{ width: '24px', marginRight: '8px', verticalAlign: 'middle' }} />
                        <span style={{ fontWeight: 'bold' }}>{symbols ? symbols[1] : 'mETH'}</span>
                    </p>
                    <p>
                        <small>Wallet</small><br />
                        <span>{tokenBalances ? formatBalance(tokenBalances[1]) : '0.0000'}</span>
                    </p>
                    <p>
                        <small>Exchange</small><br />
                        <span>{exchangeBalances ? formatBalance(exchangeBalances[1]) : '0.0000'}</span>
                    </p>
                </div>

                <form onSubmit={(e) => submitHandler(e, tokens[1], activeTab, 1)}>
                    <input
                        type="text"
                        placeholder='0.0000'
                        value={token2TransferAmount}
                        onChange={(e) => amountHandler(e, tokens[1])}
                        disabled={transferInProgress?.token2 || !isTokenReady(tokens[1])}
                    />
                    <button className='button' type='submit' disabled={transferInProgress?.token2 || !isTokenReady(tokens[1])}>
                        <span>{transferInProgress?.token2 ? 'Processing...' : activeTab === 'deposit' ? 'Deposit' : 'Withdraw'}</span>
                    </button>
                </form>
            </div>
            <hr />
        </div>
    );
}

export default Balance;