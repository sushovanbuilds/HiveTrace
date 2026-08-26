import { z } from "zod";
import { generateText, type ChatModelLike } from "@/lib/ai/provider";
import {
  fetchTransaction,
  type FetchTransaction,
  type FetchedTx,
} from "@/agents/tools/web3Tools";

export const ThreatReportSchema = z.object({
  summary: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  vector: z.string().min(1),
});

export type ThreatReportData = z.infer<typeof ThreatReportSchema>;

export interface AnalyzeInput {
  txHash: string;
  rpcUrl?: string;
  fetchTx?: FetchTransaction;
  model?: ChatModelLike;
}

const SYSTEM_PROMPT = `You are a blockchain security analyst for the Honychain honeypot platform.
Given raw on-chain transaction data, determine whether the interaction is an attack and
classify it. Respond with ONLY a single JSON object (no prose, no markdown fences) matching
this TypeScript type:

{
  "summary": string;   // concise human-readable description of what the transaction did
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";  // impact if this were a real exploit
  "vector": string;    // attack category, e.g. "Reentrancy", "Flashloan", "Phishing", "Benign"
}

Ground every claim in the provided transaction data. If the transaction is benign or
uneventful, set severity to "LOW" and vector to "Benign". Never invent data that is not
present in the input.`;

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

function buildPrompt(tx: FetchedTx): string {
  return [
    "Analyze the following transaction captured by a honeypot:",
    "",
    JSON.stringify(tx, null, 2),
  ].join("\n");
}

export async function analyzeTransaction(
  input: AnalyzeInput,
): Promise<ThreatReportData> {
  const fetch = input.fetchTx ?? fetchTransaction;
  const tx = await fetch(input.txHash, input.rpcUrl);

  const raw = await generateText({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(tx),
    model: input.model,
    temperature: 0,
    maxTokens: 1024,
  });

  const parsed = ThreatReportSchema.safeParse(JSON.parse(extractJson(raw)));
  if (!parsed.success) {
    throw new Error(
      `Model output failed validation: ${parsed.error.message} (raw: ${raw.slice(0, 200)})`,
    );
  }
  return parsed.data;
}
