const { expect } = require("chai");

const hre = require("hardhat");
const ethers = hre.ethers;

const {
  performDeposit,
  approveTokens,
  convertToBigNumber,
} = require("./helperFunctions");

describe("TimeLock", function () {
  before(async function () {
    this.timeLock = await ethers.getContractFactory("TimeLock");
    this.mockErc20 = await ethers.getContractFactory("ERC20Mock");

    this.mockErc20Supply = convertToBigNumber(100000);
    this.signers = await ethers.getSigners();

    // signer to perform transaction for tests
    this.alice = this.signers[0];
    this.bob = this.signers[1];
    this.carol = this.signers[2];
    
    this.addressZero = "0x0000000000000000000000000000000000000000";
    // deposit params that will entertain deposit function in TimeLock Contract
    this.depositParams = {
      receipent: this.bob.address,
      tokenAddress: this.addressZero,
      amount: convertToBigNumber(0),
      expiry: 3600,
    };
  });

  // run before each test to deploy timeLock Contract
  beforeEach(async function () {
    this.timeLockInstance = await this.timeLock.deploy();
    this.mockErc20Instance = await this.mockErc20.deploy(
      "ERC20Token",
      "ERC20",
      this.mockErc20Supply
    );

    await this.timeLockInstance.deployed();

    await this.mockErc20Instance.deployed();

    // adding mock tokens as enabled currency

    await this.timeLockInstance.enableToken(
      this.mockErc20Instance.address
    );
  });

  it("It Should Deposit Native Tokens", async function () {
    // override default amount from 0 to 1
    this.depositParams.amount = convertToBigNumber("1.0");

    // making first deposit for alice using deposit function of TimeLock Contract
    const firstDeposit = await performDeposit(
      this.timeLockInstance,
      this.alice,
      this.depositParams,
      true
    );

    // override default { receipent } and { amount } for carol
    this.depositParams.receipent = this.carol.address;
    this.depositParams.amount = convertToBigNumber("3.0");

    // making second deposit for carol using deposit function of TimeLock Contract
    const secondDeposit = await performDeposit(
      this.timeLockInstance,
      this.alice,
      this.depositParams,
      true
    );

    // fetching claimable info for bob
    const bobClaimInfo = await this.timeLockInstance.claimableInfo(
      this.bob.address,
      0
    );

    // fetching claimable infor for carol
    const carolClaimInfo = await this.timeLockInstance.claimableInfo(
      this.carol.address,
      0
    );

    const contractBalance = await ethers.provider.getBalance(
      this.timeLockInstance.address
    );
    // comparing bob and carol claim info with deposit info for test case criteria
    expect(firstDeposit.value).to.equal(bobClaimInfo.amount);
    expect(secondDeposit.value.toString()).to.equal(carolClaimInfo.amount);

    // comparing contract balance with cliamable sum of { bob } and { carol }
    expect(contractBalance).to.equal(convertToBigNumber(4));
  });

  it("It Should Deposit ERC20 Tokens", async function () {
    // transfering erc20 tokens to alice address so that alice can approve tokens to be deposited for bob
    await this.mockErc20Instance.transfer(
      this.alice.address,
      convertToBigNumber(1)
    );

    // approving tokens to contract tobe able to transferred
    await approveTokens(
      this.mockErc20Instance,
      this.alice,
      this.timeLockInstance.address,
      convertToBigNumber(1)
    );

    // override default deposit params to make token deposit
    this.depositParams.amount = convertToBigNumber(1);
    this.depositParams.tokenAddress = this.mockErc20Instance.address;
    this.depositParams.isNative = false;

    // making first deposit for {erc20tokens} for alice using deposit function of TimeLock Contract
    await performDeposit(
      this.timeLockInstance,
      this.alice,
      this.depositParams,
      this.depositParams.isNative // setting
    );

    // fetching token balance of contract
    const balanceOfContract = await this.mockErc20Instance.balanceOf(
      this.timeLockInstance.address
    );

    // comparing deposited token amount with contract balance for test case criteria
    expect(this.depositParams.amount).to.equal(balanceOfContract);
  });

  it("It Should Claim Native Tokens", async function () {
    // override deposit Params
    this.depositParams.amount = convertToBigNumber(1);
    this.depositParams.expiry = 0
    this.depositParams.receipent = this.bob.address
    this.depositParams.tokenAddress = this.addressZero
    this.depositParams.isNative = true


    // making first deposit for alice using deposit function of TimeLock Contract
    await performDeposit(
      this.timeLockInstance,
      this.alice,
      this.depositParams,
      true
    );
    
    // Fetching Native Tokens balance for timeLock contract after deposit
    const contractBalanceAfterDeposit = await ethers.provider.getBalance(this.timeLockInstance.address)

    // Claiming Native Tokens for bob
    await this.timeLockInstance.connect(this.bob).claim();

    // Fetching Native Tokens balance for timeLock contract after claim
    const contractBalanceAfterClaim = await ethers.provider.getBalance(this.timeLockInstance.address)
    
    // comparing contract balance before deposit and after claim for test case criteria
    expect(contractBalanceAfterDeposit).to.equal(convertToBigNumber(1));
    expect(contractBalanceAfterClaim).to.equal(convertToBigNumber(0));

  });

  it("It Should Claim ERC20 Tokens", async function () {

     // transfering erc20 tokens to alice address so that alice can approve tokens to be deposited for bob
     await this.mockErc20Instance.transfer(
      this.alice.address,
      convertToBigNumber(1)
    );

    // approving tokens to contract tobe able to transferred
    await approveTokens(
      this.mockErc20Instance,
      this.alice,
      this.timeLockInstance.address,
      convertToBigNumber(1)
    );

    // overriding deposit Params
    this.depositParams.amount = convertToBigNumber(1);
    this.depositParams.expiry = 0
    this.depositParams.receipent = this.carol.address
    this.depositParams.tokenAddress = this.mockErc20Instance.address
    this.depositParams.isNative = false


    // making first deposit for alice using deposit function of TimeLock Contract
    await performDeposit(
      this.timeLockInstance,
      this.alice,
      this.depositParams,
      false
    );
    
    // Fetching ERC20 Tokens balance for timeLock contract after deposit
    const contractBalanceAfterDeposit = await this.mockErc20Instance.balanceOf(this.timeLockInstance.address)

    // Claiming Native Tokens for carol
    await this.timeLockInstance.connect(this.carol).claim();

    // Fetching ERC20 Tokens balance for timeLock contract after claim
    const contractBalanceAfterClaim = await this.mockErc20Instance.balanceOf(this.timeLockInstance.address)
    
    // comparing contract balance before deposit and after claim for test case criteria
    expect(contractBalanceAfterDeposit).to.equal(convertToBigNumber(1));
    expect(contractBalanceAfterClaim).to.equal(convertToBigNumber(0));

  });
});
