import type { DemoRole } from "@/lib/demo/types";

export interface DemoNavItem {
  label: string;
  href: string;
  icon: string;
  match: (p: string) => boolean;
}

/**
 * Role-specific demo navigation. Each demo role sees only the destinations it
 * needs. Labels match the brief exactly; destinations point at the role home,
 * shared existing pages (/batches, /quality, /genealogy, /reports, ...) and the
 * shared trace view — so nothing 404s while each workspace stays focused.
 */
export const DEMO_NAV: Record<DemoRole, DemoNavItem[]> = {
  BEEKEEPER: [
    { label: "Home", href: "/keeper", icon: "dashboard", match: (p) => p === "/keeper" },
    { label: "Hives", href: "/hives", icon: "hive", match: (p) => p.startsWith("/hives") },
    { label: "Harvest", href: "/keeper#harvest", icon: "inventory_2", match: (p) => p === "/keeper" },
    { label: "Batches", href: "/trace", icon: "inventory_2", match: (p) => p.startsWith("/trace") },
    { label: "Smart Insights", href: "/keeper#insights", icon: "auto_awesome", match: (p) => p === "/keeper" },
    { label: "More", href: "/settings", icon: "more_horiz", match: (p) => p.startsWith("/settings") },
  ],
  ANALYST: [
    { label: "Overview", href: "/analyst", icon: "dashboard", match: (p) => p === "/analyst" },
    { label: "Samples", href: "/trace", icon: "science", match: (p) => p.startsWith("/trace") },
    { label: "Tests", href: "/quality", icon: "biotech", match: (p) => p.startsWith("/quality") },
    { label: "Quality", href: "/analyst#quality", icon: "verified", match: (p) => p === "/analyst" },
    { label: "Batches", href: "/trace", icon: "inventory_2", match: (p) => p.startsWith("/trace") },
    { label: "Anomalies", href: "/analyst#anomalies", icon: "warning", match: (p) => p === "/analyst" },
    { label: "Risk Center", href: "/risk-center", icon: "shield", match: (p) => p.startsWith("/risk-center") },
    { label: "Evidence", href: "/analyst#evidence", icon: "description", match: (p) => p === "/analyst" },
    { label: "Reports", href: "/reports", icon: "summarize", match: (p) => p.startsWith("/reports") },
  ],
  PROCESSOR: [
    { label: "Overview", href: "/processor", icon: "dashboard", match: (p) => p === "/processor" },
    { label: "Inbound", href: "/trace", icon: "move_down", match: (p) => p.startsWith("/trace") },
    { label: "Processing", href: "/processor#processing", icon: "factory", match: (p) => p === "/processor" },
    { label: "Packaging", href: "/processor#packaging", icon: "inventory_2", match: (p) => p === "/processor" },
    { label: "Genealogy", href: "/genealogy", icon: "account_tree", match: (p) => p.startsWith("/genealogy") },
    { label: "Dispatch", href: "/processor#packaging", icon: "local_shipping", match: (p) => p === "/processor" },
    { label: "Reports", href: "/reports", icon: "summarize", match: (p) => p.startsWith("/reports") },
  ],
  DISTRIBUTOR: [
    { label: "Overview", href: "/distributor", icon: "dashboard", match: (p) => p === "/distributor" },
    { label: "Shipments", href: "/distributor#shipments", icon: "local_shipping", match: (p) => p === "/distributor" },
    { label: "Tracking", href: "/distributor#tracking", icon: "radar", match: (p) => p === "/distributor" },
    { label: "Batches", href: "/trace", icon: "inventory_2", match: (p) => p.startsWith("/trace") },
    { label: "Map", href: "/distributor#map", icon: "map", match: (p) => p === "/distributor" },
    { label: "Exceptions", href: "/distributor#exceptions", icon: "warning", match: (p) => p === "/distributor" },
    { label: "Risk Center", href: "/risk-center", icon: "shield", match: (p) => p.startsWith("/risk-center") },
    { label: "Delivery", href: "/distributor#delivery", icon: "verified", match: (p) => p === "/distributor" },
    { label: "Reports", href: "/reports", icon: "summarize", match: (p) => p.startsWith("/reports") },
  ],
};

export const DEMO_MOBILE_NAV: Record<DemoRole, DemoNavItem[]> = {
  BEEKEEPER: [
    { label: "Home", href: "/keeper", icon: "dashboard", match: (p) => p === "/keeper" },
    { label: "Harvest", href: "/keeper#harvest", icon: "inventory_2", match: (p) => p === "/keeper" },
    { label: "Batches", href: "/trace", icon: "inventory_2", match: (p) => p.startsWith("/trace") },
    { label: "Trace", href: "/trace", icon: "timeline", match: (p) => p.startsWith("/trace") },
  ],
  ANALYST: [
    { label: "Overview", href: "/analyst", icon: "dashboard", match: (p) => p === "/analyst" },
    { label: "Quality", href: "/analyst#quality", icon: "verified", match: (p) => p === "/analyst" },
    { label: "Batches", href: "/trace", icon: "inventory_2", match: (p) => p.startsWith("/trace") },
    { label: "Anomalies", href: "/analyst#anomalies", icon: "warning", match: (p) => p === "/analyst" },
    { label: "Risk", href: "/risk-center", icon: "shield", match: (p) => p.startsWith("/risk-center") },
  ],
  PROCESSOR: [
    { label: "Overview", href: "/processor", icon: "dashboard", match: (p) => p === "/processor" },
    { label: "Processing", href: "/processor#processing", icon: "factory", match: (p) => p === "/processor" },
    { label: "Batches", href: "/trace", icon: "inventory_2", match: (p) => p.startsWith("/trace") },
    { label: "Genealogy", href: "/genealogy", icon: "account_tree", match: (p) => p.startsWith("/genealogy") },
  ],
  DISTRIBUTOR: [
    { label: "Overview", href: "/distributor", icon: "dashboard", match: (p) => p === "/distributor" },
    { label: "Shipments", href: "/distributor#shipments", icon: "local_shipping", match: (p) => p === "/distributor" },
    { label: "Batches", href: "/trace", icon: "inventory_2", match: (p) => p.startsWith("/trace") },
    { label: "Delivery", href: "/distributor#delivery", icon: "verified", match: (p) => p === "/distributor" },
    { label: "Risk", href: "/risk-center", icon: "shield", match: (p) => p.startsWith("/risk-center") },
  ],
};
