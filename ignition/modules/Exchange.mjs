import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ExchangeModule = buildModule("ExchangeModule", (m) => {
  // Get signers/accounts
const feeAccount = m.getParameter("feeAccount", "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199");
  // Deploy tokens
  const dapp = m.contract("Token", ["Uniron", "URON", "1000000"],{
    id: "uron",
  });
  const mETH = m.contract("Token", ["mETH", "mETH", "1000000"],{
    id: "meth",
  });
  const mDAI = m.contract("Token", ["mDAI", "mDAI", "1000000"],{
    id: "mdai",
  });
  
  // Deploy exchange with fee account and 10% fee
  const exchange = m.contract("Exchange", [feeAccount, 10],{
    id: "exchange",
  });
  
  return { dapp, mETH, mDAI, exchange };
});

export default ExchangeModule;