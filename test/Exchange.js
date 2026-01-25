
import pkg from 'hardhat';
const { ethers } = pkg;
import { expect } from "chai";
import { timeStamp } from 'console';

const tokens = (n) => {
    return ethers.parseUnits(n.toString(), 'ether')
}

describe("Exchange", () => {

    let deployer, feeAccount, accounts, exchange, token1, user1, token2,user2;
    const feePercent = 10;

    beforeEach(async function () {
        const Exchange = await ethers.getContractFactory("Exchange");
        const Token = await ethers.getContractFactory("Token");


        accounts = await ethers.getSigners();
        deployer = accounts[0];
        feeAccount = accounts[1];
        user1 = accounts[2];
        user2 =accounts[3];
 

        token1 = await Token.deploy("Uniron", "URON", tokens(1000000));
        await token1.waitForDeployment();

        token2 = await Token.deploy("Mock ETHER", "METH", tokens(1000000));
        await token2.waitForDeployment();

        exchange = await Exchange.deploy(feeAccount.address, feePercent);
        await exchange.waitForDeployment();

        let transaction = await token1.connect(deployer).transfer(user1.address, tokens(100));
        await transaction.wait();
    })


    describe("Deployment", function () {


        it("tracks fee account", async function () {
            expect(await exchange.feeAccount()).to.equal(feeAccount.address);
        })

        it("tracks exchange fee percentage", async function () {
            expect(await exchange.feePercent()).to.equal(feePercent);
        })


    })




    describe("Depositing Tokens", function () {

        let transaction, result;
        let amount = tokens(10);

        beforeEach(async function () {
            // Approve tokens
            console.log(user1.address, await exchange.getAddress(), amount);
            transaction = await token1.connect(user1).approve(await exchange.getAddress(), amount);
            result = await transaction.wait();
            transaction = await exchange.connect(user1).depositToken(await token1.getAddress(), amount);
            result = await transaction.wait();
        })

        describe("Success", function () {
            it("tracks the token deposit", async function () {
                // Check exchange token balance
                expect(await token1.balanceOf(await exchange.getAddress())).to.equal(amount);
                expect(await exchange.tokens(await token1.getAddress(), user1.address)).to.equal(amount);
                expect(await exchange.balanceOf(await token1.getAddress(), user1.address)).to.equal(amount);
            })

            it("emits a Deposit event", async function () {
                await expect(transaction).to.emit(exchange, "Deposit").withArgs(await token1.getAddress(), user1.address, amount, amount);
            })
        })
        describe(" Failure", function () {
            it("fails when no tokens are approved", async function () {
                // Attempt to deposit tokens without approving
                await expect(exchange.connect(user1).depositToken(await token1.getAddress(), amount)).to.be.reverted;
            })
        })
    })

    describe("Withdrawing Tokens", function () {
        let transaction, result;
        let amount = tokens(10);

        beforeEach(async function () {
            // Approve tokens
            transaction = await token1.connect(user1).approve(await exchange.getAddress(), amount);
            result = await transaction.wait();
            transaction = await exchange.connect(user1).depositToken(await token1.getAddress(), amount);
            result = await transaction.wait();
        })

        describe("Success", function () {
            beforeEach(async function () {
                transaction = await exchange.connect(user1).withdrawToken(await token1.getAddress(), amount);
                result = await transaction.wait();
            })
            it("withdraws token funds", async function () {
                expect(await exchange.tokens(await token1.getAddress(), user1.address)).to.equal(0);
                expect(await token1.balanceOf(user1.address)).to.equal(tokens(100));

            })

            it("emits a Withdraw event", async function () {
                await expect(transaction).to.emit(exchange, "Withdraw").withArgs(await token1.getAddress(), user1.address, amount, 0);
            })
        })

        describe("Failure", function () {
            it("fails for insufficient balances", async function () {
                await expect(exchange.connect(user1).withdrawToken(await token1.getAddress(), tokens(1000))).to.be.reverted;
            })
        })
    })

    describe("Checking balances", function () {
        let transaction, result;
        let amount = tokens(10);

        beforeEach(async function () {
            // Approve tokens
            transaction = await token1.connect(user1).approve(await exchange.getAddress(), amount);
            result = await transaction.wait();
            transaction = await exchange.connect(user1).depositToken(await token1.getAddress(), amount);
            result = await transaction.wait();

            // 
        })

        it("returns user balance", async function () {
            expect(await exchange.balanceOf(await token1.getAddress(), user1.address)).to.equal(amount);
        })
    })


    describe("Making Orders", async function () {
        let transaction, result;
        let amount = tokens(10);

        describe("Success", function () {
            beforeEach(async function () {
                transaction = await token1.connect(user1).approve(await exchange.getAddress(), amount);
                result = await transaction.wait();
                transaction = await exchange.connect(user1).depositToken(await token1.getAddress(), amount);
                result = await transaction.wait();

                // make order 
                transaction = await exchange.connect(user1).createOrder(await token2.getAddress(), tokens(1), await token1.getAddress(), tokens(1));
                result = await transaction.wait();
            })

            it("tracks the newly created order", async function () {
                const orderCount = await exchange.orderCount();
                expect(orderCount).to.equal(1);
                const order = await exchange.orders(1);
                expect(order.id).to.equal(1);
                expect(order.user).to.equal(user1.address);
                expect(order.tokenGet).to.equal(await token2.getAddress());
                expect(order.amountGet).to.equal(tokens(1));
                expect(order.tokenGive).to.equal(await token1.getAddress());
                expect(order.amountGive).to.equal(tokens(1));
            })
        })

        describe("Failure", function () {
            it("rejects orders with insufficient token balance", async function () {
                await expect(
                    exchange.connect(user1).createOrder(await token2.getAddress(), tokens(1), await token1.getAddress(), tokens(1))
                ).to.be.reverted;
            })
        })
    })




    describe("Order Actions", async function () {
        let transaction, result;
        let amount = tokens(1);

        beforeEach(async function () {
            transaction = await token1.connect(user1).approve(await exchange.getAddress(), amount);
            result = await transaction.wait();

            transaction = await exchange.connect(user1).depositToken(await token1.getAddress(), amount);
            result = await transaction.wait();

            transaction = await token2.connect(deployer).transfer(user2.address,tokens(100));
            result = await transaction.wait();  

            transaction = await token2.connect(user2).approve(await exchange.getAddress(), tokens(2));  
            result = await transaction.wait();
            
            transaction = await exchange.connect(user2).depositToken(await token2.getAddress(), tokens(2));
            result = await transaction.wait();  

            transaction = await exchange.connect(user1).createOrder(await token2.getAddress(), tokens(1) , await token1.getAddress(), tokens(1));
            result = await transaction.wait();
        })

        describe("Cancelling Orders", async function () {  
            describe("Success", function () {
                beforeEach(async function () {
                    transaction = await exchange.connect(user1).cancelOrder(1);
                    result = await transaction.wait();
                })

                it("updates cancelled orders", async function () {
                    const isCancelled = await exchange.orderCancelled(1);
                    expect(isCancelled).to.equal(true);
                })

            })



            describe("Failure", function () {
                beforeEach(async function () {
            transaction = await token1.connect(user1).approve(await exchange.getAddress(), amount);
            result = await transaction.wait();
            transaction = await exchange.connect(user1).depositToken(await token1.getAddress(), amount);
            result = await transaction.wait();

            transaction = await exchange.connect(user1).createOrder(await token2.getAddress(), tokens(1), await token1.getAddress(), tokens(1));
            result = await transaction.wait();
                
                })

                it("rejects invalid order ids", async function () {
                    const invalidOrderId = 9999;
                    await expect(exchange.connect(user1).cancelOrder(invalidOrderId)).to.be.reverted;
                })


                it("rejects unauthorized cancellations", async function () {
                    const unauthorizedUser = accounts[3];
                    await expect(exchange.connect(unauthorizedUser).cancelOrder(1)).to.be.reverted;
                })
            })

            it("emits a Cancel event", async function () {

                const transaction = await exchange.connect(user1).cancelOrder(1);
                const result = await transaction.wait();

                // Get the block timestamp from the transaction receipt
                const block = await ethers.provider.getBlock(result.blockNumber);
                const timestamp = block.timestamp;

                await expect(transaction).to.emit(exchange, "Cancel").withArgs(1, user1.address, await token2.getAddress(), tokens(1), await token1.getAddress(), tokens(1), timestamp);
            })


        })
   


  

       
    
describe("Filling orders", async () => {
  beforeEach(async () => {
    // User1 deposits 1 token1 (to create order)
    let amount = tokens(1);
    let transaction = await token1.connect(user1).approve(exchange.getAddress(), amount);
    await transaction.wait();
    transaction = await exchange.connect(user1).depositToken(token1.getAddress(), amount);
    await transaction.wait();

    // User2 deposits 2 token2 (to fill order)
    transaction = await token2.connect(user2).approve(exchange.getAddress(), tokens(2));
    await transaction.wait();
    transaction = await exchange.connect(user2).depositToken(token2.getAddress(), tokens(2));
    await transaction.wait();

    // User1 creates order: sell 1 token1 for 1 token2
    transaction = await exchange.connect(user1).createOrder(token2.getAddress(), tokens(1), token1.getAddress(), tokens(1));
    await transaction.wait();
  });

  it("Executes the trade and charges fees", async () => {
    // User2 fills the order
    const transaction = await exchange.connect(user2).fillOrder(1);
    const result = await transaction.wait();

    // Check balances after trade:
    // User1 (order creator) should have:
    // - 0 token1 (gave away 1)
    // - 1 token2 (received 1)
    expect(await exchange.balanceOf(token1.getAddress(), user1.address)).to.equal(0);
    expect(await exchange.balanceOf(token2.getAddress(), user1.address)).to.equal(tokens(1));

    // User2 (filler) should have:
    // - 1 token1 (received 1)
    // - 0.9 token2 (gave 1 + 0.1 fee)
    expect(await exchange.balanceOf(token1.getAddress(), user2.address)).to.equal(tokens(1));
    expect(await exchange.balanceOf(token2.getAddress(), user2.address)).to.equal(tokens(0.9));

    // Fee account should have 0.1 token2
    expect(await exchange.balanceOf(token2.getAddress(), feeAccount.address)).to.equal(tokens(0.1));
  });

  it("emits a Trade event", async () => {
    // Use a wildcard for timestamp (last argument)
    await expect(exchange.connect(user2).fillOrder(1))
      .to.emit(exchange, "Trade")
      .withArgs(1, user2.address, token2.getAddress(), tokens(1), token1.getAddress(), tokens(1), user1.address, ethers.AnyNumber);
  });
});
            
     

    })    
    })
