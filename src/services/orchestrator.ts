import { db as defaultDb } from "@/lib/db";
import {
  analyzeTransaction,
  type AnalyzeInput,
  type ThreatReportData,
} from "@/agents/analysisAgent";
import type { FetchTransaction } from "@/agents/tools/web3Tools";
import type { ChatModelLike } from "@/lib/ai/provider";

// Structural persistence surface — the real Prisma client satisfies this.
export interface Persistence {
  honeypot: {
    findUnique: (args: {
      where: { address: string };
    }) => Promise<{ id: string; address: string; status: string } | null>;
    update: (args: {
      where: { id: string };
      data: { status: string };
    }) => Promise<unknown>;
  };
  event: {
    create: (args: {
      data: { txHash: string; honeypotId: string; rawData: unknown };
    }) => Promise<{ id: string }>;
  };
  threatReport: {
    create: (args: {
      data: {
        eventId: string;
        summary: string;
        severity: string;
        vector: string;
      };
    }) => Promise<{ id: string }>;
  };
}

export interface ProcessInput {
  txHash: string;
  rpcUrl?: string;
  fetchTx?: FetchTransaction;
  model?: ChatModelLike;
  analyze?: (input: AnalyzeInput) => Promise<ThreatReportData>;
  db?: Persistence;
}

export interface ProcessResult {
  eventId: string;
  reportId: string;
  honeypotId: string;
  report: ThreatReportData;
}

const SEVERE = new Set(["HIGH", "CRITICAL"]);

export async function processTransaction(
  input: ProcessInput,
): Promise<ProcessResult> {
  const persistence = input.db ?? (defaultDb as unknown as Persistence);
  const analyze = input.analyze ?? analyzeTransaction;

  const report = await analyze({
    txHash: input.txHash,
    rpcUrl: input.rpcUrl,
    fetchTx: input.fetchTx,
    model: input.model,
  });

  // Resolve the targeted honeypot via the tx's `to` address. Re-fetch here so
  // the orchestrator independently links to the persisted honeypot row rather
  // than trusting caller-supplied context.
  const tx = input.fetchTx
    ? await input.fetchTx(input.txHash, input.rpcUrl)
    : null;
  const address = tx?.to;
  if (!address) {
    throw new Error(
      `Cannot link transaction ${input.txHash}: no destination address`,
    );
  }

  const honeypot = await persistence.honeypot.findUnique({
    where: { address: address.toLowerCase() },
  });
  if (!honeypot) {
    throw new Error(
      `Transaction ${input.txHash} targets ${address}, which is not a known honeypot`,
    );
  }

  const event = await persistence.event.create({
    data: {
      txHash: input.txHash,
      honeypotId: honeypot.id,
      rawData: tx ?? { note: "raw tx not fetched" },
    },
  });

  const threatReport = await persistence.threatReport.create({
    data: {
      eventId: event.id,
      summary: report.summary,
      severity: report.severity,
      vector: report.vector,
    },
  });

  if (SEVERE.has(report.severity)) {
    await persistence.honeypot.update({
      where: { id: honeypot.id },
      data: { status: "COMPROMISED" },
    });
  }

  return {
    eventId: event.id,
    reportId: threatReport.id,
    honeypotId: honeypot.id,
    report,
  };
}
