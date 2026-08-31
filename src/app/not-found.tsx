import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-bg px-6">
      <div className="relative flex flex-col items-center text-center">
        <span className="relative inline-flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-3xl bg-primary-container/20" />
          <Icon name="hive" fill className="h-12 w-12 text-primary" />
        </span>
        <p className="mt-6 text-label-caps uppercase tracking-[0.24em] text-surface-tint">404 · Lost swarm</p>
        <h1 className="mt-2 text-headline-lg tracking-tight text-on-surface">
          This page drifted off the hive
        </h1>
        <p className="mt-2 max-w-sm text-body-md text-on-surface-variant">
          The route you followed has no batch — check the label code or head back to the colony dashboard.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-body-md font-medium text-on-primary shadow-sm transition-all active:scale-[0.98]"
          >
            <Icon name="dashboard" className="text-[18px]" /> Back to dashboard
          </Link>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-5 py-2.5 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-low"
          >
            <Icon name="qr_code_scanner" className="text-[18px]" /> Scan a label
          </Link>
        </div>

        <div className="mt-12 flex items-center gap-3 text-metadata-sm text-on-surface-variant">
          {["HARVEST", "EXTRACTION", "TEST", "CUSTODY", "VERIFY"].map((s) => (
            <span key={s} className="rounded-full bg-surface-container px-3 py-1 tracking-wider">
              {s}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}