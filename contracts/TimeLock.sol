// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./EIP712MetaTransaction.sol";


contract TimeLock is EIP712MetaTransaction("MetaTrx", "1") {
    using SafeERC20 for IERC20;
    
    struct ClaimableInfo {
        address depositor; // address of depositor
        address tokenAddress; // address of token that can be claimed
        uint256 amount; // total token user has deposited.
        uint256 expiry; // deposit expiry
    }

    // address of funds claimer with all the claimable Tokens
    mapping(address => ClaimableInfo[]) public claimableInfo;

    
    // maintain approved currencies to be deposited
    mapping(address => bool) private approvedCurrency;

    /**
    { receipent } address of receipent who can claim
    { tokenAddress } token { receipent } is going to receive
    { amount } tokens { receipent } is going to receive
    { expiry } claim won't be of use after expiry
      */

    function deposit(address receipent, address tokenAddress, uint256 amount, uint256 expiry) external payable {

        address sender = msgSender();

        if (tokenAddress != address(0))
        {
            require(
                this.isTokenApproved(tokenAddress),
                "TimeLock: currency not approved by admin"
            );
        }

        ClaimableInfo memory claimInstance = ClaimableInfo(
              sender,
              tokenAddress,
              amount,
              block.timestamp + expiry
          );
        claimableInfo[receipent].push(claimInstance);
        handleIncomingDeposit(amount, tokenAddress);
    }

    // it will let users to claim native or erc20 tokens
    function claim() external{
        address sender = msgSender();
        // fetch total count of claimables again user
        uint256 claimablesLength = claimableInfo[sender].length;
        require(claimablesLength !=0, "TimeLock: You dont have anything to claim");

        for (uint256 index = 0; index < claimablesLength; index++) {
            ClaimableInfo storage claimInstance = claimableInfo[sender][index];

            // checking whether the claim is eligible or not
            if (  block.timestamp > claimInstance.expiry ){
                // handling eligible claims
                handleClaims(sender, claimInstance.amount, claimInstance.tokenAddress);
                delete claimableInfo[sender][index];
            }
        }

    }

    
    function handleClaims(address to, uint256 amount, address currency) internal {
        // If the auction is in ETH, unwrap it from its underlying WETH and try to send it to the recipient.
        if(currency == address(0)) {
            (bool sent,) = address(to).call{value: amount}("");
             require(sent, "TimeLock: Failed to send Ether");
        } else {
            IERC20(currency).safeTransfer(to, amount);
        }
    }
    
    /**
     * Given an amount and a currency, transfer the currency to this contract.
     * If the currency is ETH (0x0), attempt to wrap the amount as WETH
     */
    function handleIncomingDeposit(uint256 amount, address currency) internal {
        // If this is an ETH bid, ensure they sent enough and convert it to WETH under the hood
        if(currency == address(0)) {
            require(msg.value == amount, "TimeLock: Sent ETH Value does not match function parameter");
             (bool sent,) = address(this).call{value: msg.value}("");
             require(sent, "TimeLock: Failed to receive Ether");
        } else {
            // We must check the balance that was actually transferred,
            // as some tokens impose a transfer fee and would not actually transfer the
            // full amount, resulting in potentally locked funds
            IERC20 token = IERC20(currency);
            uint256 beforeBalance = token.balanceOf(address(this));
            token.safeTransferFrom(msg.sender, address(this), amount);
            uint256 afterBalance = token.balanceOf(address(this));
            require(beforeBalance + amount == afterBalance, "TimeLock: Token transfer call did not transfer expected amount");
        }
    }

    // enable/disable currencies that can be deposited in contract
    // function is not restricted to owner only to let anyone enable any token 
    function enableToken(address _tokenAddress)
        external
        returns (bool)
    {
        require(_tokenAddress != address(0), "TimeLock: Invalid Token Address!");
        require(
            !this.isTokenApproved(_tokenAddress),
            "TimeLock: Token Already Configured!"
        );

        approvedCurrency[_tokenAddress] = true;
        return true;
    }

    // check either token is in approve list or not
    function isTokenApproved(address _tokenAddress)
        external
        view
        returns (bool)
    {
        return approvedCurrency[_tokenAddress];
    }
    receive() external payable {}
    fallback() external payable {}
}