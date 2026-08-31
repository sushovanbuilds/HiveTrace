import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { hashBatchEvents, issueQRToken } from "@/lib/services/qr";

/**
 * Shared password for every seeded account. Demo data only — the seed is never
 * run against a real deployment, and `.env` holds distinct secrets there.
 */
const DEMO_PASSWORD = "hivetrace-demo";

interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organisationId: string;
}

async function main() {
  console.log("Seeding HIVETRACE database...");

  // Delete in reverse dependency order so foreign keys never block a wipe.
  await db.aIAnalysis.deleteMany();
  await db.blockchainAnchor.deleteMany();
  await db.qRScan.deleteMany();
  await db.qRToken.deleteMany();
  await db.document.deleteMany();
  await db.qualityTest.deleteMany();
  await db.riskScore.deleteMany();
  await db.alert.deleteMany();
  await db.investigationCase.deleteMany();
  await db.incident.deleteMany();
  await db.batchEvent.deleteMany();
  await db.batchLineage.deleteMany();
  await db.custodyTransfer.deleteMany();
  await db.consentRecord.deleteMany();
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.shipment.deleteMany();
  await db.batch.deleteMany();
  await db.harvest.deleteMany();
  await db.hive.deleteMany();
  await db.farm.deleteMany();
  await db.user.deleteMany();
  await db.organisation.deleteMany();

  // ── Organisations ────────────────────────────────────────────────────────
  const orgs = await Promise.all([
    db.organisation.create({ data: { id: "org_1", name: "Green Valley Apiaries", type: "BEEKEEPER" } }),
    db.organisation.create({ data: { id: "org_2", name: "Kashmir Honey Co-op", type: "BEEKEEPER" } }),
    db.organisation.create({ data: { id: "org_3", name: "National Bee Board Lab", type: "LAB" } }),
    db.organisation.create({ data: { id: "org_4", name: "Amrit Honey Processors", type: "PROCESSOR" } }),
    db.organisation.create({ data: { id: "org_5", name: "HoneyLine Distributors", type: "DISTRIBUTOR" } }),
    db.organisation.create({ data: { id: "org_6", name: "Sahyadri Collection Centre", type: "COLLECTOR" } }),
    db.organisation.create({ data: { id: "org_7", name: "FSSAI Enforcement Cell", type: "ADMIN" } }),
  ]);
  console.log(`Created ${orgs.length} organisations`);

  // ── Users ────────────────────────────────────────────────────────────────
  //
  // Every seeded account gets a real scrypt digest. Hashing is deliberately
  // slow (~100 ms each), so these run concurrently rather than in a loop.
  const userSeeds: SeedUser[] = [
    { id: "usr_1", email: "ravi@greenvalley.in", name: "Ravi Kumar", role: "BEEKEEPER", organisationId: "org_1" },
    { id: "usr_2", email: "priya@kashmirhoney.in", name: "Priya Sharma", role: "BEEKEEPER", organisationId: "org_2" },
    { id: "usr_3", email: "dr.anand@nbb.gov.in", name: "Dr. Anand Mehta", role: "LAB", organisationId: "org_3" },
    { id: "usr_4", email: "suresh@amrit.in", name: "Suresh Patel", role: "PROCESSOR", organisationId: "org_4" },
    { id: "usr_5", email: "meera@honeyline.in", name: "Meera Reddy", role: "DISTRIBUTOR", organisationId: "org_5" },
    { id: "usr_6", email: "admin@hivetrace.gov.in", name: "Admin User", role: "ADMIN", organisationId: "org_7" },
    { id: "usr_7", email: "kavita@fssai.gov.in", name: "Kavita Iyer", role: "INVESTIGATOR", organisationId: "org_7" },
    { id: "usr_8", email: "arjun@sahyadri.in", name: "Arjun Nair", role: "COLLECTOR", organisationId: "org_6" },
  ];
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = await Promise.all(
    userSeeds.map((user) => db.user.create({ data: { ...user, passwordHash } })),
  );
  console.log(`Created ${users.length} users`);

  // ── Farms ────────────────────────────────────────────────────────────────
  const farms = await Promise.all([
    db.farm.create({ data: { id: "farm_1", name: "Valley Heights", location: "23.2599,77.4126", region: "Madhya Pradesh", organisationId: "org_1" } }),
    db.farm.create({ data: { id: "farm_2", name: "Himalayan Apiary", location: "34.0837,74.7973", region: "Kashmir", organisationId: "org_2" } }),
    db.farm.create({ data: { id: "farm_3", name: "Western Ghats Hive", location: "12.2958,76.6394", region: "Karnataka", organisationId: "org_1" } }),
    db.farm.create({ data: { id: "farm_4", name: "Sundarban Mangrove Yard", location: "21.9497,88.7500", region: "West Bengal", organisationId: "org_2" } }),
  ]);
  console.log(`Created ${farms.length} farms`);

  // ── Hives ────────────────────────────────────────────────────────────────
  const hives = await Promise.all([
    db.hive.create({ data: { id: "hive_1", name: "Hive A1", farmId: "farm_1", type: "LANGSTROTH", status: "ACTIVE" } }),
    db.hive.create({ data: { id: "hive_2", name: "Hive A2", farmId: "farm_1", type: "LANGSTROTH", status: "ACTIVE" } }),
    db.hive.create({ data: { id: "hive_3", name: "Hive B1", farmId: "farm_2", type: "LANGSTROTH", status: "ACTIVE" } }),
    db.hive.create({ data: { id: "hive_4", name: "Hive C1", farmId: "farm_3", type: "TOP_BAR", status: "ACTIVE" } }),
    db.hive.create({ data: { id: "hive_5", name: "Hive D1", farmId: "farm_4", type: "LANGSTROTH", status: "ACTIVE" } }),
    db.hive.create({ data: { id: "hive_6", name: "Hive D2", farmId: "farm_4", type: "TOP_BAR", status: "INSPECTION" } }),
  ]);
  console.log(`Created ${hives.length} hives`);

  // ── Harvests ─────────────────────────────────────────────────────────────
  const harvests = await Promise.all([
    db.harvest.create({ data: { id: "harv_1", hiveId: "hive_1", date: new Date("2026-03-15"), quantity: 28.5, honeyType: "MULTIFLORAL" } }),
    db.harvest.create({ data: { id: "harv_2", hiveId: "hive_3", date: new Date("2026-04-10"), quantity: 15.0, honeyType: "MANUKA" } }),
    db.harvest.create({ data: { id: "harv_3", hiveId: "hive_4", date: new Date("2026-05-01"), quantity: 22.0, honeyType: "EUCALYPTUS" } }),
    db.harvest.create({ data: { id: "harv_4", hiveId: "hive_5", date: new Date("2026-06-02"), quantity: 34.2, honeyType: "MANGROVE" } }),
    db.harvest.create({ data: { id: "harv_5", hiveId: "hive_2", date: new Date("2026-06-20"), quantity: 19.4, honeyType: "MUSTARD" } }),
  ]);
  console.log(`Created ${harvests.length} harvests`);

  // ── Batches ──────────────────────────────────────────────────────────────
  //
  // Public codes use the random alphabet the runtime now issues, rather than a
  // sequential counter. batch_1 is the clean reference batch, batch_3 the
  // failing one, batch_4 the fully-delivered chain, batch_5 mid-flight.
  const batches = await Promise.all([
    db.batch.create({
      data: {
        id: "batch_1", publicCode: "HC-2026-K7QM2X", harvestId: "harv_1", organisationId: "org_1",
        honeyType: "MULTIFLORAL", floralSource: "Sunflower & Neem", originRegion: "Madhya Pradesh",
        quantity: 28.5, currentStage: "PACKAGING", currentCustodianId: "usr_4",
        qualityStatus: "PASSED", riskScore: 15, riskState: "LOW", verificationState: "VERIFIED",
      },
    }),
    db.batch.create({
      data: {
        id: "batch_2", publicCode: "HC-2026-R4NBTY", harvestId: "harv_2", organisationId: "org_2",
        honeyType: "MANUKA", floralSource: "Manuka", originRegion: "Kashmir",
        quantity: 15.0, currentStage: "LAB", currentCustodianId: "usr_3",
        qualityStatus: "PENDING", riskScore: 0, riskState: "LOW", verificationState: "UNVERIFIED",
      },
    }),
    db.batch.create({
      data: {
        id: "batch_3", publicCode: "HC-2026-W9HJ5D", harvestId: "harv_3", organisationId: "org_1",
        honeyType: "EUCALYPTUS", floralSource: "Eucalyptus", originRegion: "Karnataka",
        quantity: 22.0, currentStage: "HARVEST", currentCustodianId: "usr_1",
        qualityStatus: "FAILED", riskScore: 68, riskState: "HIGH", verificationState: "DISPUTED",
      },
    }),
    db.batch.create({
      data: {
        id: "batch_4", publicCode: "HC-2026-T3VPLC", harvestId: "harv_4", organisationId: "org_2",
        honeyType: "MANGROVE", floralSource: "Sundarban Mangrove", originRegion: "West Bengal",
        quantity: 34.2, currentStage: "RETAIL", currentCustodianId: "usr_5",
        qualityStatus: "PASSED", riskScore: 8, riskState: "LOW", verificationState: "VERIFIED",
      },
    }),
    db.batch.create({
      data: {
        id: "batch_5", publicCode: "HC-2026-M6XZQK", harvestId: "harv_5", organisationId: "org_1",
        honeyType: "MUSTARD", floralSource: "Mustard", originRegion: "Madhya Pradesh",
        quantity: 19.4, currentStage: "COLLECTION", currentCustodianId: "usr_8",
        qualityStatus: "PENDING", riskScore: 22, riskState: "LOW", verificationState: "UNVERIFIED",
      },
    }),
  ]);
  console.log(`Created ${batches.length} batches`);

  // ── Batch events ─────────────────────────────────────────────────────────
  //
  // Chronology matters: the risk engine reads these in ascending order and
  // flags harvests dated after their own lab test, custody gaps, and stages
  // missing their expected events.
  const events = await Promise.all([
    // batch_1 — complete, consistent history
    db.batchEvent.create({ data: { batchId: "batch_1", type: "HARVEST", data: { quantity: 28.5, hive: "Hive A1" }, actorId: "usr_1", timestamp: new Date("2026-03-15T06:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_1", type: "CUSTODY_TRANSFER", data: { from: "usr_1", to: "usr_8", role: "BEEKEEPER->COLLECTOR" }, actorId: "usr_1", timestamp: new Date("2026-03-17T09:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_1", type: "CUSTODY_TRANSFER", data: { from: "usr_8", to: "usr_3", role: "COLLECTOR->LAB" }, actorId: "usr_8", timestamp: new Date("2026-03-20T10:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_1", type: "QUALITY_TEST", data: { testType: "MOISTURE", result: 18.2 }, actorId: "usr_3", timestamp: new Date("2026-03-22T14:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_1", type: "LAB_RESULT", data: { passed: true, score: 92 }, actorId: "usr_3", timestamp: new Date("2026-03-25T09:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_1", type: "CUSTODY_TRANSFER", data: { from: "usr_3", to: "usr_4", role: "LAB->PROCESSOR" }, actorId: "usr_3", timestamp: new Date("2026-03-27T08:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_1", type: "PROCESSING", data: { method: "COLD_FILTERED", tempC: 34 }, actorId: "usr_4", timestamp: new Date("2026-03-29T11:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_1", type: "PACKAGING", data: { units: 570, sizeG: 50 }, actorId: "usr_4", timestamp: new Date("2026-04-01T10:00:00Z") } }),

    // batch_2 — in the lab, awaiting results
    db.batchEvent.create({ data: { batchId: "batch_2", type: "HARVEST", data: { quantity: 15.0, hive: "Hive B1" }, actorId: "usr_2", timestamp: new Date("2026-04-10T07:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_2", type: "CUSTODY_TRANSFER", data: { from: "usr_2", to: "usr_3", role: "BEEKEEPER->LAB" }, actorId: "usr_2", timestamp: new Date("2026-04-15T11:00:00Z") } }),

    // batch_3 — the problem batch: failed moisture, no custody chain at all
    db.batchEvent.create({ data: { batchId: "batch_3", type: "HARVEST", data: { quantity: 22.0, hive: "Hive C1" }, actorId: "usr_1", timestamp: new Date("2026-05-01T06:30:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_3", type: "QUALITY_TEST", data: { testType: "MOISTURE", result: 24.1 }, actorId: "usr_3", timestamp: new Date("2026-05-05T11:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_3", type: "LAB_RESULT", data: { passed: false, score: 41 }, actorId: "usr_3", timestamp: new Date("2026-05-06T09:00:00Z") } }),

    // batch_4 — full farm-to-shelf chain
    db.batchEvent.create({ data: { batchId: "batch_4", type: "HARVEST", data: { quantity: 34.2, hive: "Hive D1" }, actorId: "usr_2", timestamp: new Date("2026-06-02T06:15:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "CUSTODY_TRANSFER", data: { from: "usr_2", to: "usr_8", role: "BEEKEEPER->COLLECTOR" }, actorId: "usr_2", timestamp: new Date("2026-06-04T09:30:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "CUSTODY_TRANSFER", data: { from: "usr_8", to: "usr_3", role: "COLLECTOR->LAB" }, actorId: "usr_8", timestamp: new Date("2026-06-06T10:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "QUALITY_TEST", data: { testType: "MOISTURE", result: 17.4 }, actorId: "usr_3", timestamp: new Date("2026-06-08T13:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "LAB_RESULT", data: { passed: true, score: 96 }, actorId: "usr_3", timestamp: new Date("2026-06-10T09:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "CUSTODY_TRANSFER", data: { from: "usr_3", to: "usr_4", role: "LAB->PROCESSOR" }, actorId: "usr_3", timestamp: new Date("2026-06-12T08:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "PROCESSING", data: { method: "RAW_UNHEATED" }, actorId: "usr_4", timestamp: new Date("2026-06-14T11:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "PACKAGING", data: { units: 684, sizeG: 50 }, actorId: "usr_4", timestamp: new Date("2026-06-16T10:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "CUSTODY_TRANSFER", data: { from: "usr_4", to: "usr_5", role: "PROCESSOR->DISTRIBUTOR" }, actorId: "usr_4", timestamp: new Date("2026-06-18T07:45:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "SHIPMENT", data: { destination: "Kolkata DC", tempC: 22 }, actorId: "usr_5", timestamp: new Date("2026-06-19T06:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_4", type: "RETAIL_LISTING", data: { outlet: "Organic Bazaar, Kolkata" }, actorId: "usr_5", timestamp: new Date("2026-06-22T09:00:00Z") } }),

    // batch_5 — at the collection centre
    db.batchEvent.create({ data: { batchId: "batch_5", type: "HARVEST", data: { quantity: 19.4, hive: "Hive A2" }, actorId: "usr_1", timestamp: new Date("2026-06-20T06:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_5", type: "CUSTODY_TRANSFER", data: { from: "usr_1", to: "usr_8", role: "BEEKEEPER->COLLECTOR" }, actorId: "usr_1", timestamp: new Date("2026-06-23T09:15:00Z") } }),
  ]);
  console.log(`Created ${events.length} events`);

  // ── Custody transfers ────────────────────────────────────────────────────
  //
  // These mirror the CUSTODY_TRANSFER events above. The risk engine checks that
  // each transfer's `from` matches the previous transfer's `to`, so a chain
  // that disagrees with the event log is a finding, not a seeding shortcut.
  await Promise.all([
    db.custodyTransfer.create({ data: { batchId: "batch_1", fromCustodianId: "usr_1", toCustodianId: "usr_8", fromRole: "BEEKEEPER", toRole: "COLLECTOR", timestamp: new Date("2026-03-17T09:00:00Z") } }),
    db.custodyTransfer.create({ data: { batchId: "batch_1", fromCustodianId: "usr_8", toCustodianId: "usr_3", fromRole: "COLLECTOR", toRole: "LAB", timestamp: new Date("2026-03-20T10:00:00Z") } }),
    db.custodyTransfer.create({ data: { batchId: "batch_1", fromCustodianId: "usr_3", toCustodianId: "usr_4", fromRole: "LAB", toRole: "PROCESSOR", timestamp: new Date("2026-03-27T08:00:00Z") } }),

    db.custodyTransfer.create({ data: { batchId: "batch_2", fromCustodianId: "usr_2", toCustodianId: "usr_3", fromRole: "BEEKEEPER", toRole: "LAB", timestamp: new Date("2026-04-15T11:00:00Z") } }),

    db.custodyTransfer.create({ data: { batchId: "batch_4", fromCustodianId: "usr_2", toCustodianId: "usr_8", fromRole: "BEEKEEPER", toRole: "COLLECTOR", timestamp: new Date("2026-06-04T09:30:00Z") } }),
    db.custodyTransfer.create({ data: { batchId: "batch_4", fromCustodianId: "usr_8", toCustodianId: "usr_3", fromRole: "COLLECTOR", toRole: "LAB", timestamp: new Date("2026-06-06T10:00:00Z") } }),
    db.custodyTransfer.create({ data: { batchId: "batch_4", fromCustodianId: "usr_3", toCustodianId: "usr_4", fromRole: "LAB", toRole: "PROCESSOR", timestamp: new Date("2026-06-12T08:00:00Z") } }),
    db.custodyTransfer.create({ data: { batchId: "batch_4", fromCustodianId: "usr_4", toCustodianId: "usr_5", fromRole: "PROCESSOR", toRole: "DISTRIBUTOR", timestamp: new Date("2026-06-18T07:45:00Z") } }),

    db.custodyTransfer.create({ data: { batchId: "batch_5", fromCustodianId: "usr_1", toCustodianId: "usr_8", fromRole: "BEEKEEPER", toRole: "COLLECTOR", timestamp: new Date("2026-06-23T09:15:00Z") } }),
  ]);
  console.log("Created custody transfers");

  // ── Lineage ──────────────────────────────────────────────────────────────
  //
  // batch_6 is a blend, which is the case the provenance graph exists for: once
  // two lots are combined, "where did this jar come from" has more than one
  // answer, and one of its inputs (batch_2) had not passed its lab panel when
  // the blend was made. That is a real finding, not seed decoration — the
  // traceability view should surface it.
  await db.batch.create({
    data: {
      id: "batch_6", publicCode: "HC-2026-D5YWN8", organisationId: "org_4",
      honeyType: "MULTIFLORAL", floralSource: "Blend: sunflower, neem, manuka",
      originRegion: "Multi-origin (Madhya Pradesh, Kashmir)",
      quantity: 40.0, currentStage: "PROCESSING", currentCustodianId: "usr_4",
      qualityStatus: "PENDING", riskScore: 44, riskState: "MEDIUM", verificationState: "UNVERIFIED",
    },
  });

  await Promise.all([
    db.batchEvent.create({ data: { batchId: "batch_6", type: "PROCESSING", data: { method: "BLEND", inputs: ["HC-2026-K7QM2X", "HC-2026-R4NBTY"] }, actorId: "usr_4", timestamp: new Date("2026-04-20T09:00:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_6", type: "NOTE", data: { note: "Blend recorded before batch_2 lab panel returned" }, actorId: "usr_4", timestamp: new Date("2026-04-20T09:05:00Z") } }),
    db.batchEvent.create({ data: { batchId: "batch_6", type: "SHIPMENT", data: { destination: "Mumbai DC" }, actorId: "usr_4", timestamp: new Date("2026-04-24T07:00:00Z") } }),

    // MERGE, not SPLIT: two sources feeding one target. `ratio` is each input's
    // share of the blend, and the two sum to 1.0 — a set that does not is
    // itself a mass-balance finding.
    db.batchLineage.create({ data: { sourceBatchId: "batch_1", targetBatchId: "batch_6", relationship: "MERGE", ratio: 0.6 } }),
    db.batchLineage.create({ data: { sourceBatchId: "batch_2", targetBatchId: "batch_6", relationship: "MERGE", ratio: 0.4 } }),

    db.custodyTransfer.create({ data: { batchId: "batch_6", fromCustodianId: "usr_4", toCustodianId: "usr_5", fromRole: "PROCESSOR", toRole: "DISTRIBUTOR", timestamp: new Date("2026-04-24T07:00:00Z") } }),

    db.alert.create({ data: { batchId: "batch_6", type: "TRACEABILITY_GAP", severity: "MEDIUM", message: "Blend includes batch HC-2026-R4NBTY, which had no completed lab panel at the time of merging", status: "NEW" } }),

    db.riskScore.create({ data: { batchId: "batch_6", overall: 44, state: "MEDIUM", labRisk: 50, traceabilityRisk: 60, supplierHistoryRisk: 25, geoTemporalRisk: 15, processSensorRisk: 20, reasons: [{ rule: "UNTESTED_INPUT", description: "Merged input HC-2026-R4NBTY has quality status PENDING", severity: "MEDIUM", weight: 0.3, score: 60 }], modelVersion: "rule_v1" } }),
  ]);
  console.log("Created blend batch, lineage, and its alert");

  // ── Shipments ────────────────────────────────────────────────────────────
  //
  // Shipment has a batchId but no relation to Batch in the schema, so it is
  // joined in application code. Temperature is carried because a cold-chain
  // excursion is one of the process-sensor risk inputs.
  await Promise.all([
    db.shipment.create({ data: { batchId: "batch_4", fromLocation: "Sundarban, West Bengal", toLocation: "Kolkata DC", carrier: "Coastline Express", departedAt: new Date("2026-06-19T06:00:00Z"), arrivedAt: new Date("2026-06-20T18:20:00Z"), status: "DELIVERED", temperature: 22.4 } }),
    db.shipment.create({ data: { batchId: "batch_6", fromLocation: "Amrit Processing, Indore", toLocation: "Mumbai DC", carrier: "Kaveri Logistics", departedAt: new Date("2026-04-24T07:00:00Z"), status: "IN_TRANSIT", temperature: 26.1 } }),
    db.shipment.create({ data: { batchId: "batch_1", fromLocation: "Amrit Processing, Indore", toLocation: "Bhopal Retail Hub", carrier: "Northstar Freight", departedAt: new Date("2026-04-03T05:30:00Z"), status: "DELAYED", temperature: 34.8 } }),
  ]);
  console.log("Created shipments");

  // ── Quality tests ────────────────────────────────────────────────────────
  await Promise.all([
    db.qualityTest.create({ data: { batchId: "batch_1", organisationId: "org_3", testType: "MOISTURE", result: 18.2, unit: "%", passed: true, labName: "NBB Lab", testedAt: new Date("2026-03-22T14:00:00Z") } }),
    db.qualityTest.create({ data: { batchId: "batch_1", organisationId: "org_3", testType: "HMF", result: 8.5, unit: "mg/kg", passed: true, labName: "NBB Lab", testedAt: new Date("2026-03-22T14:30:00Z") } }),
    db.qualityTest.create({ data: { batchId: "batch_1", organisationId: "org_3", testType: "PROLINE", result: 285, unit: "mg/kg", passed: true, labName: "NBB Lab", testedAt: new Date("2026-03-23T10:00:00Z") } }),
    db.qualityTest.create({ data: { batchId: "batch_1", organisationId: "org_3", testType: "C4_SUGAR", result: 3.1, unit: "%", passed: true, labName: "NBB Lab", testedAt: new Date("2026-03-23T11:00:00Z") } }),

    db.qualityTest.create({ data: { batchId: "batch_3", organisationId: "org_3", testType: "MOISTURE", result: 24.1, unit: "%", passed: false, labName: "NBB Lab", testedAt: new Date("2026-05-05T11:00:00Z") } }),
    db.qualityTest.create({ data: { batchId: "batch_3", organisationId: "org_3", testType: "C4_SUGAR", result: 11.8, unit: "%", passed: false, labName: "NBB Lab", testedAt: new Date("2026-05-05T11:30:00Z") } }),

    db.qualityTest.create({ data: { batchId: "batch_4", organisationId: "org_3", testType: "MOISTURE", result: 17.4, unit: "%", passed: true, labName: "NBB Lab", testedAt: new Date("2026-06-08T13:00:00Z") } }),
    db.qualityTest.create({ data: { batchId: "batch_4", organisationId: "org_3", testType: "HMF", result: 5.2, unit: "mg/kg", passed: true, labName: "NBB Lab", testedAt: new Date("2026-06-08T13:30:00Z") } }),
    db.qualityTest.create({ data: { batchId: "batch_4", organisationId: "org_3", testType: "POLLEN_DNA", result: 97, unit: "% match", passed: true, labName: "NBB Lab", testedAt: new Date("2026-06-09T10:00:00Z") } }),
  ]);
  console.log("Created quality tests");

  // ── Risk scores ──────────────────────────────────────────────────────────
  //
  // These are the persisted output of a previous engine run. They should agree
  // with what `calculateRiskScore` produces today; POST /api/batches/:id/risk
  // recomputes and overwrites them.
  await Promise.all([
    db.riskScore.create({ data: { batchId: "batch_1", overall: 15, state: "LOW", labRisk: 5, traceabilityRisk: 10, supplierHistoryRisk: 20, geoTemporalRisk: 8, processSensorRisk: 12, reasons: [{ rule: "ALL_CLEAR", description: "No risk factors detected", severity: "LOW", weight: 1, score: 15 }], modelVersion: "rule_v1" } }),
    db.riskScore.create({ data: { batchId: "batch_3", overall: 68, state: "HIGH", labRisk: 90, traceabilityRisk: 55, supplierHistoryRisk: 30, geoTemporalRisk: 40, processSensorRisk: 20, reasons: [{ rule: "LAB_FAILURE", description: "Moisture 24.1% exceeds the 20% limit; C4 sugar 11.8% indicates added cane syrup", severity: "HIGH", weight: 0.4, score: 90 }, { rule: "CUSTODY_GAP", description: "No custody transfer recorded between harvest and lab receipt", severity: "MEDIUM", weight: 0.2, score: 55 }], modelVersion: "rule_v1" } }),
    db.riskScore.create({ data: { batchId: "batch_4", overall: 8, state: "LOW", labRisk: 2, traceabilityRisk: 0, supplierHistoryRisk: 15, geoTemporalRisk: 10, processSensorRisk: 10, reasons: [{ rule: "ALL_CLEAR", description: "Complete custody chain and passing lab panel", severity: "LOW", weight: 1, score: 8 }], modelVersion: "rule_v1" } }),
    db.riskScore.create({ data: { batchId: "batch_5", overall: 22, state: "LOW", labRisk: 0, traceabilityRisk: 30, supplierHistoryRisk: 20, geoTemporalRisk: 25, processSensorRisk: 15, reasons: [{ rule: "MISSING_EVENTS", description: "Lab panel not yet submitted for a batch at COLLECTION", severity: "LOW", weight: 0.2, score: 30 }], modelVersion: "rule_v1" } }),
  ]);
  console.log("Created risk scores");

  // ── Alerts ───────────────────────────────────────────────────────────────
  await Promise.all([
    db.alert.create({ data: { batchId: "batch_3", type: "LAB_FAILURE", severity: "HIGH", message: "Moisture content 24.1% exceeds the 20% limit for honey purity", status: "NEW" } }),
    db.alert.create({ data: { batchId: "batch_3", type: "ADULTERATION_SUSPECTED", severity: "HIGH", message: "C4 sugar at 11.8% is consistent with cane or corn syrup addition", status: "NEW" } }),
    db.alert.create({ data: { batchId: "batch_3", type: "CUSTODY_GAP", severity: "MEDIUM", message: "No custody transfer recorded between harvest and lab receipt", status: "ACKNOWLEDGED" } }),
    db.alert.create({ data: { batchId: "batch_5", type: "MISSING_EVENTS", severity: "LOW", message: "Batch has been at COLLECTION for over 60 days without a lab submission", status: "NEW" } }),
  ]);
  console.log("Created alerts");

  // ── Incident and investigation ───────────────────────────────────────────
  const incident = await db.incident.create({
    data: {
      title: "Suspected syrup adulteration, Karnataka",
      description:
        "Batch HC-2026-W9HJ5D shows elevated moisture (24.1%) together with C4 sugar at 11.8%. The combination points to syrup addition rather than storage error, and the batch has no recorded custody chain.",
      severity: "HIGH",
      status: "INVESTIGATING",
      batchCount: 1,
    },
  });
  await db.investigationCase.create({
    data: {
      incidentId: incident.id,
      assignedToId: "usr_7",
      status: "IN_PROGRESS",
      findings:
        "Moisture 24.1% (limit 20%) and C4 sugar 11.8% (limit 7%). Awaiting a second isotope-ratio panel before referral.",
    },
  });
  console.log("Created incident and investigation");

  // ── QR tokens ────────────────────────────────────────────────────────────
  //
  // Real signed tokens, so scanning a seeded label actually verifies. Each is
  // minted for its own batch: a token is bound to the batch id inside its MAC,
  // so pasting one batch's token onto another jar reads as BATCH_MISMATCH.
  const tokenTargets = batches.map((batch) => ({
    batchId: batch.id,
    publicCode: batch.publicCode,
  }));
  const qrTokens = await Promise.all(
    tokenTargets.map((target) =>
      db.qRToken.create({
        data: {
          batchId: target.batchId,
          token: issueQRToken(target.batchId, target.publicCode),
          expiresAt: new Date("2028-01-01T00:00:00Z"),
        },
      }),
    ),
  );

  // A superseded label for batch_3, so the REVOKED path has something to show.
  await db.qRToken.create({
    data: {
      batchId: "batch_3",
      token: issueQRToken("batch_3", "HC-2026-W9HJ5D"),
      revoked: true,
      expiresAt: new Date("2028-01-01T00:00:00Z"),
    },
  });
  console.log(`Created ${qrTokens.length + 1} QR tokens`);

  // ── Blockchain anchors ───────────────────────────────────────────────────
  //
  // No chain is configured, so these are local integrity proofs: the Merkle
  // root of the batch's event log, recomputed on verification to detect later
  // edits. chain is SIMULATED and txHash/blockNumber stay null rather than
  // carrying invented values that would read as a real on-chain receipt.
  const anchoredBatchIds = ["batch_1", "batch_4"];
  for (const batchId of anchoredBatchIds) {
    const batchEvents = await db.batchEvent.findMany({
      where: { batchId },
      select: { type: true, data: true, timestamp: true },
    });
    await db.blockchainAnchor.create({
      data: {
        batchId,
        eventType: "BATCH_EVENTS",
        eventBundleHash: hashBatchEvents(batchEvents),
        status: "ANCHORED",
        chain: "SIMULATED",
        txHash: null,
        blockNumber: null,
        signerIdentity: "usr_6",
        anchoredAt: new Date("2026-06-25T12:00:00Z"),
      },
    });
  }
  console.log(`Created ${anchoredBatchIds.length} blockchain anchors (simulated)`);

  console.log("\nSeed complete.");
  console.log(`  organisations ${orgs.length}  users ${users.length}  farms ${farms.length}`);
  console.log(`  hives ${hives.length}  harvests ${harvests.length}  batches ${batches.length}  events ${events.length}`);
  console.log(`\nSign in at /login with any seeded email and password "${DEMO_PASSWORD}":`);
  for (const user of userSeeds) {
    console.log(`  ${user.role.padEnd(13)} ${user.email}`);
  }
  console.log("\nScan-verify a label without signing in:");
  for (const token of qrTokens.slice(0, 2)) {
    const batch = batches.find((b) => b.id === token.batchId)!;
    console.log(`  /verify/${batch.publicCode}?t=${token.token}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
