import { useSelector, useDispatch } from 'react-redux'
import sort from '../assets/sort.svg'
import { orderBookSelector } from '../store/selectors'
// 1. Import the interaction
import { fillOrder } from '../store/interactions'

const OrderBook = () => {
  const dispatch = useDispatch() // Need this to send actions
  
  // 2. Get required data for filling orders
  const provider = useSelector(state => state.provider.connection)
  const exchange = useSelector(state => state.exchange.contract)
  const symbols = useSelector(state => state.tokens.symbols)
  const orderBook = useSelector(orderBookSelector)

  // 3. Helper function to handle the click
  const fillOrderHandler = (order) => {
    fillOrder(provider, exchange, order, dispatch)
  }

  return (
    <div className="component exchange__orderbook">
      <div className='component__header flex-between'>
        <h2>Order Book</h2>
      </div>

      <div className="flex">

        {!orderBook || !orderBook.sellOrders || orderBook.sellOrders.length === 0 ? (
          <p className='flex-center'>No Sell Orders</p>
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
                /* 4. Add the onClick listener here */
                <tr key={index} onClick={() => fillOrderHandler(order)}>
                  <td>{order.token0Amount}</td>
                  <td style={{ color: `${order.orderTypeClass}` }}>{order.tokenPrice}</td>
                  <td>{order.token1Amount}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className='divider'></div>

       {!orderBook || !orderBook.buyOrders || orderBook.buyOrders.length === 0 ? (
          <p className='flex-center'>No Buy Orders</p>
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
                  /* 5. Add the onClick listener here as well */
                  <tr key={index} onClick={() => fillOrderHandler(order)}>
                    <td>{order.token0Amount}</td>
                    <td style={{ color: `${order.orderTypeClass}` }}>{order.tokenPrice}</td>
                    <td>{order.token1Amount}</td>
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