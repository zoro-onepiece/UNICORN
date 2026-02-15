import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dapp from '../assets/dapp.svg';
import { loadBalances, transferTokens } from '../store/interactions';

const Balance = () => {
    const [token1TransferAmount, setToken1TransferAmount] = useState('0')
    const [token2TransferAmount, setToken2TransferAmount] = useState('0')
    const [activeTab, setActiveTab] = useState('deposit') // Add tab state
    const dispatch = useDispatch()

    const provider = useSelector(state => state.provider.connection)
    const account = useSelector(state => state.provider.account)
    const exchange = useSelector(state => state.exchange.contract)

    const tokens = useSelector(state => state.tokens.contracts)
    const symbols = useSelector(state => state.tokens.symbols)
    const tokenBalances = useSelector(state => state.tokens.balances)
    const exchangeBalances = useSelector(state => state.exchange.balances)
    const transferInProgress = useSelector(state => state.exchange.transferInProgress)

    // FIXED: Use .address instead of .target
    const amountHandler = (e, token) => {
        if (tokens[0] && token.address === tokens[0].address) {
            setToken1TransferAmount(e.target.value)
        } else if (tokens[1] && token.address === tokens[1].address) {
            setToken2TransferAmount(e.target.value)
        }
    }

    // FIXED: Handle both deposit and withdraw
    const submitHandler = async (e, token, type) => {
        e.preventDefault()

        if (!provider || !account || !exchange) {
            console.error('Missing required data for transaction')
            return
        }

        const amount = token.address === tokens[0]?.address 
            ? token1TransferAmount 
            : token2TransferAmount

        if (amount === '0' || amount === '') {
            console.error('Please enter an amount')
            return
        }

        await transferTokens(provider, exchange, type, token, amount, dispatch)
        
        // Clear input after transaction
        if (token.address === tokens[0]?.address) {
            setToken1TransferAmount('0')
        } else {
            setToken2TransferAmount('0')
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
                        {symbols && symbols[0] || 'URON'}
                    </p>
                    <p>
                        <small>Wallet</small><br />
                        {tokenBalances && tokenBalances[0] ? Number(tokenBalances[0]).toFixed(4) : '0.0000'}
                    </p>
                    <p>
                        <small>Exchange</small><br />
                        {exchangeBalances && exchangeBalances[0] ? Number(exchangeBalances[0]).toFixed(4) : '0.0000'}
                    </p>
                </div>

                <form onSubmit={(e) => submitHandler(e, tokens[0], activeTab)}>
                    <label htmlFor="token0">
                        {symbols && symbols[0] || 'URON'} Amount ({activeTab})
                    </label>
                    <input
                        type="text"
                        id='token0'
                        placeholder='0.0000'
                        value={token1TransferAmount === '0' ? '' : token1TransferAmount}
                        onChange={(e) => amountHandler(e, tokens[0])}
                        disabled={transferInProgress}
                    />
                    <button 
                        className='button' 
                        type='submit' 
                        disabled={transferInProgress || !tokens[0]}
                    >
                        <span>
                            {transferInProgress 
                                ? 'Processing...' 
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
                        {symbols && symbols[1] || 'mETH'}
                    </p>
                    <p>
                        <small>Wallet</small><br />
                        {tokenBalances && tokenBalances[1] ? Number(tokenBalances[1]).toFixed(4) : '0.0000'}
                    </p>
                    <p>
                        <small>Exchange</small><br />
                        {exchangeBalances && exchangeBalances[1] ? Number(exchangeBalances[1]).toFixed(4) : '0.0000'}
                    </p>
                </div>

                <form onSubmit={(e) => submitHandler(e, tokens[1], activeTab)}>
                    <label htmlFor="token1">
                        {symbols && symbols[1] || 'mETH'} Amount ({activeTab})
                    </label>
                    <input
                        type="text"
                        id='token1'
                        placeholder='0.0000'
                        value={token2TransferAmount === '0' ? '' : token2TransferAmount}
                        onChange={(e) => amountHandler(e, tokens[1])}
                        disabled={transferInProgress}
                    />
                    <button 
                        className='button' 
                        type='submit' 
                        disabled={transferInProgress || !tokens[1]}
                    >
                        <span>
                            {transferInProgress 
                                ? 'Processing...' 
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