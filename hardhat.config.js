import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ignition-ethers";
import "dotenv/config";

export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      type: "edr-simulated", // Explicitly set the type for Hardhat's built-in network
      chainId: 31337,
    },
    localhost: {
      type: "http", // Localhost connects via HTTP
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      type: "http", // Sepolia is an external HTTP network
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    }
  },
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};