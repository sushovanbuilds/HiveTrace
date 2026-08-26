import { describe, expect, it } from "vitest";

describe("web3 deploy service guards", () => {
  it("classifies local vs remote RPC endpoints", async () => {
    const { isLocalRpc } = await import("@/lib/web3/deploy");
    expect(isLocalRpc("http://127.0.0.1:8545")).toBe(true);
    expect(isLocalRpc("http://localhost:8545")).toBe(true);
    expect(isLocalRpc("http://10.0.0.5:8545")).toBe(false);
    expect(isLocalRpc("https://sepolia.example-rpc.dev/v2/key")).toBe(false);
    expect(isLocalRpc("not-a-url")).toBe(false);
  });

  it("refuses remote deployment without an explicit private key", async () => {
    const prev = process.env.DEPLOYER_PRIVATE_KEY;
    delete process.env.DEPLOYER_PRIVATE_KEY;
    try {
      const { deployContract } = await import("@/lib/web3/deploy");
      await expect(
        deployContract("SimpleHoneypot", {
          rpcUrl: "https://sepolia.example-rpc.dev",
        }),
      ).rejects.toThrow(/DEPLOYER_PRIVATE_KEY/);
    } finally {
      if (prev !== undefined) process.env.DEPLOYER_PRIVATE_KEY = prev;
    }
  });
});
