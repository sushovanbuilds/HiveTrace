import { db } from "@/lib/db";
import { blockchainChain, isSimulatedChain } from "@/lib/env";
import { hashBatchEvents } from "./qr";

/**
 * Event-bundle anchoring.
 *
 * The Merkle root computed here is real: re-hashing a batch's events and
 * comparing roots genuinely detects any post-hoc edit to the event log. What is
 * *not* real in the MVP is the ledger — nothing is written to a blockchain, so
 * `chain` records "SIMULATED" and `txHash`/`blockNumber` stay null rather than
 * carrying invented values (plan §23: never present a simulation as real).
 *
 * The integrity guarantee this gives you is therefore "the log has not changed
 * since it was anchored", not "an independent party witnessed it". Callers must
 * surface `simulated` so the UI can say so.
 */
export interface AnchorResult {
  id: string;
  status: "PENDING" | "ANCHORED" | "FAILED";
  eventBundleHash: string;
  chain: string;
  /** True when no external ledger backs this anchor. */
  simulated: boolean;
  /** True when an anchor for this exact root already existed. */
  alreadyAnchored: boolean;
}

export async function anchorBatchEvents(
  batchId: string,
  signerIdentity: string,
): Promise<AnchorResult> {
  const events = await db.batchEvent.findMany({
    where: { batchId },
    orderBy: { timestamp: "asc" },
  });

  const bundleHash = hashBatchEvents(events);
  const chain = blockchainChain();
  const simulated = isSimulatedChain();

  const existing = await db.blockchainAnchor.findFirst({
    where: { batchId, eventBundleHash: bundleHash },
  });
  if (existing) {
    return {
      id: existing.id,
      status: existing.status as AnchorResult["status"],
      eventBundleHash: bundleHash,
      chain: existing.chain,
      simulated: existing.chain === "SIMULATED",
      alreadyAnchored: true,
    };
  }

  const anchor = await db.blockchainAnchor.create({
    data: {
      batchId,
      eventType: "BATCH_EVENTS",
      eventBundleHash: bundleHash,
      // A simulated anchor is immediately durable locally; a real one would be
      // PENDING until the transaction confirmed.
      status: simulated ? "ANCHORED" : "PENDING",
      chain,
      txHash: null,
      blockNumber: null,
      signerIdentity,
      anchoredAt: simulated ? new Date() : null,
    },
  });

  return {
    id: anchor.id,
    status: anchor.status as AnchorResult["status"],
    eventBundleHash: bundleHash,
    chain,
    simulated,
    alreadyAnchored: false,
  };
}

export interface AnchorIntegrity {
  /** False only when a recorded root disagrees with the current event log. */
  valid: boolean;
  /** True when there is nothing to compare against yet. */
  unanchored: boolean;
  simulated: boolean;
  currentHash: string;
  anchors: Array<{
    id: string;
    eventBundleHash: string;
    status: string;
    chain: string;
    txHash: string | null;
    blockNumber: number | null;
    anchoredAt: Date | null;
    /** Whether this specific anchor still matches the live event log. */
    matchesCurrent: boolean;
  }>;
}

export async function verifyAnchorIntegrity(batchId: string): Promise<AnchorIntegrity> {
  const [anchors, events] = await Promise.all([
    db.blockchainAnchor.findMany({
      where: { batchId },
      orderBy: [{ anchoredAt: "desc" }, { createdAt: "desc" }],
    }),
    db.batchEvent.findMany({ where: { batchId }, orderBy: { timestamp: "asc" } }),
  ]);

  const currentHash = hashBatchEvents(events);
  const latest = anchors[0];

  return {
    // An unanchored batch is "not yet proven", not "proven bad" — the caller
    // distinguishes the two via `unanchored`.
    valid: latest ? latest.eventBundleHash === currentHash : true,
    unanchored: anchors.length === 0,
    simulated: latest ? latest.chain === "SIMULATED" : isSimulatedChain(),
    currentHash,
    anchors: anchors.map((a) => ({
      id: a.id,
      eventBundleHash: a.eventBundleHash,
      status: a.status,
      chain: a.chain,
      txHash: a.txHash,
      blockNumber: a.blockNumber,
      anchoredAt: a.anchoredAt,
      matchesCurrent: a.eventBundleHash === currentHash,
    })),
  };
}
