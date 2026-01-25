
import pkg from 'hardhat';
const { ethers } = pkg;
import { expect } from "chai";

const tokens = (n) => {
    return ethers.parseUnits(n.toString(), 'ether')
}

describe("Token", () => {
    let token, accounts, deployer, receiver;

    beforeEach(async function () {
        const Token = await ethers.getContractFactory("Token");
        token = await Token.deploy("Uniron", "URON", tokens(1000000));
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        receiver = accounts[1];
    })

    describe("Deployment", function () {
        const name = "Uniron";
        const symbol = "URON";
        const decimals = 18;
        const totalSupply = tokens(1000000);

        it("should have a name", async function () {
            expect(await token.name()).to.equal(name);
        })

        it("should have a symbol", async function () {
            expect(await token.symbol()).to.equal(symbol);
        })

        it("should have 18 decimals", async function () {
            expect(await token.decimals()).to.equal(decimals);
        })

        it("should have a total supply of 1000,000 tokens", async function () {
            expect(await token.totalSupply()).to.equal(totalSupply);
        })

        it("should assign the total supply to the deployer", async function () {
            expect(await token.balanceOf(deployer.address)).to.equal(totalSupply);
        })
    })


    describe("Sending Tokens", function () {

        describe("Success", function () {
            let amount, transaction, result;

            this.beforeEach(async function () {
                
                amount = tokens(100);
                transaction = await token.connect(deployer).transfer(receiver.address, amount);
                result = await transaction.wait();

            })

            it("should transfer tokens between accounts", async function () {

                expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900));
                expect(await token.balanceOf(receiver.address)).to.equal(amount);
            })

            it("emits a Transfer event", async function () {
                await expect(transaction).to.emit(token, "Transfer").withArgs(deployer.address, receiver.address, amount);
            })
        })

        describe("Failure", function () {
            it("rejects insufficient balances", async function () {
                const invalidAmount = tokens(100000000);
                await expect(token.connect(deployer).transfer(receiver.address, invalidAmount)).to.be.reverted;
            })

            it("rejects invalid recipient", async function () {
                const amount = tokens(100);
                await expect(token.connect(deployer).transfer("0x0000000000000000000000000000000000000000", amount)).to.be.reverted;
            })
        })
    })



    describe("Approving Tokens", function () {
        let amount, transaction, result;

        beforeEach(async function () {
            amount = tokens(100);
            transaction = await token.connect(deployer).approve(receiver.address, amount);
            result = await transaction.wait();
        })

        describe("Success", function () {
            it("allocates an allowance for delegated token spending", async function () {
                expect(await token.allowance(deployer.address, receiver.address)).to.equal(amount);
            })

            it("emits an Approval event", async function () {
                await expect(transaction).to.emit(token, "Approval").withArgs(deployer.address, receiver.address, amount);
            })
        })

        describe("Failure", function () {
            it("rejects invalid spenders", async function () {
                await expect(token.connect(deployer).approve("0x0000000000000000000000000000000000000000", amount)).to.be.reverted;
            })
        })
    })
})