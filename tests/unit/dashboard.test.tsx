import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HoneypotList } from "@/components/HoneypotList";
import { ThreatFeed } from "@/components/ThreatFeed";
import type { Honeypot, ThreatReport } from "@/lib/types";

const HONEYPOTS: Honeypot[] = [
  {
    id: "1",
    address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    network: "local",
    type: "Reentrancy",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  },
];

const REPORTS: ThreatReport[] = [
  {
    id: "r1",
    eventId: "e1",
    summary: "Reentrant call loop detected.",
    severity: "HIGH",
    vector: "Reentrancy",
    createdAt: new Date().toISOString(),
  },
];

describe("dashboard components", () => {
  it("HoneypotList renders the honeypot type and a short address", () => {
    const html = renderToStaticMarkup(<HoneypotList honeypots={HONEYPOTS} />);
    expect(html).toContain("Reentrancy");
    expect(html).toContain("0xabcd…abcd");
    expect(html).toContain("ACTIVE");
  });

  it("HoneypotList shows an empty state with no honeypots", () => {
    const html = renderToStaticMarkup(<HoneypotList honeypots={[]} />);
    expect(html).toContain("No honeypots deployed");
  });

  it("ThreatFeed renders severity and summary", () => {
    const html = renderToStaticMarkup(<ThreatFeed reports={REPORTS} />);
    expect(html).toContain("HIGH");
    expect(html).toContain("Reentrant call loop detected.");
    expect(html).toContain("Reentrancy");
  });

  it("ThreatFeed shows an empty state with no reports", () => {
    const html = renderToStaticMarkup(<ThreatFeed reports={[]} />);
    expect(html).toContain("No threat reports yet");
  });
});
