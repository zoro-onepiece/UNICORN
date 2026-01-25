import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SeedExchangeModule = buildModule("SeedExchangeModule", (m) => {
  // Get contract instances from previous deployments
  const dappToken = m.getContract("DappToken");
  const methToken = m.getContract("METHToken");
  const mdaiToken = m.getContract("MDAIToken");
  const exchange = m.getContract("Exchange");

  // Get accounts
  const [deployer, user1, user2] = m.getAccounts(3);

  // Helper to convert to token units
  const tokens = (amount) => {
    return m.ethers.parseUnits(amount.toString(), "ether");
  };

  // Step 1: Transfer mETH from deployer to user1
  const transferTx1 = m.call(methToken, "transfer", [user1, tokens(10000)], {
    id: "Transfer1",
    from: deployer
  });

  // Step 2: User1 approves DAPP tokens for exchange
  const approveTx1 = m.call(dappToken, "approve", [exchange, tokens(10000)], {
    id: "Approve1",
    from: user1,
    after: [transferTx1]
  });

  // Step 3: User1 deposits DAPP to exchange
  const depositTx1 = m.call(exchange, "depositToken", [dappToken, tokens(10000)], {
    id: "Deposit1",
    from: user1,
    after: [approveTx1]
  });

  // Step 4: User2 approves mETH for exchange
  const approveTx2 = m.call(methToken, "approve", [exchange, tokens(10000)], {
    id: "Approve2",
    from: user2
  });

  // Step 5: User2 deposits mETH to exchange
  const depositTx2 = m.call(exchange, "depositToken", [methToken, tokens(10000)], {
    id: "Deposit2",
    from: user2,
    after: [approveTx2]
  });

  // Step 6: Create cancelled order
  const createOrder1 = m.call(exchange, "createOrder", [methToken, tokens(100), dappToken, tokens(5)], {
    id: "CreateOrder1",
    from: user1,
    after: [depositTx1, depositTx2]
  });

  // Step 7: Cancel the order
  const cancelOrder1 = m.call(exchange, "cancelOrder", [1], {
    id: "CancelOrder1",
    from: user1,
    after: [createOrder1]
  });

  // Step 8-10: Create and fill orders
  const createOrder2 = m.call(exchange, "createOrder", [methToken, tokens(100), dappToken, tokens(10)], {
    id: "CreateOrder2",
    from: user1,
    after: [cancelOrder1]
  });

  const fillOrder2 = m.call(exchange, "fillOrder", [2], {
    id: "FillOrder2",
    from: user2,
    after: [createOrder2]
  });

  const createOrder3 = m.call(exchange, "createOrder", [methToken, tokens(50), dappToken, tokens(15)], {
    id: "CreateOrder3",
    from: user1,
    after: [fillOrder2]
  });

  const fillOrder3 = m.call(exchange, "fillOrder", [3], {
    id: "FillOrder3",
    from: user2,
    after: [createOrder3]
  });

  // Step 11-12: Create open orders (reduced for example)
  const createOrder4 = m.call(exchange, "createOrder", [methToken, tokens(10), dappToken, tokens(10)], {
    id: "CreateOrder4",
    from: user1,
    after: [fillOrder3]
  });

  const createOrder5 = m.call(exchange, "createOrder", [dappToken, tokens(10), methToken, tokens(10)], {
    id: "CreateOrder5",
    from: user2,
    after: [createOrder4]
  });

  return {
    dappToken,
    methToken,
    mdaiToken,
    exchange,
    transfers: [transferTx1],
    approvals: [approveTx1, approveTx2],
    deposits: [depositTx1, depositTx2],
    orders: [createOrder1, createOrder2, createOrder3, createOrder4, createOrder5]
  };
});

export default SeedExchangeModule;