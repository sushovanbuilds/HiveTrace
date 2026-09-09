"use client";

import jsQR from "jsqr";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

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

export default function VerifyScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [code, setCode] = useState("");
  const [manual, setManual] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    // Support a deep link used by the demo QR flow: /verify?batch=HC-2026-00124
    // forwards straight to the batch verification route.
    const batch = new URLSearchParams(window.location.search).get("batch");
    if (batch) router.replace(`/verify/${encodeURIComponent(batch.trim().toUpperCase())}`);
  }, [router]);

  useEffect(() => stopScanner, [stopScanner]);

  const startScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("This browser does not support camera scanning. Enter the batch code manually.");
      setManual(true);
      return;
    }

    setCameraMessage("Requesting camera access…");
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
      setScanning(true);
      setCameraMessage("Point the camera at a HiveTrace QR label.");

      const scanFrame = () => {
        const preview = videoRef.current;
        if (!preview || preview.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          frameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

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
          if (target) {
            stopScanner();
            router.push(target);
            return;
          }
          setCameraMessage("That QR code is not a HiveTrace label. Try another label or enter its batch code.");
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };

      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      stopScanner();
      const name = error instanceof DOMException ? error.name : "";
      setCameraMessage(
        name === "NotAllowedError"
          ? "Camera access was blocked. Allow camera access in your browser settings, then try again."
          : "We could not open the rear camera. Enter the batch code manually instead.",
      );
      setManual(true);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const target = targetForScannedValue(code);
    if (target) router.push(target);
    else setCameraMessage("Enter a HiveTrace batch code, for example HC-2026-00124.");
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-inverse-surface font-sans text-surface-container-lowest">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_35%_30%,#3a2410_0%,#241505_45%,#120a02_100%)]" />
      <video
        ref={videoRef}
        className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity ${scanning ? "opacity-100" : "opacity-0"}`}
        muted
        playsInline
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,184,0,0.18)_0%,transparent_40%,rgba(255,184,0,0.08)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-inverse-surface/80 via-transparent to-inverse-surface/95" />

      <header className="relative z-40 flex items-center justify-between px-5 py-4">
        <button type="button" aria-label="Close scanner" onClick={() => { stopScanner(); router.push("/"); }} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-surface-container-highest/20 text-white backdrop-blur-md transition-colors hover:bg-surface-container-highest/30">
          <Icon name="close" />
        </button>
        <div className="text-label-caps tracking-[0.08em] text-primary-container">HiveTrace</div>
        <div className="w-12" aria-hidden />
      </header>

      <main className="relative z-10 flex flex-grow flex-col items-center justify-center px-5">
        <div className="mb-8 w-full max-w-sm text-center">
          <h1 className="text-headline-lg-mobile font-semibold tracking-tight text-white drop-shadow-md">Verify Your Honey</h1>
          <p className="mt-1 text-body-md text-secondary-fixed-dim drop-shadow">Align the QR code within the frame to verify its journey.</p>
        </div>

        <div className="relative mx-auto mb-6 h-64 w-64 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
          <div className="absolute left-0 top-0 z-10 h-12 w-12 corner-pulse rounded-tl-xl border-l-4 border-t-4 border-primary-container" />
          <div className="absolute right-0 top-0 z-10 h-12 w-12 corner-pulse rounded-tr-xl border-r-4 border-t-4 border-primary-container" />
          <div className="absolute bottom-0 left-0 z-10 h-12 w-12 corner-pulse rounded-bl-xl border-b-4 border-l-4 border-primary-container" />
          <div className="absolute bottom-0 right-0 z-10 h-12 w-12 corner-pulse rounded-br-xl border-b-4 border-r-4 border-primary-container" />
          {scanning ? <div className="scan-line absolute left-0 right-0 z-10 h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent shadow-[0_0_8px_rgba(255,184,0,0.8)]" /> : null}
          {!scanning ? <div className="absolute inset-0 flex items-center justify-center opacity-50"><Icon name="qr_code_scanner" className="text-4xl text-white" /></div> : null}
        </div>

        <div className="mt-auto flex w-full max-w-sm flex-col items-center pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
          {cameraMessage ? <p className="mb-4 rounded-xl bg-black/30 px-3 py-2 text-metadata-sm text-white/90 backdrop-blur" role="status">{cameraMessage}</p> : null}
          {manual ? (
            <form onSubmit={submit} className="w-full">
              <div className="mb-3 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 backdrop-blur-md">
                <Icon name="qr_code" className="text-primary-container" />
                <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter batch code (e.g. HC-2026-00124)" className="h-12 w-full bg-transparent font-mono text-body-md tracking-wider text-white outline-none placeholder:text-surface-variant/70" autoFocus />
              </div>
              <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-container font-label-caps tracking-wider text-on-primary-container shadow-lg transition-all hover:bg-inverse-primary active:scale-95">
                <Icon name="verified" fill className="text-[20px]" /> VERIFY BATCH
              </button>
              <button type="button" onClick={() => { setManual(false); void startScanner(); }} className="mt-4 font-medium text-metadata-sm text-secondary-fixed-dim underline decoration-secondary-fixed-dim/50 underline-offset-4">Use camera scanner</button>
            </form>
          ) : (
            <>
              <button type="button" onClick={scanning ? stopScanner : startScanner} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-container font-label-caps tracking-wider text-on-primary-container shadow-lg transition-all hover:bg-inverse-primary active:scale-95">
                <Icon name={scanning ? "stop_circle" : "qr_code_scanner"} fill className="text-[20px]" />
                {scanning ? "STOP SCANNER" : "START CAMERA"}
              </button>
              <button type="button" onClick={() => { stopScanner(); setManual(true); }} className="mt-4 font-medium text-metadata-sm text-secondary-fixed-dim underline decoration-secondary-fixed-dim/50 underline-offset-4 transition-colors hover:text-white">Enter Code Manually</button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
