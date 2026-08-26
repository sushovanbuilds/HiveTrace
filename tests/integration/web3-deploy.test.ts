import { expect, it, describe } from "vitest";

const RPC = process.env.HARDHAT_RPC_URL ?? "http://127.0.0.1:8545";

async function localNodeReachable(): Promise<boolean> {
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

describe("web3 deploy service", () => {
  it(
    "deploys SimpleHoneypot to the local node and returns its address",
    async (ctx) => {
      if (!(await localNodeReachable())) {
        return ctx.skip();
      }

      const { deployContract } = await import("@/lib/web3/deploy");
      const result = await deployContract("SimpleHoneypot");

      expect(result.contractName).toBe("SimpleHoneypot");
      expect(result.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(result.deployer).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(result.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);

      const { JsonRpcProvider } = await import("ethers");
      const code = await new JsonRpcProvider(RPC).getCode(result.address);
      expect(code.length).toBeGreaterThan(2);
    },
    20_000,
  );

  it(
    "deploys with constructor args",
    async (ctx) => {
      if (!(await localNodeReachable())) {
        return ctx.skip();
      }

      const { deployContract } = await import("@/lib/web3/deploy");
      const result = await deployContract("ReentrancyAttacker", {
        constructorArgs: ["0x0000000000000000000000000000000000000001"],
      });
      expect(result.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    },
    20_000,
  );
});
