import hre from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";

// Helper functions
const tokens = (n) => {
  return hre.ethers.parseUnits(n.toString(), 'ether');
};

const wait = (seconds) => {
  const milliseconds = seconds * 1000;
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

async function main() {
  console.log("🌱 Seeding exchange with test data...\n");

  // Fetch accounts from wallet
  const accounts = await hre.ethers.getSigners();
  console.log(`Found ${accounts.length} accounts\n`);

  // Fetch network
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log("Using chainId:", chainId);

  // Import deployed addresses from Ignition
  // CORRECT: Use fs.readFileSync
  const deploymentPath = join(process.cwd(), `ignition/deployments/chain-${chainId}/deployed_addresses.json`);
  const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
  
  // Get contract addresses from deployment
  const URON_ADDRESS = deployment["ExchangeModule#uron"];
  const METH_ADDRESS = deployment["ExchangeModule#meth"];
  const MDAI_ADDRESS = deployment["ExchangeModule#mdai"];
  const EXCHANGE_ADDRESS = deployment["ExchangeModule#exchange"];

  console.log("Contract addresses:");
  console.log(`URON Token: ${URON_ADDRESS}`);
  console.log(`mETH Token: ${METH_ADDRESS}`);
  console.log(`mDAI Token: ${MDAI_ADDRESS}`);
  console.log(`Exchange:   ${EXCHANGE_ADDRESS}\n`);

  // Fetch deployed contracts
  const URON = await hre.ethers.getContractAt('Token', URON_ADDRESS);
  const mETH = await hre.ethers.getContractAt('Token', METH_ADDRESS);
  const mDAI = await hre.ethers.getContractAt('Token', MDAI_ADDRESS);
  const exchange = await hre.ethers.getContractAt('Exchange', EXCHANGE_ADDRESS);

  // Give tokens to account[1]
  const sender = accounts[0];
  const receiver = accounts[1];
  let amount = tokens(10000);

  console.log("📤 Transferring tokens between accounts...");
  
  // Transfer mETH from account0 to account1
  let transaction = await mETH.connect(sender).transfer(receiver.address, amount);
  await transaction.wait();
  console.log(`✓ Transferred ${hre.ethers.formatEther(amount)} mETH from ${sender.address} to ${receiver.address}`);

  // Set up exchange users
  const user1 = accounts[0];
  const user2 = accounts[1];
  amount = tokens(10000);

  console.log("\n💰 Setting up deposits on exchange...");
  
  transaction = await URON.connect(user1).approve(EXCHANGE_ADDRESS, amount);
  await transaction.wait();
  console.log(`✓ Approved ${hre.ethers.formatEther(amount)} URON tokens from ${user1.address}`);

  transaction = await exchange.connect(user1).depositToken(URON_ADDRESS, amount);
  await transaction.wait();
  console.log(`✓ Deposited ${hre.ethers.formatEther(amount)} URON from ${user1.address}`);

  // User2 approves and deposits mETH
  transaction = await mETH.connect(user2).approve(EXCHANGE_ADDRESS, amount);
  await transaction.wait();
  console.log(`✓ Approved ${hre.ethers.formatEther(amount)} mETH tokens from ${user2.address}`);

  transaction = await exchange.connect(user2).depositToken(METH_ADDRESS, amount);
  await transaction.wait();
  console.log(`✓ Deposited ${hre.ethers.formatEther(amount)} mETH from ${user2.address}`);

  console.log("\n🔄 Creating and filling orders...");

  // Get initial order count
  let currentOrderId = Number(await exchange.orderCount()) + 1;

  // Seed a Cancelled Order
  console.log("\n❌ Creating and cancelling an order...");
  transaction = await exchange.connect(user1).createOrder(METH_ADDRESS, tokens(100), URON_ADDRESS, tokens(5));
  await transaction.wait();
  console.log(`✓ Created order ${currentOrderId} from ${user1.address}`);

  transaction = await exchange.connect(user1).cancelOrder(currentOrderId);
  await transaction.wait();
  console.log(`✓ Cancelled order ${currentOrderId}`);
  currentOrderId++;
  
  await wait(1);

  // Seed Filled Orders
  console.log("\n✅ Creating and filling orders...");
  
  // Order 2
  transaction = await exchange.connect(user1).createOrder(METH_ADDRESS, tokens(100), URON_ADDRESS, tokens(10));
  await transaction.wait();
  console.log(`✓ Created order ${currentOrderId}`);
  
  transaction = await exchange.connect(user2).fillOrder(currentOrderId);
  await transaction.wait();
  console.log(`✓ Filled order ${currentOrderId}`);
  currentOrderId++;
  await wait(1);

  // Order 3
  transaction = await exchange.connect(user1).createOrder(METH_ADDRESS, tokens(50), URON_ADDRESS, tokens(15));
  await transaction.wait();
  console.log(`✓ Created order ${currentOrderId}`);
  
  transaction = await exchange.connect(user2).fillOrder(currentOrderId);
  await transaction.wait();
  console.log(`✓ Filled order ${currentOrderId}`);
  currentOrderId++;
  await wait(1);

  // Order 4
  transaction = await exchange.connect(user1).createOrder(METH_ADDRESS, tokens(200), URON_ADDRESS, tokens(20));
  await transaction.wait();
  console.log(`✓ Created order ${currentOrderId}`);
  
  transaction = await exchange.connect(user2).fillOrder(currentOrderId);
  await transaction.wait();
  console.log(`✓ Filled order ${currentOrderId}`);
  currentOrderId++;
  await wait(1);

  console.log("\n📊 Creating open orders...");

  // User1 makes buy orders
  console.log("\n📈 User1 creating 3 buy orders...");
  for(let i = 1; i <= 3; i++) {
    transaction = await exchange.connect(user1).createOrder(METH_ADDRESS, tokens(10 * i), URON_ADDRESS, tokens(10));
    await transaction.wait();
    console.log(`✓ Created buy order ${currentOrderId} (${i} of 3)`);
    currentOrderId++;
    await wait(0.5);
  }

  // User2 makes sell orders
  console.log("\n📉 User2 creating 3 sell orders...");
  for (let i = 1; i <= 3; i++) {
    transaction = await exchange.connect(user2).createOrder(URON_ADDRESS, tokens(10), METH_ADDRESS, tokens(10 * i));
    await transaction.wait();
    console.log(`✓ Created sell order ${currentOrderId} (${i} of 3)`);
    currentOrderId++;
    await wait(0.5);
  }

  console.log("\n🎉 Exchange seeded successfully!");
  
  // Final stats
  const finalOrderCount = await exchange.orderCount();
  console.log(`📊 Total orders created: ${finalOrderCount}`);
  
  console.log("\n💰 Exchange feeAccount:", await exchange.feeAccount());
  console.log(`📈 Fee percent: ${await exchange.feePercent()}%`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error seeding exchange:", error);
    process.exit(1);
  });