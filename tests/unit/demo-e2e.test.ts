import { beforeEach, describe, expect, it } from "vitest";
import {
  addHarvestBatch,
  addQualityResult,
  startProcessing,
  completeProcessing,
  createPackagingLot,
  dispatchShipment,
  confirmDelivery,
  confirmAnomaly,
  loadDemoData,
  getBatch,
  type DemoData,
} from "@/lib/demo/data";
import { loginDemoUser, getCurrentDemoUser, requireRole, setActiveDemoRole, logoutDemoUser } from "@/lib/demo/auth";
import { consumerVerdict } from "@/lib/demo/verify";
import { DEMO_USERS, isDemoBatchCode } from "@/lib/demo/config";

/**
 * Vitest runs in Node. The demo auth module guards storage access with
 * `typeof window`, so install an in-memory localStorage shim per test to
 * observe demo-session persistence exactly like the browser would.
 */
function installLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  installLocalStorage();
});

/**
 * Golden-path E2E (service level). Proves the exact journey a judge walks —
 * Beekeeper → Analyst → Processor → Distributor → Consumer verification — and
 * the Risk Center anomaly confirm flow, against the shared deterministic dataset.
 * The demo UI in the browser is a thin renderer over these same services.
 */
describe("golden path — full supply-chain traceability", () => {
  it("Keeper → Analyst → Processor → Distributor → Consumer verifies HC-2026-00124", () => {
    // 1. Keeper logs in and records the harvest.
    const keeper = loginDemoUser(DEMO_USERS.BEEKEEPER.email);
    expect(keeper).not.toBeNull();
    expect(keeper!.role).toBe("BEEKEEPER");
    expect(requireRole("BEEKEEPER")).not.toBeNull();
    setActiveDemoRole("BEEKEEPER");
    expect(getCurrentDemoUser()?.role).toBe("BEEKEEPER");

    let data: DemoData = loadDemoData();
    data = addHarvestBatch(
      data,
      { publicCode: "HC-2026-00124", honeyType: "Mustard Honey", floralSource: "Mustard", originRegion: "Purulia, West Bengal", quantityKg: 420 },
      { email: keeper!.email, name: keeper!.name },
    );
    expect(getBatch(data, "HC-2026-00124")?.currentStage).toBe("HARVEST");

    // 2. Analyst switches workspace, inspects and passes quality.
    const analyst = loginDemoUser(DEMO_USERS.ANALYST.email);
    setActiveDemoRole("ANALYST");
    expect(analyst).not.toBeNull();
    expect(analyst!.role).toBe("ANALYST");
    expect(requireRole("ANALYST")).not.toBeNull();
    data = addQualityResult(
      data,
      "HC-2026-00124",
      { testType: "Moisture", result: 17.2, unit: "%" },
      { email: analyst!.email, name: analyst!.name, lab: "National Bee Board Lab" },
      true,
    );
    expect(getBatch(data, "HC-2026-00124")?.quality).toBe("PASSED");

    // 3. Processor processes + packages the same batch.
    loginDemoUser(DEMO_USERS.PROCESSOR.email);
    setActiveDemoRole("PROCESSOR");
    data = startProcessing(data, "HC-2026-00124", { email: DEMO_USERS.PROCESSOR.email, name: DEMO_USERS.PROCESSOR.name });
    data = completeProcessing(data, "HC-2026-00124", { email: DEMO_USERS.PROCESSOR.email, name: DEMO_USERS.PROCESSOR.name });
    data = createPackagingLot(data, "HC-2026-00124", { email: DEMO_USERS.PROCESSOR.email, name: DEMO_USERS.PROCESSOR.name }, "LOT-001");
    expect(getBatch(data, "HC-2026-00124")?.currentStage).toBe("PACKAGING");

    // 4. Distributor dispatches and delivers — the batch reaches retail.
    loginDemoUser(DEMO_USERS.DISTRIBUTOR.email);
    setActiveDemoRole("DISTRIBUTOR");
    data = dispatchShipment(data, "HC-2026-00124", { email: DEMO_USERS.DISTRIBUTOR.email, name: DEMO_USERS.DISTRIBUTOR.name });
    data = confirmDelivery(data, "HC-2026-00124", { email: DEMO_USERS.DISTRIBUTOR.email, name: DEMO_USERS.DISTRIBUTOR.name });
    const batch = getBatch(data, "HC-2026-00124");
    expect(batch).toBeDefined();
    expect(batch?.currentStage).toBe("DELIVERED");

    // The batch kept ONE identity through all four roles.
    expect(new Set(batch!.events.map((e) => e.role)).size).toBeGreaterThanOrEqual(4);

    // 5. Consumer verification resolves the full journey from the demo dataset.
    expect(isDemoBatchCode("HC-2026-00124")).toBe(true);
    const verdict = consumerVerdict(batch!);
    expect(verdict.origin).toBe(true);
    expect(verdict.quality).toBe(true);
    expect(verdict.processing).toBe(true);
    expect(verdict.distribution).toBe(true);
    expect(verdict.complete).toBe(true);
    expect(verdict.checks.map((c) => c.label)).toContain("Complete traceability");
    expect(verdict.checks.every((c) => c.done)).toBe(true);

    logoutDemoUser();
  });

  it("Risk Center — GPS anomaly is detected then confirmed → incident resolves", () => {
    logoutDemoUser();
    // Analyst inspects the anomaly batch.
    loginDemoUser(DEMO_USERS.ANALYST.email);
    setActiveDemoRole("ANALYST");

    let data = loadDemoData();
    const risky = getBatch(data, "HC-2026-00281");
    expect(risky).toBeDefined();
    expect(risky?.anomaly).toBe("GPS_MISMATCH");
    expect(risky?.risk).toBe("HIGH");
    expect(data.incidents.some((i) => i.batchId === "HC-2026-00281")).toBe(true);
    let incident = data.incidents.find((i) => i.batchId === "HC-2026-00281");
    expect(incident?.status).toBe("OPEN");

    // Analyst confirms the anomaly → incident is resolved in the same dataset.
    data = confirmAnomaly(data, "HC-2026-00281");
    incident = data.incidents.find((i) => i.batchId === "HC-2026-00281");
    expect(incident?.status).toBe("RESOLVED");
    expect(getBatch(data, "HC-2026-00281")?.risk).toBe("HIGH");

    logoutDemoUser();
  });
});
