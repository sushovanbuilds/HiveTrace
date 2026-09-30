"use client";

import jsQR from "jsqr";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";

type ScanState =
  | "idle" // camera not requested yet
  | "requesting" // waiting on getUserMedia
  | "scanning" // live viewfinder
  | "success" // a HiveTrace label was decoded
  | "failure" // decoded QR is not a HiveTrace label
  | "unavailable" // no camera / permission denied
  | "manual"; // manual batch-code entry

/** Minimum gap between decode attempts so a 720p frame isn't hashed every rAF tick. */
const DECODE_INTERVAL_MS = 250;

function targetForScannedValue(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  // Labels issued by HiveTrace contain an absolute /verify/:code URL. Only
  // retain the path and query: a scanned label must never navigate users to an
  // arbitrary external domain.
  try {
    const url = new URL(raw, window.location.origin);
    const match = url.pathname.match(/^\/verify\/([^/]+)$/i);
    if (match?.[1]) {
      return `/verify/${encodeURIComponent(match[1].toUpperCase())}${url.search}`;
    }
    const batch = url.searchParams.get("batch");
    if (batch) return `/verify/${encodeURIComponent(batch.trim().toUpperCase())}`;
  } catch {
    // A bare public code is also accepted below.
  }

  const code = raw.toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{2,63}$/.test(code)
    ? `/verify/${encodeURIComponent(code)}`
    : null;
}

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastDecodeRef = useRef(0);
  const [state, setState] = useState<ScanState>("idle");
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopScanner, [stopScanner]);

  // Deep link used by the demo QR flow: /scan?batch=HC-2026-00124 forwards
  // straight to the batch verification route.
  useEffect(() => {
    const batch = searchParams.get("batch");
    if (batch?.trim()) {
      router.replace(`/verify/${encodeURIComponent(batch.trim().toUpperCase())}`);
    }
  }, [router, searchParams]);

  const startScanner = useCallback(async () => {
    // getUserMedia only exists in a secure context. Reaching the dev server on a
    // LAN IP over plain http (e.g. http://192.168.0.112:3000) is not secure, so
    // mediaDevices is undefined there — that is the usual "camera unavailable"
    // report on a phone, not a missing camera.
    const secure = typeof window !== "undefined" && window.isSecureContext;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      setMessage(
        secure
          ? "This device has no camera available for scanning. Enter the batch code manually instead."
          : "The camera needs a secure (HTTPS) connection. Open this page over https or on localhost, or enter the batch code manually.",
      );
      return;
    }

    setState("requesting");
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("The camera preview could not start.");
      video.srcObject = stream;
      await video.play();
      setState("scanning");

      const scanFrame = () => {
        const preview = videoRef.current;
        if (!preview || preview.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          frameRef.current = requestAnimationFrame(scanFrame);
          return;
        }
        const now = performance.now();
        if (now - lastDecodeRef.current < DECODE_INTERVAL_MS) {
          frameRef.current = requestAnimationFrame(scanFrame);
          return;
        }
        lastDecodeRef.current = now;

        const width = preview.videoWidth;
        const height = preview.videoHeight;
        if (!width || !height) {
          frameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          frameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        context.drawImage(preview, 0, 0, width, height);
        const result = jsQR(context.getImageData(0, 0, width, height).data, width, height, {
          inversionAttempts: "dontInvert",
        });
        if (result) {
          const target = targetForScannedValue(result.data);
          stopScanner();
          if (target) {
            setState("success");
            // A short beat so the success state is actually seen before navigating.
            window.setTimeout(() => router.push(target), 750);
          } else {
            setState("failure");
            setMessage("That QR code is not a HiveTrace label. Try another label, or enter the batch code manually.");
          }
          return;
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };

      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      stopScanner();
      const name = error instanceof DOMException ? error.name : "";
      setState("unavailable");
      setMessage(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Camera access was blocked. Allow camera access in your browser settings and try again — or enter the batch code manually."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No matching camera was found on this device. Enter the batch code manually instead."
            : "We could not open the camera on this device. Enter the batch code manually instead.",
      );
    }
  }, [router, stopScanner]);

  const goManual = useCallback(() => {
    stopScanner();
    setMessage(null);
    setInvalid(false);
    setState("manual");
  }, [stopScanner]);

  const retry = useCallback(() => {
    setMessage(null);
    void startScanner();
  }, [startScanner]);

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    const target = targetForScannedValue(code);
    if (target) {
      setInvalid(false);
      router.push(target);
    } else {
      setInvalid(true);
    }
  };

  const showForm = state === "manual" || state === "unavailable";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#1b1005] font-sans text-[#faf6ec]">
      {/* Backdrop */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_35%_30%,#3a2410_0%,#241505_45%,#120a02_100%)]" />
      <video
        ref={videoRef}
        className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-300 ${state === "scanning" ? "opacity-100" : "opacity-0"}`}
        muted
        playsInline
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#1b1005]/85 via-transparent to-[#1b1005]/95" />

      {/* Header */}
      <header className="relative z-40 flex items-center justify-between px-5 py-4">
        <button
          type="button"
          aria-label="Back to home"
          onClick={() => { stopScanner(); router.push("/"); }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
        >
          <Icon name="arrow_back" />
        </button>
        <span className="text-label-caps tracking-[0.22em] text-[#ffb800]">HIVETRACE</span>
        <span className="w-11" aria-hidden />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))]">
        {/* The whole flow is centred as one block (my-auto, not justify-center:
            auto margins collapse to 0 on short viewports instead of clipping
            the top of the content the way justify-center does). */}
        <div className="my-auto flex w-full max-w-sm flex-col items-center">
          <div className="w-full pt-2 text-center">
            <h1 className="text-heading-xl text-white">Scan & Verify</h1>
            <p className="mt-2 text-body-md text-white/70">Scan the QR code on your honey package.</p>
          </div>

          {/* Viewfinder */}
          <div className="relative mx-auto mt-6 h-64 w-64 shrink-0 overflow-hidden rounded-3xl sm:h-72 sm:w-72" role="img" aria-label="Camera viewfinder">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
            <div className="absolute left-0 top-0 z-10 h-12 w-12 rounded-tl-2xl border-l-4 border-t-4 border-[#ffb800]" />
            <div className="absolute right-0 top-0 z-10 h-12 w-12 rounded-tr-2xl border-r-4 border-t-4 border-[#ffb800]" />
            <div className="absolute bottom-0 left-0 z-10 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-[#ffb800]" />
            <div className="absolute bottom-0 right-0 z-10 h-12 w-12 rounded-br-2xl border-b-4 border-r-4 border-[#ffb800]" />

            {state === "scanning" && (
              <div className="scan-line absolute left-4 right-4 z-10 h-0.5 bg-gradient-to-r from-transparent via-[#ffb800] to-transparent shadow-[0_0_12px_rgba(255,184,0,0.9)]" />
            )}

            {state === "requesting" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#ffb800]" aria-hidden />
                <p className="px-6 text-center text-body-sm text-white/85">Requesting camera access…</p>
              </div>
            )}

            {state === "success" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#3b6934]/85">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                  <Icon name="check_circle" fill className="text-4xl text-white" />
                </span>
                <p className="text-body-md font-semibold text-white">Code recognised</p>
                <p className="text-body-sm text-white/80">Opening your certificate…</p>
              </div>
            )}

            {state === "failure" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                  <Icon name="qr_code_2" className="text-3xl text-[#ffb800]" />
                </span>
                <p className="text-body-md font-semibold text-white">Not a HiveTrace label</p>
              </div>
            )}

            {(state === "idle" || state === "unavailable") && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 opacity-60">
                <Icon name="qr_code_scanner" className="text-5xl text-white" />
                {state === "unavailable" && <p className="px-8 text-center text-body-sm text-white/80">Camera unavailable</p>}
              </div>
            )}
          </div>

          {/* State-driven controls */}
          <div className="mt-6 flex w-full flex-col items-center text-center">
            {message && (
              <p className="mb-4 rounded-xl bg-black/40 px-4 py-2.5 text-body-sm leading-relaxed text-white/90 backdrop-blur" role="status">
                {message}
              </p>
            )}

            {showForm ? (
              <form onSubmit={submitManual} className="w-full" noValidate>
                <label htmlFor="batch-code" className="mb-2 block text-left text-label-caps tracking-[0.14em] text-white/60">
                  Batch code
                </label>
                <div className={`mb-2 flex items-center gap-2 rounded-2xl border bg-white/10 px-4 backdrop-blur-md transition-colors ${invalid ? "border-red-400/70" : "border-white/15 focus-within:border-[#ffb800]/60"}`}>
                  <Icon name="qr_code" className="shrink-0 text-[#ffb800]" />
                  <input
                    id="batch-code"
                    value={code}
                    onChange={(event) => { setCode(event.target.value); setInvalid(false); }}
                    placeholder="e.g. HC-2026-00124"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? "batch-code-error" : undefined}
                    className="h-13 w-full bg-transparent py-3.5 font-mono text-body-md tracking-wider text-white outline-none placeholder:text-white/55"
                  />
                </div>
                {invalid ? (
                  <p id="batch-code-error" role="alert" className="mb-2 text-left text-body-sm text-red-300">
                    Enter a valid batch code, for example HC-2026-00124.
                  </p>
                ) : (
                  <p className="mb-2 text-left text-body-sm text-white/50">
                    You&apos;ll find it printed under the QR code on the label.
                  </p>
                )}
                <button
                  type="submit"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#ffb800] text-body-md font-semibold text-[#2a1e05] shadow-lg transition-all hover:bg-[#ffc533] active:scale-[0.98]"
                >
                  <Icon name="verified" fill className="text-[20px]" />
                  Verify batch
                </button>
                {state === "unavailable" ? (
                  <button type="button" onClick={retry} className="mt-4 py-1.5 text-body-sm font-medium text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white">
                    Try the camera again
                  </button>
                ) : (
                  <button type="button" onClick={retry} className="mt-4 py-1.5 text-body-sm font-medium text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white">
                    Use the camera instead
                  </button>
                )}
              </form>
            ) : state === "scanning" ? (
              <>
                <p className="mb-4 text-body-sm text-white/70" role="status">Point the camera at the QR code…</p>
                <button
                  type="button"
                  onClick={() => { stopScanner(); setState("idle"); }}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 text-body-md font-semibold text-white backdrop-blur-md transition-all hover:bg-white/15 active:scale-[0.98]"
                >
                  <Icon name="stop_circle" className="text-[20px]" />
                  Stop scanner
                </button>
                <button type="button" onClick={goManual} className="mt-4 py-1.5 text-body-sm font-medium text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white">
                  Enter the code manually
                </button>
              </>
            ) : state === "failure" ? (
              <>
                <button
                  type="button"
                  onClick={retry}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#ffb800] text-body-md font-semibold text-[#2a1e05] shadow-lg transition-all hover:bg-[#ffc533] active:scale-[0.98]"
                >
                  <Icon name="qr_code_scanner" className="text-[20px]" />
                  Scan again
                </button>
                <button type="button" onClick={goManual} className="mt-4 py-1.5 text-body-sm font-medium text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white">
                  Enter the code manually
                </button>
              </>
            ) : state === "success" ? (
              <p className="flex h-14 items-center text-body-sm text-white/70" role="status">
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#ffb800]" aria-hidden />
                Opening your certificate…
              </p>
            ) : (
              <>
                {/* idle / requesting */}
                <button
                  type="button"
                  onClick={() => void startScanner()}
                  disabled={state === "requesting"}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#ffb800] text-body-md font-semibold text-[#2a1e05] shadow-lg transition-all hover:bg-[#ffc533] active:scale-[0.98] disabled:opacity-70"
                >
                  <Icon name="qr_code_scanner" className="text-[20px]" />
                  {state === "requesting" ? "Starting camera…" : "Enable camera"}
                </button>
                <button type="button" onClick={goManual} className="mt-4 py-1.5 text-body-sm font-medium text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white">
                  Enter the code manually
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#1b1005]">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#ffb800]" aria-hidden />
          <span className="sr-only">Loading scanner…</span>
        </div>
      }
    >
      <ScanPageContent />
    </Suspense>
  );
}
