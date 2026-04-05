import { createSelector } from 'reselect'
import { get, groupBy, reject } from 'lodash';
import moment from 'moment'
import { ethers } from 'ethers';

const GREEN = '#25CE8F'
const RED = '#F45353'

const tokens = state => get(state, 'tokens.contracts')
const allOrders = state => get(state, 'exchange.allOrders.data', [])
const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', [])
const filledOrders = state => get(state, 'exchange.filledOrders.data', [])

// FIX 1: Wrap in createSelector to prevent the infinite loop warning
const openOrders = createSelector(
  allOrders,
  filledOrders,
  cancelledOrders,
  (all, filled, cancelled) => {
    return reject(all, (order) => {
      const orderFilled = filled.some((o) => o.id.toString() === order.id.toString())
      const orderCancelled = cancelled.some((o) => o.id.toString() === order.id.toString())
      return (orderFilled || orderCancelled)
    })
  }
)

const decorateOrder = (order, tokens) => {
  let token0Amount, token1Amount

  const token0Address = (tokens[0].target || tokens[0].address).toLowerCase()
  const token1Address = (tokens[1].target || tokens[1].address).toLowerCase()
  const orderTokenGive = order.tokenGive.toLowerCase()

  if (orderTokenGive === token1Address) {
    token1Amount = order.amountGive 
    token0Amount = order.amountGet  
  } else {
    token0Amount = order.amountGive 
    token1Amount = order.amountGet  
  }

  // Calculate token price
  const precision = 100000
  let tokenPrice = (Number(token1Amount) / Number(token0Amount))
  // FIX: Catch any bad 0/0 math
  if (isNaN(tokenPrice) || tokenPrice === Infinity) {
    tokenPrice = 0
  } else {
    tokenPrice = Math.round(tokenPrice * precision) / precision
  }

  return ({
    ...order,
    token1Amount: ethers.formatUnits(token1Amount, 18),
    token0Amount: ethers.formatUnits(token0Amount, 18),
    tokenPrice,
    formattedTimestamp: moment.unix(Number(order.timestamp)).format('h:mm:ssa d MMM D')
  })
}

// ------------------------------------------------------------------------------
// ORDER BOOK SELECTOR

export const orderBookSelector = createSelector(
  openOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }

    const t0 = (tokens[0].target || tokens[0].address).toLowerCase()
    const t1 = (tokens[1].target || tokens[1].address).toLowerCase()

    // STRICT FILTER: Only show orders where BOTH tokens match the current market
    orders = orders.filter((o) => {
      const get = o.tokenGet.toLowerCase()
      const give = o.tokenGive.toLowerCase()
      return (get === t0 && give === t1) || (get === t1 && give === t0)
    })

    // Decorate orders
    orders = decorateOrderBookOrders(orders, tokens)

    // Group orders by "orderType"
    orders = groupBy(orders, 'orderType')

    // Fetch buy orders
    const buyOrders = get(orders, 'buy', [])

    // Fetch sell orders
    const sellOrders = get(orders, 'sell', [])

    // FIX 2: Create a copy of the array [...] before sorting so Redux doesn't mutate in place
    return {
      ...orders,
      buyOrders: [...buyOrders].sort((a, b) => b.tokenPrice - a.tokenPrice),
      sellOrders: [...sellOrders].sort((a, b) => b.tokenPrice - a.tokenPrice)
    }
  }
)

const decorateOrderBookOrders = (orders, tokens) => {
  return (
    orders.map((order) => {
      order = decorateOrder(order, tokens)
      order = decorateOrderBookOrder(order, tokens)
      return (order)
    })
  )
}

const decorateOrderBookOrder = (order, tokens) => {
  const token1Address = (tokens[1].target || tokens[1].address).toLowerCase()
  const orderType = order.tokenGive.toLowerCase() === token1Address ? 'buy' : 'sell'

  return ({
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy' ? GREEN : RED),
    orderFillAction: (orderType === 'buy' ? 'sell' : 'buy')
  })
}