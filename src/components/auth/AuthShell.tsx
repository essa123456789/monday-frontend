"use client";

import { ReactNode } from "react";
import { CheckCircle2, LayoutGrid } from "lucide-react";

const HIGHLIGHTS = [
  "Kanban boards with drag & drop",
  "Statuses, priorities and due dates",
  "Updates, files and activity history",
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-[#1f1f47] p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(600px 400px at 20% 20%, rgba(108,108,255,0.5), transparent 60%), radial-gradient(500px 400px at 80% 80%, rgba(0,200,117,0.25), transparent 60%), radial-gradient(400px 300px at 70% 30%, rgba(253,171,61,0.2), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
            <LayoutGrid size={19} />
          </span>
          <span className="text-[18px] font-bold text-white">WorkBoard</span>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-[32px] font-bold leading-tight text-white">
            Manage all your team&apos;s work in one place
          </h2>
          <ul className="mt-6 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-2.5 text-[14.5px] text-white/85">
                <CheckCircle2 size={17} className="shrink-0 text-[#10B981]" /> {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12px] text-white/50">Inspired by the best work management tools — built from scratch.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-surface-sunken p-6">
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white">
              <LayoutGrid size={19} />
            </span>
            <span className="text-[18px] font-bold text-ink">WorkBoard</span>
          </div>
          <h1 className="text-[24px] font-bold text-ink">{title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">{subtitle}</p>
          <div className="mt-6 rounded-2xl border border-edge bg-surface-raised p-6 shadow-card">{children}</div>
        </div>
      </div>
    </main>
  );
}

export function Field({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12.5px] font-semibold text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="h-11 w-full rounded-lg border border-edge bg-surface-sunken px-3 text-[14px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary focus:bg-surface-raised"
      />
      {error && <p className="mt-1 text-[12px] font-medium text-[#E2445C]">{error}</p>}
    </div>
  );
}
