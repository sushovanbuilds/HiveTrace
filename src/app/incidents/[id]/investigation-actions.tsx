"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

const DECISIONS = [
  "FALSE_POSITIVE",
  "SUPPLIER_ERROR",
  "PROCESSING_ERROR",
  "CONFIRMED_FRAUD",
  "OTHER",
] as const;

type FormKind = "note" | "dismiss" | "resolve" | null;

/**
 * Human investigation actions for a DB-backed incident, wired to the existing
 * APIs: PATCH /api/incidents/[id] for status transitions and POST
 * /api/incidents/[id]/investigation for notes, confirmations, and decisions.
 * A risk score never closes a case — only a human does, with a written reason.
 */
export function InvestigationActions({
  incidentId,
  status,
  findings,
}: {
  incidentId: string;
  status: string;
  findings: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormKind>(null);
  const [text, setText] = useState("");
  const [decision, setDecision] = useState<string>(DECISIONS[0]);

  const terminal = status === "RESOLVED" || status === "CLOSED";

  async function request(
    label: string,
    path: string,
    init: RequestInit,
  ): Promise<boolean> {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(path, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { message?: string } | null)?.message ?? `Request failed (${res.status})`,
        );
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  const appendFindings = (addition: string) =>
    findings ? `${findings}\n\n${addition}` : addition;

  async function review() {
    const ok = await request(
      "review",
      `/api/incidents/${encodeURIComponent(incidentId)}`,
      { method: "PATCH", body: JSON.stringify({ status: "INVESTIGATING" }) },
    );
    if (ok) router.refresh();
  }

  async function confirm() {
    const ok = await request(
      "confirm",
      `/api/incidents/${encodeURIComponent(incidentId)}/investigation`,
      {
        method: "POST",
        body: JSON.stringify({
          findings: appendFindings("Investigator confirmed the anomaly pattern as genuine and worth investigating."),
        }),
      },
    );
    if (ok) router.refresh();
  }

  async function submitForm() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const base = `/api/incidents/${encodeURIComponent(incidentId)}`;

    if (form === "note") {
      const ok = await request("note", `${base}/investigation`, {
        method: "POST",
        body: JSON.stringify({ findings: appendFindings(trimmed) }),
      });
      if (ok) {
        setForm(null);
        setText("");
        router.refresh();
      }
      return;
    }

    if (form === "dismiss") {
      const okNote = await request("dismiss", `${base}/investigation`, {
        method: "POST",
        body: JSON.stringify({
          findings: appendFindings(`Dismissed by investigator: ${trimmed}`),
          resolution: trimmed,
        }),
      });
      if (!okNote) return;
      const okClose = await request("dismiss-close", base, {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (okClose) {
        setForm(null);
        setText("");
        router.refresh();
      }
      return;
    }

    // resolve — a decision is the auditable act, so the resolution text is
    // required and the case closes through the investigation endpoint.
    const ok = await request("resolve", `${base}/investigation`, {
      method: "POST",
      body: JSON.stringify({
        findings: appendFindings(trimmed),
        resolution: trimmed,
        decision,
      }),
    });
    if (ok) {
      setForm(null);
      setText("");
      router.refresh();
    }
  }

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-metadata-sm font-semibold transition-all active:scale-95 disabled:opacity-50";

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-error-container/30 p-2.5 text-metadata-sm text-on-error-container">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {status === "OPEN" && (
          <button type="button" onClick={review} disabled={busy !== null} className={`${btn} bg-primary-container text-on-primary-container hover:bg-[#cba000]`}>
            <Icon name="visibility" className="text-[18px]" />
            {busy === "review" ? "Working…" : "Review"}
          </button>
        )}
        {!terminal && (
          <button type="button" onClick={confirm} disabled={busy !== null} className={`${btn} border border-primary-container/40 text-primary-container hover:bg-primary-container/10`}>
            <Icon name="verified_user" className="text-[18px]" />
            {busy === "confirm" ? "Working…" : "Confirm"}
          </button>
        )}
        {!terminal && (
          <button type="button" onClick={() => setForm(form === "dismiss" ? null : "dismiss")} disabled={busy !== null} className={`${btn} border border-primary-container/40 text-primary-container hover:bg-primary-container/10`}>
            <Icon name="close" className="text-[18px]" /> Dismiss
          </button>
        )}
        {!terminal && (
          <button type="button" onClick={() => setForm(form === "resolve" ? null : "resolve")} disabled={busy !== null} className={`${btn} bg-primary-container text-on-primary-container hover:bg-[#cba000]`}>
            <Icon name="check_circle" className="text-[18px]" /> Resolve
          </button>
        )}
        <button type="button" onClick={() => setForm(form === "note" ? null : "note")} disabled={busy !== null} className={`${btn} border border-primary-container/40 text-primary-container hover:bg-primary-container/10`}>
          <Icon name="edit_note" className="text-[18px]" /> Add note
        </button>
      </div>

      {form && (
        <div className="mt-3 rounded-lg border border-primary-container/30 p-3.5">
          <p className="mb-1.5 text-label-caps uppercase tracking-widest text-primary-container">
            {form === "note" && "Investigation note"}
            {form === "dismiss" && "Dismissal reason (required)"}
            {form === "resolve" && "Resolution (required)"}
          </p>
          {form === "resolve" && (
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="mb-2 w-full rounded-lg border border-primary-container/40 bg-transparent px-3 py-2 text-metadata-sm text-inverse-on-surface"
            >
              {DECISIONS.map((d) => (
                <option key={d} value={d} className="text-on-surface">
                  {d.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={
              form === "note"
                ? "What did you find? Facts only — the score never declares fraud."
                : form === "dismiss"
                  ? "Why is this not an issue?"
                  : "How was this resolved?"
            }
            className="w-full rounded-lg border border-primary-container/40 bg-transparent px-3 py-2 text-metadata-sm text-inverse-on-surface placeholder:text-inverse-on-surface/50"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={submitForm}
              disabled={busy !== null || !text.trim()}
              className={`${btn} bg-primary-container text-on-primary-container hover:bg-[#cba000] disabled:opacity-50`}
            >
              <Icon name="send" className="text-[18px]" />
              {busy ? "Working…" : form === "note" ? "Save note" : form === "dismiss" ? "Dismiss case" : "Resolve case"}
            </button>
            <button
              type="button"
              onClick={() => { setForm(null); setText(""); }}
              className={`${btn} text-primary-container hover:bg-primary-container/10`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
