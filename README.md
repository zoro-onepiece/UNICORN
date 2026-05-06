# Unicorn Exchange 🦄 | Decentralized Order Book DEX

Unicorn Exchange is a fully decentralized, Central Limit Order Book (CLOB) exchange built entirely on-chain. 

Unlike standard Automated Market Makers (AMMs) that rely on passive liquidity pools and mathematical formulas to dictate price, this protocol features a true matching engine. Users can act as Market Makers by setting specific limit orders, or Market Takers by filling existing orders directly from the book. 

## 🛠️ Tech Stack
* **Smart Contracts:** Solidity, Hardhat, Ethers.js (v6)
* **Frontend:** React.js, Redux (State Management)
* **Blockchain Network:** Ethereum Sepolia Testnet
* **Real-time Sync:** WebSockets for instantaneous UI updates (Order Book, Trades, Candlestick Charts) without page refreshes.

## 📜 Smart Contract Addresses (Sepolia Testnet)
 🦄 URON Address: 0x9acd0ba3815299Fac2c4238444A1F55B580ee5C8

💠 mETH Address: 0x1893fab1aa23bF9e54AaadD8F2916c0a62C1bB6a

💵 mDAI Address: 0xB3ED9F3BEf4008743f273f26C41cEBE7e001b990

---

## 🧪 How to Test the Live Demo

To test the exchange, you will need to connect a MetaMask wallet on the Sepolia Testnet and acquire some test tokens. Follow these steps:

### Step 1: Switch to Sepolia Testnet
1. Open your MetaMask extension.
2. Click the network dropdown at the top.
3. Toggle "Show test networks" to ON.
4. Select **Sepolia**.

### Step 2: Get Sepolia ETH (Gas)
You will need a small amount of Sepolia ETH to pay for transaction gas fees. 
* You can claim free Sepolia ETH from the [Alchemy Sepolia Faucet](https://sepoliafaucet.com/).

### Step 3: Import Test Tokens ($URON & $mETH)
To trade, you need the test tokens I deployed for this exchange. *If you need test tokens, feel free to reach out to me on LinkedIn with your public address, and I will transfer you 1000 URON and 1000 mETH!*

Once you have the tokens, make them visible in MetaMask:
1. Open MetaMask and go to the **Tokens** tab.
2. Scroll down and click **Import tokens**.
3. Paste the **URON Token Address** (listed above) and click Next.
4. Repeat the process for the **mETH Token Address**.

### Step 4: Deposit and Trade
1. Visit the https://unicorn-self-kappa.vercel.app/
2. Click **Connect** in the top right to link your MetaMask wallet.
3. Go to the **Balance** tab on the left.
4. **Deposit** your URON and mETH into the Exchange contract (This requires two MetaMask approvals: one to approve the token spend, and one to deposit).
5. Once deposited, use the **New Order** section to place Buy or Sell limit orders, or click on any existing order in the **Order Book** to fill it!

---

## 💻 Local Development Setup

If you want to run this project locally on your machine:

1. Clone the repository:
   ```bash
   git clone [Insert your repository link here]
