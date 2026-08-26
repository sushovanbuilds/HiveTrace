import { beforeAll, expect, it } from "vitest";

const BASE = "http://localhost";

type RouteModule = {
  GET?: (request: Request) => Promise<Response>;
  POST?: (request: Request) => Promise<Response>;
};

async function callHandler(
  mod: RouteModule,
  fn: "GET" | "POST",
  url: string,
  init?: RequestInit,
) {
  const handler = mod[fn];
  if (!handler) throw new Error(`No ${fn} handler exported`);
  return handler(new Request(url, init));
}

const ADMIN_KEY = "test-admin-key-p2-02";
const NETWORK = "local-p2-02";

let addressSeq = 0;
function nextAddress() {
  addressSeq += 1;
  // deterministic pad to 40 hex chars
  const hex = addressSeq.toString(16).padStart(40, "0");
  return `0x${hex}`;
}

async function reachable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/lib/db");
    await db.config.count();
    return true;
  } catch {
    return false;
  }
}

beforeAll(() => {
  process.env.ADMIN_API_KEY = ADMIN_KEY;
});

it("GET /api/honeypots returns a JSON array filtered by network", async (ctx) => {
  if (!(await reachable())) return ctx.skip();
  const { GET } = await import("@/app/api/honeypots/route");
  const res = await callHandler({ GET }, "GET", `${BASE}/api/honeypots?network=${NETWORK}`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.every((h: { network: string }) => h.network === NETWORK)).toBe(true);
}, 10_000);

it("POST /api/honeypots requires admin auth and creates a honeypot", async (ctx) => {
  if (!(await reachable())) return ctx.skip();

  const { GET, POST } = await import("@/app/api/honeypots/route");
  const { db } = await import("@/lib/db");
  const address = nextAddress();

  // No auth -> 401
  const unauthorized = await callHandler({ POST }, "POST", `${BASE}/api/honeypots`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, type: "Reentrancy", network: NETWORK }),
  });
  expect(unauthorized.status).toBe(401);

  // With auth -> 201
  const created = await callHandler({ POST }, "POST", `${BASE}/api/honeypots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ADMIN_KEY}`,
    },
    body: JSON.stringify({ address, type: "Reentrancy", network: NETWORK }),
  });
  expect(created.status).toBe(201);
  const createdBody = await created.json();
  expect(createdBody.address).toBe(address);
  expect(createdBody.status).toBe("ACTIVE");

  // Listed under its network
  const list = await callHandler({ GET }, "GET", `${BASE}/api/honeypots?network=${NETWORK}`);
  const listBody = await list.json();
  expect(listBody.some((h: { id: string }) => h.id === createdBody.id)).toBe(true);

  // Duplicate address -> 409
  const dup = await callHandler({ POST }, "POST", `${BASE}/api/honeypots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ADMIN_KEY}`,
    },
    body: JSON.stringify({ address, type: "Reentrancy", network: NETWORK }),
  });
  expect(dup.status).toBe(409);

  await db.honeypot.deleteMany({ where: { network: NETWORK } });
}, 10_000);

it("GET /api/reports validates limit and returns a JSON array", async (ctx) => {
  if (!(await reachable())) return ctx.skip();
  const { GET } = await import("@/app/api/reports/route");

  const bad = await callHandler({ GET }, "GET", `${BASE}/api/reports?limit=9999`);
  expect(bad.status).toBe(400);

  const ok = await callHandler({ GET }, "GET", `${BASE}/api/reports?limit=10`);
  expect(ok.status).toBe(200);
  const body = await ok.json();
  expect(Array.isArray(body)).toBe(true);
}, 10_000);
