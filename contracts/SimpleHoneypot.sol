// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SimpleHoneypot {
    address public immutable owner;
    uint256 public totalDeposited;
    uint256 public attackCount;
    uint256 public reentryCount;

    mapping(address => uint256) private balances;
    bool private inWithdraw;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event WithdrawalFailed(address indexed account, uint256 amount);
    event ReentryAttempted(address indexed account, uint256 value);
    event AttackDetected(address indexed account, uint256 attemptedAmount);
    event Swept(address indexed to, uint256 amount);

    error NotOwner();
    error TransferFailed();
    error InsufficientBalance();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() payable {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        uint256 balance = balances[msg.sender];
        if (balance < amount) revert InsufficientBalance();

        balances[msg.sender] = balance - amount;
        inWithdraw = true;
        (bool success, ) = msg.sender.call{value: amount}("");
        inWithdraw = false;

        if (!success) {
            balances[msg.sender] += amount;
            attackCount += 1;
            emit AttackDetected(msg.sender, amount);
            return;
        }
        emit Withdrawn(msg.sender, amount);
    }

    receive() external payable {
        if (inWithdraw) {
            reentryCount += 1;
            emit ReentryAttempted(msg.sender, msg.value);
        }
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function sweep(address payable to) external onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Swept(to, amount);
    }
}
