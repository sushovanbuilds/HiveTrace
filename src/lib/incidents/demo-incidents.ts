/**
 * Sample incident cases shared by the Investigations list and detail pages.
 *
 * Rendered when the incident database is unreachable. The detail record is the
 * single source of truth; the list page derives its rows from it so titles,
 * severities, statuses and dates cannot drift apart.
 */

export type DemoIncidentDetail = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  batchCount: number;
  createdAt: Date;
  investigation: { id: string; status: string; findings: string | null; decision: string | null; openedAt: Date } | null;
  alerts: Array<{ id: string; severity: string; message: string; createdAt: Date }>;
};

const DEMO_DETAILS: Record<string, DemoIncidentDetail> = {
  inc_1084: {
    id: "inc_1084",
    title: "Duplicate QR & Custody Gap",
    description:
      "The same label code was scanned from 3 networks within 40 minutes across two states. Sample case shown while the incident database is unreachable.",
    severity: "HIGH",
    status: "INVESTIGATING",
    batchCount: 3,
    createdAt: new Date("2026-08-29T08:12:00"),
    investigation: {
      id: "inv_1084",
      status: "IN_PROGRESS",
      findings: "Two of the three scans came from the same device fingerprint; the third originated at a distributor node with no custody handover on record.",
      decision: null,
      openedAt: new Date("2026-08-29T08:20:00"),
    },
    alerts: [
      { id: "al_1084_1", severity: "HIGH", message: "Same QR scanned from 3 distinct networks within 40m", createdAt: new Date("2026-08-29T08:12:00") },
      { id: "al_1084_2", severity: "HIGH", message: "Custody handover missing for one scan leg", createdAt: new Date("2026-08-29T08:15:00") },
      { id: "al_1084_3", severity: "MEDIUM", message: "Scan geolocation spans two states", createdAt: new Date("2026-08-29T08:18:00") },
    ],
  },
  inc_1082: {
    id: "inc_1082",
    title: "Unverified Node Transfer",
    description:
      "Custody transfer accepted with no prior collection event recorded for the batch. Sample case shown while the incident database is unreachable.",
    severity: "HIGH",
    status: "OPEN",
    batchCount: 1,
    createdAt: new Date("2026-08-28T17:40:00"),
    investigation: null,
    alerts: [
      { id: "al_1082_1", severity: "HIGH", message: "Custody accepted with no collection event on record", createdAt: new Date("2026-08-28T17:40:00") },
      { id: "al_1082_2", severity: "MEDIUM", message: "Transferring node certificate not yet verified", createdAt: new Date("2026-08-28T17:42:00") },
    ],
  },
  inc_1081: {
    id: "inc_1081",
    title: "Anomalous Growth in Estimated Production",
    description:
      "Hive E-880 reported 3× expected volume with no corresponding floral bloom data. Sample case shown while the incident database is unreachable.",
    severity: "MEDIUM",
    status: "RESOLVED",
    batchCount: 2,
    createdAt: new Date("2026-08-20T10:00:00"),
    investigation: {
      id: "inv_1081",
      status: "RESOLVED",
      findings: "Keeper logbook showed a merged entry covering two hives; yield split corrected and records updated.",
      decision: "SUPPLIER_ERROR",
      openedAt: new Date("2026-08-20T10:30:00"),
    },
    alerts: [
      { id: "al_1081_1", severity: "MEDIUM", message: "Reported volume 3× expected for hive E-880", createdAt: new Date("2026-08-20T10:00:00") },
      { id: "al_1081_2", severity: "LOW", message: "No floral bloom record matches the period", createdAt: new Date("2026-08-20T10:05:00") },
    ],
  },
  inc_044: {
    id: "inc_044",
    title: "Packaging Reuse Across Vendors",
    description:
      "Recurring supplier contract sealed with reused packaging jute batch identical hash. Sample case shown while the incident database is unreachable.",
    severity: "CRITICAL",
    status: "CLOSED",
    batchCount: 8,
    createdAt: new Date("2026-08-11T09:30:00"),
    investigation: {
      id: "inv_044",
      status: "RESOLVED",
      findings: "Vendor confirmed jute batch reuse across contracts; supplier contract suspended pending re-certification.",
      decision: "SUPPLIER_ERROR",
      openedAt: new Date("2026-08-11T10:00:00"),
    },
    alerts: [
      { id: "al_044_1", severity: "CRITICAL", message: "Identical packaging hash across 8 batches", createdAt: new Date("2026-08-11T09:30:00") },
      { id: "al_044_2", severity: "HIGH", message: "Supplier contract flagged for re-certification", createdAt: new Date("2026-08-11T09:35:00") },
    ],
  },
};

const DEMO_DETAIL_047: DemoIncidentDetail = {
  id: "inc_047",
  title: "Temperature Excursion During Transit",
  description:
    "Batch WB-PUR-2026-001 recorded a storage temperature above 38°C for 4 consecutive hours during the Purulia → Kolkata cold-chain leg. Sensory analysis flagged caramelisation risk; re-verification requested by downstream lab.",
  severity: "MEDIUM",
  status: "INVESTIGATING",
  batchCount: 1,
  createdAt: new Date("2026-08-27T06:15:00"),
  investigation: {
    id: "inv_047",
    status: "IN_PROGRESS",
    findings: "Temperature logger timestamp gap of 7 minutes detected at node BLR-JN3. Physical unit shows no damage; likely logger sleep timeout.",
    decision: null,
    openedAt: new Date("2026-08-27T06:20:00"),
  },
  alerts: [
    { id: "al_1", severity: "HIGH", message: "Storage temp > 38°C sustained for 4h", createdAt: new Date("2026-08-27T06:10:00") },
    { id: "al_2", severity: "HIGH", message: "Sensor heartbeat gap detected (7m)", createdAt: new Date("2026-08-27T06:12:00") },
    { id: "al_3", severity: "MEDIUM", message: "Reroute suggested — alternate cold-chain node", createdAt: new Date("2026-08-27T06:14:00") },
    { id: "al_4", severity: "LOW", message: "Downstream lab requested re-verification", createdAt: new Date("2026-08-28T09:00:00") },
  ],
};

/** Every sample case, including the standalone inc_047. */
export const DEMO_INCIDENT_DETAILS: Record<string, DemoIncidentDetail> = {
  ...DEMO_DETAILS,
  inc_047: DEMO_DETAIL_047,
};

/** Fields only the list view needs, keyed by incident id. */
const ROW_FIELDS: Record<string, { description: string; alertCount: number }> = {
  inc_1084: { description: "The same label code was scanned from 3 networks within 40 minutes across two states.", alertCount: 12 },
  inc_1082: { description: "Custody transfer accepted with no prior collection event recorded for the batch.", alertCount: 5 },
  inc_047: { description: "Transit temperature exceeded 38°C for 4 hours on the Kolkata cold-chain run.", alertCount: 18 },
  inc_1081: { description: "Hive E-880 reported 3× expected volume with no corresponding floral bloom data.", alertCount: 6 },
  inc_044: { description: "Recurring supplier contract sealed with reused packaging jute batch identical hash.", alertCount: 8 },
};

/** Canonical list order, as previously rendered by the list page. */
const ROW_ORDER = ["inc_1084", "inc_1082", "inc_047", "inc_1081", "inc_044"] as const;

export type DemoIncidentRow = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  batchCount: number;
  alertCount: number;
  createdAt: Date;
};

/** List rows derived from the shared details. */
export function getDemoIncidentRows(): DemoIncidentRow[] {
  return ROW_ORDER.map((id) => {
    const detail = DEMO_INCIDENT_DETAILS[id];
    const fields = ROW_FIELDS[id];
    return {
      id: detail.id,
      title: detail.title,
      description: fields.description,
      severity: detail.severity,
      status: detail.status,
      batchCount: detail.batchCount,
      alertCount: fields.alertCount,
      createdAt: detail.createdAt,
    };
  });
}

/** Detail record for one sample case, or null when unknown. */
export function getDemoIncidentDetail(id: string): DemoIncidentDetail | null {
  return DEMO_INCIDENT_DETAILS[id] ?? null;
}
