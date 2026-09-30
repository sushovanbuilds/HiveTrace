"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

const STEPS: Array<{ key: string; icon: string; title: string; text: string }> = [
  {
    key: "SENSE",
    icon: "sensors",
    title: "Sense",
    text: "In-hive sensors and field notes capture what's actually happening — temperature, humidity, weight, weather, and what the beekeeper saw on the last visit.",
  },
  {
    key: "UNDERSTAND",
    icon: "hive",
    title: "Understand",
    text: "The digital twin turns raw readings into a living picture of hive state: stable, warming, gaining weight, or asking for attention.",
  },
  {
    key: "EXPLAIN",
    icon: "psychology",
    title: "Explain",
    text: "Every flag arrives with its reasons attached — the readings, the comparisons, the context. No black boxes, no unexplained scores.",
  },
  {
    key: "ACT",
    icon: "task_alt",
    title: "Act",
    text: "Clear next checks, routed to the right person. The recommendation is advisory; the beekeeper makes the call and records what was done.",
  },
  {
    key: "RECHECK",
    icon: "update",
    title: "Recheck",
    text: "Follow-ups close the loop. If a temperature elevation was flagged, HIVEOS watches the next readings and confirms it resolved — or escalates.",
  },
  {
    key: "REMEMBER",
    icon: "history",
    title: "Remember",
    text: "Interventions and their outcomes become memory. What worked on one hive informs the advice for the whole apiary next season.",
  },
];

/** Interactive core-loop stepper for the HIVEOS entry page. */
export function LoopStepper() {
  /* Start on the first step — a `1` default made the page open on
     "2 of 6" before the visitor had touched anything. */
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <div>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3" aria-label="HIVEOS core loop">
        {STEPS.map((s, i) => {
          const isActive = i === active;
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl border px-2 py-4 transition-all sm:py-5 ${
                  isActive
                    ? "border-[#ffb800]/60 bg-[#ffb800]/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white/85"
                }`}
              >
                <Icon name={s.icon} className={`text-[26px] ${isActive ? "text-[#ffb800]" : ""}`} />
                <span className="text-label-caps tracking-[0.14em]">{s.key}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div
        key={step.key}
        className="animate-fade-up mt-4 rounded-2xl border border-[#ffb800]/25 bg-[#ffb800]/[0.06] p-5 sm:p-6"
        role="status"
      >
        <p className="flex items-center gap-2 text-eyebrow tracking-[0.2em] text-[#ffb800]">
          <Icon name={step.icon} className="text-[18px]" />
          {step.key}
        </p>
        <p className="mt-2 max-w-2xl text-body-lg leading-relaxed text-white/85">{step.text}</p>
      </div>
      <p className="mt-4 text-center text-body-sm text-white/55 sm:text-left" aria-hidden>
        {active + 1} of {STEPS.length}
      </p>
    </div>
  );
}
