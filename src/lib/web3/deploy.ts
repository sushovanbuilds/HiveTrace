import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  type InterfaceAbi,
} from "ethers";

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
export const DEFAULT_LOCAL_RPC = "http://127.0.0.1:8545";

// Well-known Hardhat/Anvil development account #0. Public test-fixture data.
// Only ever used automatically when the RPC target is a local loopback host.
const LOCAL_DEV_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export interface ContractArtifact {
  abi: readonly unknown[];
  bytecode: string;
}

export interface DeployOptions {
  rpcUrl?: string;
  privateKey?: string;
  constructorArgs?: unknown[];
  artifactsDir?: string;
}

export interface DeploymentResult {
  contractName: string;
  address: string;
  txHash: string;
  deployer: string;
}

export function isLocalRpc(rpcUrl: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(rpcUrl).hostname);
  } catch {
    return false;
  }
}

async function loadArtifact(
  contractName: string,
  artifactsDir: string,
): Promise<ContractArtifact> {
  const artifactPath = path.join(
    artifactsDir,
    "contracts",
    `${contractName}.sol`,
    `${contractName}.json`,
  );
  let raw: string;
  try {
    raw = await readFile(artifactPath, "utf8");
  } catch {
    throw new Error(
      `Artifact for "${contractName}" not found at ${artifactPath}. Run \`npx hardhat compile\` first.`,
    );
  }
  const parsed = JSON.parse(raw) as Partial<ContractArtifact>;
  if (!Array.isArray(parsed.abi) || typeof parsed.bytecode !== "string") {
    throw new Error(`Artifact at ${artifactPath} is missing abi/bytecode.`);
  }
  return parsed as ContractArtifact;
}

function resolveDeployerKey(rpcUrl: string, explicit?: string): string {
  const key = explicit ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (key) return key;
  if (isLocalRpc(rpcUrl)) return LOCAL_DEV_PRIVATE_KEY;
  throw new Error(
    "DEPLOYER_PRIVATE_KEY is required to deploy to a non-local RPC endpoint.",
  );
}

export async function deployContract(
  contractName: string,
  options: DeployOptions = {},
): Promise<DeploymentResult> {
  const rpcUrl =
    options.rpcUrl ?? process.env.HARDHAT_RPC_URL ?? DEFAULT_LOCAL_RPC;
  const artifactsDir =
    options.artifactsDir ??
    process.env.CONTRACTS_ARTIFACTS_DIR ??
    path.resolve("artifacts");

  const wallet = new Wallet(
    resolveDeployerKey(rpcUrl, options.privateKey),
    new JsonRpcProvider(rpcUrl),
  );
  const artifact = await loadArtifact(contractName, artifactsDir);
  const factory = new ContractFactory(
    artifact.abi as InterfaceAbi,
    artifact.bytecode,
    wallet,
  );

  const contract = await factory.deploy(...(options.constructorArgs ?? []));
  await contract.waitForDeployment();

  const deploymentTx = contract.deploymentTransaction();
  return {
    contractName,
    address: await contract.getAddress(),
    txHash: deploymentTx?.hash ?? "",
    deployer: wallet.address,
  };
}
