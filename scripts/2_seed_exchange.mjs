import hre from "hardhat";

async function main() {
  const accounts = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // --- HARDCODED ADDRESSES ---
  // This section ensures you NEVER have to run 'ignition deploy' again
  const CONFIG = {
    // Sepolia Network
    11155111: {
      URON: "0x9acd0ba3815299Fac2c4238444A1F55B580ee5C8",
      mETH: "0x1893fab1aa23bF9e54AaadD8F2916c0a62C1bB6a",
      exchange: "0xa7d752d7779bCC894865FbA3F5D02FE6A70BACBe"
    },
    // Localhost Network (Hardhat Node)
    31337: {
      URON: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      mETH: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      exchange: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    }
  };

  const addresses = CONFIG[chainId];
  if (!addresses) {
    throw new Error(`Chain ID ${chainId} not supported in script!`);
  }

  console.log(`🌱 Seeding Exchange on network: ${chainId}`);
  console.log(`Using Exchange at: ${addresses.exchange}\n`);

  // Initialize Contracts
  const URON = await hre.ethers.getContractAt('Token', addresses.URON);
  const mETH = await hre.ethers.getContractAt('Token', addresses.mETH);
  const exchange = await hre.ethers.getContractAt('Exchange', addresses.exchange);

  const [user1, user2] = accounts;
  const amount = hre.ethers.parseUnits("10000", "ether");

  // 1. Setup Balances (Transfer & Deposit)
  console.log("💰 Depositing tokens...");
  await (await mETH.connect(user1).transfer(user2.address, amount)).wait();
  
  await (await URON.connect(user1).approve(addresses.exchange, amount)).wait();
  await (await exchange.connect(user1).depositToken(addresses.URON, amount)).wait();

  await (await mETH.connect(user2).approve(addresses.exchange, amount)).wait();
  await (await exchange.connect(user2).depositToken(addresses.mETH, amount)).wait();

  // 2. Create Volatile Trades for Candles
  console.log("📈 Generating price action...");
  
  // Array of [Amount, Price] to create a realistic chart
  const trades = [
    ["100", "0.0050"], ["80", "0.0052"], ["120", "0.0055"], 
    ["90", "0.0053"],  ["110", "0.0058"], ["70", "0.0060"],
    ["150", "0.0057"], ["100", "0.0054"], ["85", "0.0052"]
  ];

  for (let i = 0; i < trades.length; i++) {
    const [uronAmt, price] = trades[i];
    const methAmt = (Number(uronAmt) * Number(price)).toString();

    // User 1 Makes Order
    const tx1 = await exchange.connect(user1).createOrder(
        addresses.mETH, hre.ethers.parseUnits(methAmt, "ether"),
        addresses.URON, hre.ethers.parseUnits(uronAmt, "ether")
    );
    const receipt = await tx1.wait();
    
    // Get the Order ID from the logs (last argument in Order event)
    const orderId = receipt.logs[0].args[0]; 

    // User 2 Fills Order
    await (await exchange.connect(user2).fillOrder(orderId)).wait();
    console.log(`✅ Trade ${i+1}: ${uronAmt} URON @ ${price} mETH`);
  }

  console.log("\n🎉 Seeding Complete! Refresh your browser to see the chart.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});