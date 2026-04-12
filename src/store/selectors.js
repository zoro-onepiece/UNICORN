import { createSelector } from 'reselect'
import { get, groupBy, reject, maxBy, minBy } from 'lodash';
import moment from 'moment'
import { ethers } from 'ethers';

const GREEN = '#25CE8F'
const RED = '#F45353'

const account = state => get(state, 'provider.account')
const tokens = state => get(state, 'tokens.contracts')
const allOrders = state => get(state, 'exchange.allOrders.data', [])
const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', [])
const filledOrders = state => get(state, 'exchange.filledOrders.data', [])

// ------------------------------------------------------------------------------
// BASE HELPERS & DECORATORS
// ------------------------------------------------------------------------------

const openOrders = createSelector(
  allOrders, filledOrders, cancelledOrders,
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

  const precision = 100000
  let tokenPrice = (Number(token1Amount) / Number(token0Amount))
  if (isNaN(tokenPrice) || tokenPrice === Infinity) tokenPrice = 0
  else tokenPrice = Math.round(tokenPrice * precision) / precision

  return ({
    ...order,
    token1Amount: ethers.formatUnits(token1Amount, 18),
    token0Amount: ethers.formatUnits(token0Amount, 18),
    tokenPrice,
    formattedTimestamp: moment.unix(Number(order.timestamp)).format('h:mm:ssa d MMM D')
  })
}

// ------------------------------------------------------------------------------
// ORDER BOOK
// ------------------------------------------------------------------------------

export const orderBookSelector = createSelector(
  openOrders, tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }
    const t0 = (tokens[0].target || tokens[0].address).toLowerCase()
    const t1 = (tokens[1].target || tokens[1].address).toLowerCase()

    orders = orders.filter((o) => {
      const get = o.tokenGet.toLowerCase()
      const give = o.tokenGive.toLowerCase()
      return (get === t0 && give === t1) || (get === t1 && give === t0)
    })

    orders = orders.map((o) => decorateOrderBookOrder(decorateOrder(o, tokens), tokens))
    orders = groupBy(orders, 'orderType')
    
    const buyOrders = get(orders, 'buy', [])
    const sellOrders = get(orders, 'sell', [])

    return {
      ...orders,
      buyOrders: [...buyOrders].sort((a, b) => b.tokenPrice - a.tokenPrice),
      sellOrders: [...sellOrders].sort((a, b) => b.tokenPrice - a.tokenPrice)
    }
  }
)

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

// ------------------------------------------------------------------------------
// MY OPEN ORDERS
// ------------------------------------------------------------------------------

export const myOpenOrdersSelector = createSelector(
  account, tokens, openOrders,
  (account, tokens, orders) => {
    if (!tokens[0] || !tokens[1] || !account) { return }

    const t0 = (tokens[0].target || tokens[0].address).toLowerCase()
    const t1 = (tokens[1].target || tokens[1].address).toLowerCase()

    orders = orders.filter((o) => o.user.toLowerCase() === account.toLowerCase())
    orders = orders.filter((o) => {
      const get = o.tokenGet.toLowerCase()
      const give = o.tokenGive.toLowerCase()
      return (get === t0 && give === t1) || (get === t1 && give === t0)
    })

    orders = orders.map((o) => decorateMyOpenOrder(decorateOrder(o, tokens), tokens))
    return [...orders].sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
  }
)

const decorateMyOpenOrder = (order, tokens) => {
  const token1Address = (tokens[1].target || tokens[1].address).toLowerCase()
  let orderType = order.tokenGive.toLowerCase() === token1Address ? 'buy' : 'sell'
  return({ ...order, orderType, orderTypeClass: (orderType === 'buy' ? GREEN : RED) })
}

// ------------------------------------------------------------------------------
// ALL FILLED ORDERS (TRADES)
// ------------------------------------------------------------------------------

export const filledOrdersSelector = createSelector(
  filledOrders, tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }

    const t0 = (tokens[0].target || tokens[0].address).toLowerCase()
    const t1 = (tokens[1].target || tokens[1].address).toLowerCase()

    orders = orders.filter((o) => {
      const get = o.tokenGet.toLowerCase()
      const give = o.tokenGive.toLowerCase()
      return (get === t0 && give === t1) || (get === t1 && give === t0)
    })

    orders = [...orders].sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    orders = decorateFilledOrders(orders, tokens)
    return [...orders].sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
  }
)

const decorateFilledOrders = (orders, tokens) => {
  let previousOrder = orders[0]
  return(
    orders.map((order) => {
      order = decorateOrder(order, tokens)
      order = decorateFilledOrder(order, previousOrder)
      previousOrder = order
      return order
    })
  )
}

const decorateFilledOrder = (order, previousOrder) => {
  return({
    ...order,
    tokenPriceClass: tokenPriceClass(order.tokenPrice, order.id, previousOrder)
  })
}

const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {
  if (previousOrder.id === orderId) return GREEN
  if (previousOrder.tokenPrice <= tokenPrice) return GREEN
  return RED 
}

// ------------------------------------------------------------------------------
// MY FILLED ORDERS (MY TRANSACTIONS)
// ------------------------------------------------------------------------------

export const myFilledOrdersSelector = createSelector(
  account, tokens, filledOrders,
  (account, tokens, orders) => {
    if (!tokens[0] || !tokens[1] || !account) { return }

    const t0 = (tokens[0].target || tokens[0].address).toLowerCase()
    const t1 = (tokens[1].target || tokens[1].address).toLowerCase()

    orders = orders.filter((o) => o.user.toLowerCase() === account.toLowerCase() || o.creator?.toLowerCase() === account.toLowerCase())
    
    orders = orders.filter((o) => {
      const get = o.tokenGet.toLowerCase()
      const give = o.tokenGive.toLowerCase()
      return (get === t0 && give === t1) || (get === t1 && give === t0)
    })

    orders = [...orders].sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    orders = orders.map((o) => decorateMyFilledOrder(decorateOrder(o, tokens), account, tokens))
    return orders
  }
)

const decorateMyFilledOrder = (order, account, tokens) => {
  const myOrder = order.creator?.toLowerCase() === account.toLowerCase()
  const token1Address = (tokens[1].target || tokens[1].address).toLowerCase()

  let orderType
  if(myOrder) {
    orderType = order.tokenGive.toLowerCase() === token1Address ? 'buy' : 'sell'
  } else {
    orderType = order.tokenGive.toLowerCase() === token1Address ? 'sell' : 'buy'
  }

  return({
    ...order,
    orderType,
    orderClass: (orderType === 'buy' ? GREEN : RED),
    orderSign: (orderType === 'buy' ? '+' : '-')
  })
}

// ------------------------------------------------------------------------------
// PRICE CHART
// ------------------------------------------------------------------------------

export const priceChartSelector = createSelector(
  filledOrders, tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }

    const t0 = (tokens[0].target || tokens[0].address).toLowerCase()
    const t1 = (tokens[1].target || tokens[1].address).toLowerCase()

    orders = orders.filter((o) => {
      const get = o.tokenGet.toLowerCase()
      const give = o.tokenGive.toLowerCase()
      return (get === t0 && give === t1) || (get === t1 && give === t0)
    })

    orders = [...orders].sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    orders = orders.map((o) => decorateOrder(o, tokens))

    let secondLastOrder, lastOrder
    [secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.length)

    const lastPrice = get(lastOrder, 'tokenPrice', 0)
    const secondLastPrice = get(secondLastOrder, 'tokenPrice', 0)

    return ({
      lastPrice,
      lastPriceChange: (lastPrice >= secondLastPrice ? '+' : '-'),
      series: [{ data: buildGraphData(orders) }]
    })
  }
)

const buildGraphData = (orders) => {
  orders = groupBy(orders, (o) => moment.unix(Number(o.timestamp)).startOf('hour').format())
  const hours = Object.keys(orders)

  const graphData = hours.map((hour) => {
    const group = orders[hour]
    const open = group[0] 
    const high = maxBy(group, 'tokenPrice') 
    const low = minBy(group, 'tokenPrice') 
    const close = group[group.length - 1] 

    return({
      x: new Date(hour).getTime(),
      y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
    })
  })
  return graphData
}