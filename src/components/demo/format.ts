import type { DemoBatch, DemoQuality, DemoRisk } from "@/lib/demo/types";
import type { PillTone } from "@/components/ui";

export function demoQualityPill(quality: DemoQuality): { tone: PillTone; label: string } {
  switch (quality) {
    case "PASSED":
      return { tone: "tertiary", label: "Quality Passed" };
    case "FAILED":
      return { tone: "error", label: "Quality Failed" };
    default:
      return { tone: "surface", label: "Awaiting QA" };
  }
}

export function demoRiskPill(risk: DemoRisk): { tone: PillTone; label: string; dot: string } {
  switch (risk) {
    case "HIGH":
      return { tone: "error", label: "High Risk", dot: "bg-error" };
    case "MEDIUM":
      return { tone: "warn", label: "Medium Risk", dot: "bg-primary" };
    default:
      return { tone: "tertiary", label: "Low Risk", dot: "bg-tertiary" };
  }
}

export function formatQty(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg} kg`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function shareKeys(demo: DemoBatch): string[] {
  return [...new Set(demo.events.map((e) => e.role))];
}

export const ROLE_ICON: Record<string, string> = {
  BEEKEEPER: "hive",
  ANALYST: "science",
  PROCESSOR: "factory",
  DISTRIBUTOR: "local_shipping",
};
