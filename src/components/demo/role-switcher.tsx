"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { DEMO_USERS, ROLE_HOME, ROLE_LABEL } from "@/lib/demo/config";
import { loginDemoUser, setActiveDemoRole } from "@/lib/demo/auth";
import type { DemoRole } from "@/lib/demo/types";

/**
 * "Switch Demo Workspace" control. Lets a presenter hop between the four demo
 * accounts live without signing out. Styled as a legitimate workspace switch —
 * not a security bypass — so it reads as a demo convenience, not a hack.
 */
export function RoleSwitcher({ currentRole }: { currentRole: DemoRole | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const switchTo = (role: DemoRole) => {
    loginDemoUser(DEMO_USERS[role].email);
    setActiveDemoRole(role);
    setOpen(false);
    router.push(ROLE_HOME[role]);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-full items-center gap-2 rounded-lg px-3 text-on-surface-variant hover:bg-surface-container transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="swap_horiz" className="text-[20px]" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-body-md font-semibold leading-tight text-on-surface">
            {currentRole ? ROLE_LABEL[currentRole] : "Select workspace"}
          </span>
          <span className="block text-[11px] uppercase tracking-widest text-on-surface-variant">
            Switch demo workspace
          </span>
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-[18px]" />
      </button>

      {open ? (
        <div
          className="absolute bottom-full left-0 z-40 mb-2 w-72 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-xl shadow-black/10"
          role="menu"
        >
          <div className="border-b border-outline-variant/20 bg-surface-container/60 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Demo accounts
            </p>
          </div>
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {(Object.keys(DEMO_USERS) as DemoRole[]).map((role) => {
              const u = DEMO_USERS[role];
              const active = currentRole === role;
              return (
                <li key={role}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => switchTo(role)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-primary-container/20"
                        : "hover:bg-surface-container"
                    }`}
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-on-surface text-body-md font-semibold">
                      {u.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-md font-semibold text-on-surface">
                        {u.name}
                      </span>
                      <span className="block truncate text-[11px] text-on-surface-variant">
                        {ROLE_LABEL[role]} · {u.organization}
                      </span>
                    </span>
                    {active ? (
                      <Icon name="check_circle" fill className="text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
