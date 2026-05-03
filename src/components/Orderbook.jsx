import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import sort from '../assets/sort.svg'
import { orderBookSelector } from '../store/selectors'
import { fillOrder } from '../store/interactions'

const OrderBook = () => {
  const dispatch = useDispatch()
  const provider = useSelector(state => state.provider.connection)
  const exchange = useSelector(state => state.exchange.contract)
  const symbols = useSelector(state => state.tokens.symbols)
  const orderBook = useSelector(orderBookSelector)

  const formatData = (num) => {
    return Number(num).toFixed(4)
  }

  const fillOrderHandler = (order) => {
    toast.info('Initiating trade... Please confirm in MetaMask.')
    fillOrder(provider, exchange, order, dispatch)
  }

  return (
    <div className="component exchange__orderbook">
      <div className='component__header flex-between'>
        <h2>Order Book</h2>
      </div>

      <div className="flex">

        {!orderBook || !orderBook.sellOrders || orderBook.sellOrders.length === 0 ? (
          <p className='flex-center' style={{ color: '#767F92' }}>No Sell Orders</p>
        ) : (
          <table className='exchange__orderbook--sell'>
            <caption>Selling</caption>
            <thead>
              <tr>
                <th>{symbols && symbols[0]}<img src={sort} alt="Sort" /></th>
                <th>{symbols && symbols[0]}/{symbols && symbols[1]}<img src={sort} alt="Sort" /></th>
                <th>{symbols && symbols[1]}<img src={sort} alt="Sort" /></th>
              </tr>
            </thead>
            <tbody>
              {orderBook.sellOrders.map((order, index) => {
                return(
                <tr key={index} onClick={() => fillOrderHandler(order)}>
                  <td>{formatData(order.token0Amount)}</td>
                  <td style={{ color: `${order.orderTypeClass}` }}>{formatData(order.tokenPrice)}</td>
                  <td>{formatData(order.token1Amount)}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className='divider'></div>

       {!orderBook || !orderBook.buyOrders || orderBook.buyOrders.length === 0 ? (
          <p className='flex-center' style={{ color: '#767F92' }}>No Buy Orders</p>
        ) : (
          <table className='exchange__orderbook--buy'>
            <caption>Buying</caption>
            <thead>
              <tr>
                <th>{symbols && symbols[0]}<img src={sort} alt="Sort" /></th>
                <th>{symbols && symbols[0]}/{symbols && symbols[1]}<img src={sort} alt="Sort" /></th>
                <th>{symbols && symbols[1]}<img src={sort} alt="Sort" /></th>
              </tr>
            </thead>
            <tbody>
              {orderBook.buyOrders.map((order, index) => {
                return (
                  <tr key={index} onClick={() => fillOrderHandler(order)}>
                    <td>{formatData(order.token0Amount)}</td>
                    <td style={{ color: `${order.orderTypeClass}` }}>{formatData(order.tokenPrice)}</td>
                    <td>{formatData(order.token1Amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default OrderBook;