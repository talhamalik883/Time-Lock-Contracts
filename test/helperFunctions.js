const hre = require("hardhat");
const ethers = hre.ethers;

/**
 *
 * @param {*} contractInstance represents timeLockContract
 * @param {*} signer  depositer address
 * @param {*} params  i.e receipent, tokenAddress, amount ,expiry
 * @param {*} isNative true if user is sending ETH, false for token transaction
 * @returns
 */

async function performDeposit(contractInstance, signer, params, isNative) {
  const depositTrx = await contractInstance
    .connect(signer)
    .deposit(
      params.receipent,
      params.tokenAddress,
      params.amount,
      params.expiry,
      { value: isNative ? params.amount : 0 }
    );
  return depositTrx;
}
/**
 *
 * @param {*} val to be converted to bigNumber
 * @returns
 */
function convertToBigNumber(val) {
  return ethers.utils.parseEther(val.toString()).toString();
}
/**
 *
 * @param {*} val to be converted from bigNumber
 * @returns
 */
function convertFromBigNumber(val) {
  return ethers.utils.formatEther(val.toString()).toString();
}

/**
 *
 * @param {*} contract
 * @param {*} from
 * @param {*} to
 * @param {*} amount
 */
async function approveTokens(contract, from, to, amount) {
  await contract.connect(from).approve(to, amount);
}

module.exports = {
  performDeposit,
  approveTokens,
  convertToBigNumber,
  convertFromBigNumber,
};
