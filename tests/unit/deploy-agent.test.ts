import { beforeEach, describe, expect, it, vi } from "vitest";

const FAKE_DEPLOY = vi.fn(async (name: string) => ({
  contractName: name,
  address: "0xdeployed0000000000000000000000000000000001",
  txHash: "0xdeploytx",
  deployer: "0xdeployer",
}));

beforeEach(() => {
  FAKE_DEPLOY.mockClear();
});

describe("deploy agent", () => {
  it("rejects mainnet deployment without approval", async () => {
    const { deployAgent, DeploymentRejectedError } = await import(
      "@/agents/deployAgent"
    );
    const prev = process.env.MAINNET_DEPLOY_APPROVED;
    delete process.env.MAINNET_DEPLOY_APPROVED;
    try {
      await expect(
        deployAgent({ network: "mainnet", deployImpl: FAKE_DEPLOY }),
      ).rejects.toBeInstanceOf(DeploymentRejectedError);
      expect(FAKE_DEPLOY).not.toHaveBeenCalled();
    } finally {
      if (prev !== undefined) process.env.MAINNET_DEPLOY_APPROVED = prev;
    }
  });

  it("rejects testnet deployment without approval", async () => {
    const { deployAgent, DeploymentRejectedError } = await import(
      "@/agents/deployAgent"
    );
    const prev = process.env.MAINNET_DEPLOY_APPROVED;
    delete process.env.MAINNET_DEPLOY_APPROVED;
    try {
      await expect(
        deployAgent({ network: "testnet", deployImpl: FAKE_DEPLOY }),
      ).rejects.toBeInstanceOf(DeploymentRejectedError);
    } finally {
      if (prev !== undefined) process.env.MAINNET_DEPLOY_APPROVED = prev;
    }
  });

  it("allows local deployment and returns the result", async () => {
    const { deployAgent } = await import("@/agents/deployAgent");
    const out = await deployAgent({
      network: "local",
      type: "Reentrancy",
      deployImpl: FAKE_DEPLOY,
    });
    expect(FAKE_DEPLOY).toHaveBeenCalledOnce();
    expect(out.network).toBe("local");
    expect(out.contractName).toBe("SimpleHoneypot");
    expect(out.address).toMatch(/^0x/);
  });

  it("allows non-local deployment when approved via flag", async () => {
    const { deployAgent } = await import("@/agents/deployAgent");
    const out = await deployAgent({
      network: "testnet",
      approved: true,
      deployImpl: FAKE_DEPLOY,
    });
    expect(FAKE_DEPLOY).toHaveBeenCalledOnce();
    expect(out.network).toBe("testnet");
  });

  it("uses an injected model to choose a catalog template", async () => {
    const { deployAgent } = await import("@/agents/deployAgent");
    FAKE_DEPLOY.mockClear();
    const model = {
      invoke: vi.fn(async () => ({
        content: JSON.stringify({
          contractName: "SimpleHoneypot",
          rationale: "matches reentrancy bait",
        }),
      })),
    };
    const out = await deployAgent({
      network: "local",
      type: "Reentrancy",
      model,
      deployImpl: FAKE_DEPLOY,
    });
    expect(model.invoke).toHaveBeenCalledOnce();
    expect(out.contractName).toBe("SimpleHoneypot");
  });
});
