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

const openOrders = state => {
  const all = allOrders(state)
  const filled = filledOrders(state)
  const cancelled = cancelledOrders(state)

  const openOrders = reject(all, (order) => {
    const orderFilled = filled.some((o) => o.id.toString() === order.id.toString())
    const orderCancelled = cancelled.some((o) => o.id.toString() === order.id.toString())
    return (orderFilled || orderCancelled)
  })

  return openOrders
}

const decorateOrder = (order, tokens) => {
  let token0Amount, token1Amount

  // Note: URON should be considered token0, mETH is considered token1
  const token1Address = tokens[1].target || tokens[1].address

  if (order.tokenGive === token1Address) {
    token0Amount = order.amountGive // Amount of URON we are giving
    token1Amount = order.amountGet // Amount of mETH we want
  } else {
    token0Amount = order.amountGet // Amount of URON we want
    token1Amount = order.amountGive // Amount of mETH we are giving
  }

  // Calculate token price to 5 decimal places
  const precision = 100000
  let tokenPrice = (Number(token1Amount) / Number(token0Amount))
  tokenPrice = Math.round(tokenPrice * precision) / precision

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

    const token0Address = tokens[0].target || tokens[0].address
    const token1Address = tokens[1].target || tokens[1].address

    // Filter orders by selected tokens
    orders = orders.filter((o) => o.tokenGet === token0Address || o.tokenGet === token1Address)
    orders = orders.filter((o) => o.tokenGive === token0Address || o.tokenGive === token1Address)

    // Decorate orders
    orders = decorateOrderBookOrders(orders, tokens)

    // Group orders by "orderType"
    orders = groupBy(orders, 'orderType')

    // Fetch buy orders
    const buyOrders = get(orders, 'buy', [])

    // Sort buy orders by token price
    orders = {
      ...orders,
      buyOrders: buyOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
    }

    // Fetch sell orders
    const sellOrders = get(orders, 'sell', [])

    // Sort sell orders by token price
    orders = {
      ...orders,
      sellOrders: sellOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
    }

    return orders
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
  const token1Address = tokens[1].target || tokens[1].address
  const orderType = order.tokenGive === token1Address ? 'buy' : 'sell'

  return ({
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy' ? GREEN : RED),
    orderFillAction: (orderType === 'buy' ? 'sell' : 'buy')
  })
}