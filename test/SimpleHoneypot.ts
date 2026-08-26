import { expect } from "chai";
import { ethers } from "ethers";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("SimpleHoneypot", function () {
  async function deployHoneypot() {
    const [owner, user] = await ethers.getSigners();
    const honeypot = await ethers.deployContract("SimpleHoneypot", {
      value: ethers.parseEther("1"),
    });
    return { honeypot, owner, user };
  }

  it("accepts deposits and credits balances", async function () {
    const { honeypot, user } = await deployHoneypot();
    await expect(
      honeypot.connect(user).deposit({ value: 100n }),
    )
      .to.emit(honeypot, "Deposited")
      .withArgs(user.address, 100n);
    expect(await honeypot.balanceOf(user.address)).to.equal(100n);
    expect(await honeypot.totalDeposited()).to.equal(100n);
  });

  it("pays out withdrawals for well-behaved users", async function () {
    const { honeypot, user } = await deployHoneypot();
    await honeypot.connect(user).deposit({ value: 500n });
    await expect(honeypot.connect(user).withdraw(200n))
      .to.emit(honeypot, "Withdrawn")
      .withArgs(user.address, 200n);
    expect(await honeypot.balanceOf(user.address)).to.equal(300n);
  });

  it("reverts on overdraw", async function () {
    const { honeypot, user } = await deployHoneypot();
    await expect(
      honeypot.connect(user).withdraw(1n),
    ).to.be.revertedWithCustomError(honeypot, "InsufficientBalance");
  });

  it("neutralizes a reentrant attack and records it", async function () {
    const { honeypot, user } = await deployHoneypot();
    const vaultBefore = await ethers.provider.getBalance(
      await honeypot.getAddress(),
    );

    const attacker = await ethers.deployContract("ReentrancyAttacker", [
      await honeypot.getAddress(),
    ]);
    await attacker.connect(user).attack({ value: 100n });

    expect(await ethers.provider.getBalance(await honeypot.getAddress())).to.equal(
      vaultBefore + 100n,
    );
    expect(await honeypot.attackCount()).to.equal(1n);
    expect(await honeypot.balanceOf(await attacker.getAddress())).to.equal(100n);
  });

  it("restricts sweep to the owner", async function () {
    const { honeypot, user } = await deployHoneypot();
    await expect(
      honeypot.connect(user).sweep(user.address),
    ).to.be.revertedWithCustomError(honeypot, "NotOwner");
  });
});
