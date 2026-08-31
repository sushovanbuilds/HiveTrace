"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

export default function VerifyScannerPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [manual, setManual] = useState(false);

  // Support a deep link used by the demo QR flow: /verify?batch=HC-2026-00124
  // forwards straight to the batch verification route.
  useEffect(() => {
    const batch = new URLSearchParams(window.location.search).get("batch");
    if (batch) {
      router.replace(`/verify/${encodeURIComponent(batch.trim().toUpperCase())}`);
    }
  }, [router]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) router.push(`/verify/${encodeURIComponent(c)}`);
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-inverse-surface font-sans text-surface-container-lowest">
      {/* Simulated camera feed */}
      <div className="absolute inset-0 z-0">
        <div className="h-full w-full bg-[radial-gradient(circle_at_35%_30%,#3a2410_0%,#241505_45%,#120a02_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,184,0,0.18)_0%,transparent_40%,rgba(255,184,0,0.08)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-inverse-surface/80 via-transparent to-inverse-surface/95" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-[20px] py-4">
        <button
          type="button"
          aria-label="Close scanner"
          onClick={() => router.push("/")}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-surface-container-highest/20 text-white backdrop-blur-md transition-colors hover:bg-surface-container-highest/30"
        >
          <Icon name="close" />
        </button>
        <div className="text-label-caps tracking-[0.08em] text-primary-container">HiveTrace</div>
        <div className="w-12" aria-hidden />
      </header>

      <main className="relative z-10 flex flex-grow flex-col items-center justify-center px-[20px]">
        <div className="mb-8 w-full max-w-sm text-center">
          <h1 className="text-headline-lg-mobile font-semibold tracking-tight text-white drop-shadow-md">
            Verify Your Honey
          </h1>
          <p className="mt-1 text-body-md text-secondary-fixed-dim drop-shadow">
            Align the QR code within the frame to verify its journey.
          </p>
        </div>

        {/* Viewfinder */}
        <div className="relative mx-auto mb-8 h-64 w-64">
          <div className="absolute inset-0 rounded-2xl bg-white/5 backdrop-blur-[2px]" />
          <div className="absolute left-0 top-0 h-12 w-12 corner-pulse rounded-tl-xl border-l-4 border-t-4 border-primary-container" />
          <div className="absolute right-0 top-0 h-12 w-12 corner-pulse rounded-tr-xl border-r-4 border-t-4 border-primary-container" />
          <div className="absolute bottom-0 left-0 h-12 w-12 corner-pulse rounded-bl-xl border-b-4 border-l-4 border-primary-container" />
          <div className="absolute bottom-0 right-0 h-12 w-12 corner-pulse rounded-br-xl border-b-4 border-r-4 border-primary-container" />
          <div className="scan-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent shadow-[0_0_8px_rgba(255,184,0,0.8)]" />
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <Icon name="qr_code_scanner" className="text-4xl text-white" />
          </div>
          {/* Fake QR target */}
          <div className="absolute inset-0 m-auto flex h-28 w-28 items-center justify-center">
            <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[3px] rounded-md bg-white/10 p-[6px]">
              {[
                [1, 1, 0, 1, 1],
                [0, 1, 0, 1, 0],
                [1, 1, 1, 1, 0],
                [1, 0, 1, 0, 1],
                [0, 1, 0, 1, 1],
              ]
                .flat()
                .slice(0, 25)
                .map((v, i) => (
                  <span key={i} className={v ? "rounded-[2px] bg-white/80" : ""} />
                ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex w-full max-w-sm flex-col items-center pb-8 text-center">
          {manual ? (
            <form onSubmit={submit} className="w-full">
              <div className="mb-3 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 backdrop-blur-md">
                <Icon name="qr_code" className="text-primary-container" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter batch code (e.g. HC-2026-00124)"
                  className="h-12 w-full bg-transparent font-mono text-body-md tracking-wider text-white outline-none placeholder:text-surface-variant/70"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="flex h-14 w-full max-w-[280px] items-center justify-center gap-2 rounded-full bg-primary-container font-label-caps tracking-wider text-on-primary-container shadow-lg transition-all hover:bg-inverse-primary hover:shadow-xl active:scale-95"
              >
                <Icon name="verified" fill className="text-[20px]" />
                VERIFY BATCH
              </button>
            </form>
          ) : (
            <>
              <p className="mb-4 px-4 text-body-md text-surface-variant">
                Scan the QR code on your HiveTrace label to view its complete journey.
              </p>
              <button
                type="button"
                onClick={() => router.push("/verify/HC-2026-00124")}
                className="flex h-14 w-full max-w-[280px] items-center justify-center gap-2 rounded-full bg-primary-container font-label-caps tracking-wider text-on-primary-container shadow-lg transition-all hover:bg-inverse-primary hover:shadow-xl active:scale-95"
              >
                <Icon name="qr_code" fill className="text-[20px]" />
                VERIFY BATCH
              </button>
              <button
                type="button"
                onClick={() => setManual(true)}
                className="mt-4 font-medium text-metadata-sm text-secondary-fixed-dim underline decoration-secondary-fixed-dim/50 underline-offset-4 transition-colors hover:text-white"
              >
                Enter Code Manually
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}