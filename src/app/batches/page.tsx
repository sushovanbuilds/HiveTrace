import { AppShell } from "@/components/app-shell";
import { BatchesHeader, BatchesLedger, type LedgerBatch } from "@/components/batches-ledger";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  let batches: LedgerBatch[] = [];
  let total = 0;

  try {
    const [rows, count] = await Promise.all([
      db.batch.findMany({
        select: {
          id: true,
          publicCode: true,
          honeyType: true,
          originRegion: true,
          quantity: true,
          currentStage: true,
          riskState: true,
          verificationState: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      db.batch.count(),
    ]);
    batches = rows.map((b) => ({
      ...b,
      updatedAt: b.updatedAt.toISOString(),
    }));
    total = count;
  } catch {
    // Database unavailable (build/first-run): render the seeded demo ledger.
    batches = DEMO_BATCHES;
    total = DEMO_BATCHES.length;
  }

  return (
    <AppShell>
      <BatchesHeader total={total} />
      <BatchesLedger initial={batches} total={total} />
    </AppShell>
  );
}

const DEMO_BATCHES: LedgerBatch[] = [
  { id: "b1", publicCode: "WB-PUR-2026-001", honeyType: "MUSTARD", originRegion: "Purulia, WB", quantity: 1240, currentStage: "PROCESSING", riskState: "LOW", verificationState: "VERIFIED", updatedAt: new Date(Date.now() - 2 * 3600e3).toISOString() },
  { id: "b2", publicCode: "JK-KAS-2026-002", honeyType: "ACACIA", originRegion: "Kashmir Valley", quantity: 850, currentStage: "DISTRIBUTION", riskState: "LOW", verificationState: "UNVERIFIED", updatedAt: new Date(Date.now() - 5 * 3600e3).toISOString() },
  { id: "b3", publicCode: "WB-SUN-2026-003", honeyType: "WILDFLOWER", originRegion: "Sundarbans, WB", quantity: 2100, currentStage: "LAB", riskState: "HIGH", verificationState: "UNVERIFIED", updatedAt: new Date(Date.now() - 26 * 3600e3).toISOString() },
  { id: "b4", publicCode: "TN-NIL-2026-004", honeyType: "EUCALYPTUS", originRegion: "Nilgiris, TN", quantity: 450, currentStage: "RETAIL", riskState: "LOW", verificationState: "VERIFIED", updatedAt: new Date(Date.now() - 49 * 3600e3).toISOString() },
  { id: "b5", publicCode: "HP-KUL-2026-005", honeyType: "LITCHI", originRegion: "Kullu, HP", quantity: 730, currentStage: "PACKAGING", riskState: "MEDIUM", verificationState: "UNVERIFIED", updatedAt: new Date(Date.now() - 74 * 3600e3).toISOString() },
  { id: "b6", publicCode: "WB-MUR-2026-006", honeyType: "MULTIFLORAL", originRegion: "Murshidabad, WB", quantity: 1980, currentStage: "COLLECTION", riskState: "LOW", verificationState: "UNVERIFIED", updatedAt: new Date(Date.now() - 6 * 3600e3).toISOString() },
];