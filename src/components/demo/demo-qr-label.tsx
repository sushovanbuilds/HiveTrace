"use client";

import { useState } from "react";
import { qrToSvg } from "@/lib/qr/svg";
import { Icon } from "@/components/icons";

export function DemoQrLabel({ code }: { code: string }) {
  // The verification URL needs window.location.origin, which only exists in
  // the browser. Derive it during render (not in an effect) so the server
  // prerender stays empty and hydration matches.
  const [derived, setDerived] = useState<{ code: string; url: string } | null>(null);
  if (derived?.code !== code) {
    setDerived(
      typeof window === "undefined"
        ? null
        : { code, url: `${window.location.origin}/verify/${encodeURIComponent(code)}` },
    );
  }

  if (!derived) return null;
  const url = derived.url;
  const svg = qrToSvg(url, { pixelSize: 240, title: `Demo verification QR for ${code}` });
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <div className="mt-6 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 text-left">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <img src={source} width={144} height={144} alt={`QR code for batch ${code}`} className="rounded-lg bg-white p-2" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-body-md font-semibold text-on-surface">
            <Icon name="qr_code_2" className="text-primary" /> Demo QR label ready
          </p>
          <p className="mt-1 text-metadata-sm text-on-surface-variant">
            This QR contains the batch&apos;s verification URL. Scan it from this browser&apos;s demo session to open the trace.
          </p>
          <a href={source} download={`${code}-label.svg`} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 text-metadata-sm font-semibold text-on-surface">
            <Icon name="download" className="text-[18px]" /> Download label
          </a>
        </div>
      </div>
    </div>
  );
}
