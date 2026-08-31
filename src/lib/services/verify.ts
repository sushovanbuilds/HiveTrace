import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hashScannerIp, verifyQRToken } from "@/lib/services/qr";
import { verifyAnchorIntegrity } from "@/lib/services/anchor";
import type { VerifyResult } from "@/lib/types";

/**
 * Consumer-facing provenance lookup (plan §13).
 *
 * Two things are checked and reported separately, because conflating them
 * misleads the person holding the jar:
 *
 *   - `label`  — is this QR one we issued, still live, and bound to this batch?
 *   - `record` — has the batch's event log been altered since it was anchored?
 *
 * A genuine label on a batch with a failed lab test is a truthful "authentic but
 * flagged" answer, not a forgery, and the UI has to be able to say so.
 */

export type LabelStatus =
  | "VALID"
  | "NO_TOKEN"
  | "FORGED"
  | "REVOKED"
  | "EXPIRED"
  | "BATCH_MISMATCH"
  | "UNKNOWN_TOKEN";

export interface ScanContext {
  ip: string | null;
  userAgent: string | null;
}

export interface VerifyOutcome {
  found: boolean;
  label: LabelStatus;
  /** Populated whenever the batch exists, regardless of label status. */
  provenance:
    | (VerifyResult & {
        events: Array<{ type: string; timestamp: Date }>;
        qualityTests: Array<{
          testType: string;
          result: number;
          unit: string;
          passed: boolean;
          labName: string | null;
          testedAt: Date;
        }>;
        integrity: {
          recordUnaltered: boolean;
          unanchored: boolean;
          /** True when no external ledger backs the proof — must be surfaced. */
          simulated: boolean;
          anchorCount: number;
          latestHash: string | null;
        };
      })
    | null;
  /** Repeat-scan signal: a duplicated label shows up as one code scanned from many places. */
  scanInsight: {
    totalScans: number;
    suspicious: boolean;
    reason: string | null;
  } | null;
}

export async function verifyBatch(
  identifier: { publicCode?: string; batchId?: string },
  token: string | null,
  scan: ScanContext | null,
): Promise<VerifyOutcome> {
  const payload = token ? verifyQRToken(token) : null;

  // A token that fails its MAC is a forgery; stop before touching the database
  // so a bogus code cannot be used to probe which batches exist.
  if (token && !payload) {
    return { found: false, label: "FORGED", provenance: null, scanInsight: null };
  }

  const publicCode = identifier.publicCode ?? payload?.publicCode;
  const where = identifier.batchId
    ? { id: identifier.batchId }
    : publicCode
      ? { publicCode }
      : null;
  if (!where) {
    return { found: false, label: "NO_TOKEN", provenance: null, scanInsight: null };
  }

  const batch = await db.batch.findFirst({
    where,
    include: {
      organisation: { select: { name: true } },
      harvest: {
        select: { date: true, hive: { select: { farm: { select: { region: true } } } } },
      },
      lineage: { select: { sourceBatchId: true } },
      childLineage: { select: { targetBatchId: true } },
      qualityTests: { orderBy: { testedAt: "asc" } },
      events: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!batch) {
    return { found: false, label: payload ? "BATCH_MISMATCH" : "NO_TOKEN", provenance: null, scanInsight: null };
  }

  let label: LabelStatus = "NO_TOKEN";
  let scanInsight: VerifyOutcome["scanInsight"] = null;

  if (payload) {
    const record = await db.qRToken.findUnique({ where: { token: token! } });

    if (!record) {
      // Correctly signed but absent from the database: either issued by a
      // different deployment or the row was deleted. Not treatable as valid.
      label = "UNKNOWN_TOKEN";
    } else if (record.batchId !== batch.id || payload.batchId !== batch.id) {
      label = "BATCH_MISMATCH";
    } else if (record.revoked) {
      label = "REVOKED";
    } else if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      label = "EXPIRED";
    } else {
      label = "VALID";
    }

    if (record) scanInsight = await recordScan(record.id, batch.id, scan);
  }

  const integrity = await verifyAnchorIntegrity(batch.id);

  const provenance: VerifyOutcome["provenance"] = {
    batchId: batch.id,
    publicCode: batch.publicCode,
    organisation: batch.organisation?.name ?? "Unknown",
    currentStage: batch.currentStage as VerifyResult["currentStage"],
    qualityStatus: batch.qualityStatus as VerifyResult["qualityStatus"],
    riskState: batch.riskState as VerifyResult["riskState"],
    verificationState: batch.verificationState as VerifyResult["verificationState"],
    harvestDate: batch.harvest?.date ?? null,
    originRegion: batch.originRegion,
    honeyType: batch.honeyType,
    quantity: batch.quantity,
    lineageDepth: batch.lineage.length + batch.childLineage.length,
    qualityTestCount: batch.qualityTests.length,
    lastEventDate: batch.events.at(-1)?.timestamp ?? null,
    events: batch.events.map((event) => ({ type: event.type, timestamp: event.timestamp })),
    qualityTests: batch.qualityTests.map((test) => ({
      testType: test.testType,
      result: test.result,
      unit: test.unit,
      passed: test.passed,
      labName: test.labName,
      testedAt: test.testedAt,
    })),
    integrity: {
      recordUnaltered: integrity.valid,
      unanchored: integrity.unanchored,
      simulated: integrity.simulated,
      anchorCount: integrity.anchors.length,
      latestHash: integrity.anchors[0]?.eventBundleHash ?? null,
    },
  };

  return { found: true, label, provenance, scanInsight };
}

/**
 * Logs the scan and looks for the duplicate-label signature.
 *
 * One physical jar scanned repeatedly by its owner is normal. The same code
 * scanned from many distinct networks is what a cloned label looks like, so the
 * heuristic counts distinct hashed origins rather than raw scan volume.
 */
async function recordScan(
  qrTokenId: string,
  batchId: string,
  scan: ScanContext | null,
): Promise<VerifyOutcome["scanInsight"]> {
  const ipHash = scan?.ip ? hashScannerIp(scan.ip) : null;
  // The user agent is fingerprintable, so only a short digest is kept — enough
  // to tell two devices apart, not enough to profile one.
  const userAgent = scan?.userAgent
    ? createHash("sha256").update(scan.userAgent).digest("hex").slice(0, 16)
    : null;

  const [distinctOrigins, totalScans] = await Promise.all([
    db.qRScan.findMany({
      where: { qrTokenId, ipHash: { not: null } },
      distinct: ["ipHash"],
      select: { ipHash: true },
      take: 50,
    }),
    db.qRScan.count({ where: { qrTokenId } }),
  ]);

  const knownOrigins = new Set(distinctOrigins.map((row) => row.ipHash));
  if (ipHash) knownOrigins.add(ipHash);

  const suspicious = knownOrigins.size >= 5;
  const reason = suspicious
    ? `Label scanned from ${knownOrigins.size} distinct networks — possible duplicated label`
    : null;

  await db.$transaction([
    db.qRScan.create({
      data: { qrTokenId, batchId, ipHash, userAgent, suspicious, reason },
    }),
    db.qRToken.update({
      where: { id: qrTokenId },
      data: { scanCount: { increment: 1 }, lastScan: new Date() },
    }),
  ]);

  if (suspicious) await raiseDuplicateLabelAlert(batchId, knownOrigins.size);

  return { totalScans: totalScans + 1, suspicious, reason };
}

/** Files one open DUPLICATE_QR alert per batch rather than one per scan. */
async function raiseDuplicateLabelAlert(batchId: string, originCount: number): Promise<void> {
  const message = `QR label scanned from ${originCount} distinct networks — possible duplicated or cloned label`;
  const existing = await db.alert.findFirst({
    where: { batchId, type: "DUPLICATE_QR", status: { in: ["NEW", "ACKNOWLEDGED"] } },
  });

  if (existing) {
    await db.alert.update({
      where: { id: existing.id },
      data: { message, metadata: { originCount } },
    });
    return;
  }
  await db.alert.create({
    data: {
      batchId,
      type: "DUPLICATE_QR",
      severity: "HIGH",
      message,
      status: "NEW",
      metadata: { originCount },
    },
  });
}

/** Human-readable copy for each label status, shared by the API and the page. */
export const LABEL_COPY: Record<LabelStatus, { headline: string; detail: string; tone: "ok" | "warn" | "bad" | "info" }> = {
  VALID: {
    headline: "Label verified",
    detail: "This QR code was issued by the producer and is registered to this batch.",
    tone: "ok",
  },
  NO_TOKEN: {
    headline: "Batch record found",
    detail: "Looked up by batch code. Scan the QR code on the jar to also verify the label itself.",
    tone: "info",
  },
  FORGED: {
    headline: "Invalid label",
    detail: "This code carries an invalid signature. It was not issued by HiveTrace.",
    tone: "bad",
  },
  UNKNOWN_TOKEN: {
    headline: "Unrecognised label",
    detail: "The signature checks out but no matching label is on record. Treat with caution.",
    tone: "bad",
  },
  REVOKED: {
    headline: "Label withdrawn",
    detail: "The producer has revoked this label. It should no longer be in circulation.",
    tone: "bad",
  },
  EXPIRED: {
    headline: "Label expired",
    detail: "This label is past its validity period. The batch record below is still accurate.",
    tone: "warn",
  },
  BATCH_MISMATCH: {
    headline: "Label does not match this batch",
    detail: "The code points at a different batch than the one requested.",
    tone: "bad",
  },
};
