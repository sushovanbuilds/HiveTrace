import { z } from "zod";
import { generateText, type ChatModelLike } from "@/lib/ai/provider";
import {
  deployContract,
  type DeployOptions,
  type DeploymentResult,
} from "@/lib/web3/deploy";

export type DeployTarget = "local" | "testnet" | "mainnet";

// Catalog of deployable honeypot contracts (see contracts/). Only genuine
// honeypot templates belong here — test fixtures must not.
export const TEMPLATE_CATALOG = ["SimpleHoneypot"] as const;

export interface DeployRequest {
  type?: string;
  network?: DeployTarget;
  rpcUrl?: string;
  // Explicit human approval for non-local targets.
  approved?: boolean;
  // Injectable deploy backend (defaults to the real P1.02 service).
  deployImpl?: (
    name: string,
    options: DeployOptions,
  ) => Promise<DeploymentResult>;
  // Injectable model for template selection (defaults to mapping when absent).
  model?: ChatModelLike;
}

export interface DeployResult {
  contractName: string;
  address: string;
  txHash: string;
  deployer: string;
  network: DeployTarget;
}

export class DeploymentRejectedError extends Error {}

function isLocal(network: DeployTarget): boolean {
  return network === "local";
}

function isApproved(req: DeployRequest): boolean {
  return (
    req.approved === true || process.env.MAINNET_DEPLOY_APPROVED === "true"
  );
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Model did not return JSON. Output was: ${raw.slice(0, 200)}`);
  }
  return candidate.slice(start, end + 1);
}

function fallbackTemplate(type?: string): string {
  // Single honeypot template today; the LLM may override within the catalog.
  void type;
  return TEMPLATE_CATALOG[0];
}

async function chooseTemplate(
  type: string | undefined,
  model?: ChatModelLike,
): Promise<string> {
  if (!model) return fallbackTemplate(type);

  const raw = await generateText({
    system: `You are the Honychain deployment planner. Given a requested honeypot type, choose the best matching Solidity contract name from this catalog: [${TEMPLATE_CATALOG.join(", ")}]. Respond with ONLY JSON: {"contractName": string, "rationale": string}.`,
    prompt: `Requested type: ${type ?? "(unspecified)"}`,
    model,
    temperature: 0,
  });

  try {
    const parsed = z
      .object({ contractName: z.string() })
      .parse(JSON.parse(extractJson(raw)));
    if ((TEMPLATE_CATALOG as readonly string[]).includes(parsed.contractName)) {
      return parsed.contractName;
    }
  } catch {
    // fall through to default
  }
  return fallbackTemplate(type);
}

export async function deployAgent(
  request: DeployRequest,
): Promise<DeployResult> {
  const network = request.network ?? "local";

  if (!isLocal(network) && !isApproved(request)) {
    throw new DeploymentRejectedError(
      `Deployment to "${network}" requires explicit approval ` +
        `(set MAINNET_DEPLOY_APPROVED=true or pass approved:true).`,
    );
  }

  const contractName = await chooseTemplate(request.type, request.model);
  const deploy = request.deployImpl ?? deployContract;
  const result = await deploy(contractName, { rpcUrl: request.rpcUrl });

  return { ...result, network };
}
