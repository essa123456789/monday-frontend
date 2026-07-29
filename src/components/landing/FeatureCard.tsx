"use client";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  type LucideIcon,
  Play,
  Sparkles,
} from "lucide-react";

export type FeatureKind =
  | "ai"
  | "automation"
  | "time"
  | "workspaces"
  | "dashboards"
  | "docs"
  | "forms"
  | "chat"
  | "files";

function Av({ i, c }: { i: string; c: string }) {
  return (
    <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8.5px] font-semibold text-white" style={{ backgroundColor: c }}>
      {i}
    </span>
  );
}

function Pill({ text, c }: { text: string; c: string }) {
  return (
    <span className="inline-flex h-[18px] items-center rounded-full px-2 text-[9px] font-semibold text-white" style={{ backgroundColor: c }}>
      {text}
    </span>
  );
}

function Preview({ kind }: { kind: FeatureKind }) {
  switch (kind) {
    case "ai":
      return (
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between rounded-lg border border-edge bg-surface-raised px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-ink">Plan Q3 launch</span>
            <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "linear-gradient(135deg,#8B5CF6,#C48ADB)" }}>
              <Sparkles size={9} /> AI
            </span>
          </div>
          {["Draft brief", "Assign owners", "Set due dates"].map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-[10.5px] text-ink-muted">
              <CheckCircle2 size={12} className="text-[#10B981]" /> {t}
            </div>
          ))}
        </div>
      );
    case "automation":
      return (
        <div className="w-full space-y-1.5 rounded-lg border border-edge bg-surface-raised p-2.5">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[9px] font-bold text-ink-muted">WHEN</span>
            <Pill text="Done" c="#10B981" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[9px] font-bold text-ink-muted">THEN</span>
            <Pill text="Notify team" c="#8B5CF6" />
            <ArrowRight size={12} className="text-ink-faint" />
          </div>
        </div>
      );
    case "time":
      return (
        <div className="w-full rounded-lg border border-edge bg-surface-raised p-3 text-center">
          <p className="text-[22px] font-bold tracking-tight text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
            01:24:07
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-white">
              <Play size={11} fill="currentColor" />
            </span>
            <span className="text-[10px] font-medium text-ink-muted">Today · 4h 20m</span>
          </div>
        </div>
      );
    case "workspaces":
      return (
        <div className="w-full space-y-1.5">
          {[
            ["P", "#8B5CF6", "Product Team"],
            ["M", "#F59E0B", "Marketing"],
            ["E", "#10B981", "Engineering"],
          ].map(([l, c, name]) => (
            <div key={name} className="flex items-center gap-2 rounded-lg border border-edge bg-surface-raised px-2 py-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold text-white" style={{ backgroundColor: c }}>
                {l}
              </span>
              <span className="flex-1 text-[10.5px] font-medium text-ink">{name}</span>
              <span className="flex -space-x-1">
                <Av i="EK" c="#8B5CF6" />
                <Av i="SA" c="#10B981" />
              </span>
            </div>
          ))}
        </div>
      );
    case "dashboards":
      return (
        <div className="flex w-full items-center gap-4 rounded-lg border border-edge bg-surface-raised p-3">
          <div className="flex h-[62px] flex-1 items-end gap-1.5">
            {[
              [45, "#8B5CF6"],
              [72, "#5AC6FC"],
              [55, "#9D99FF"],
              [92, "#8B5CF6"],
              [64, "#5AC6FC"],
            ].map(([h, c], i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: c as string }} />
            ))}
          </div>
          <div
            className="h-12 w-12 shrink-0 rounded-full"
            style={{ background: "conic-gradient(#10B981 0 62%, #EAECF2 62% 100%)" }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-[9px] font-bold text-ink">
                62%
              </div>
            </div>
          </div>
        </div>
      );
    case "docs":
      return (
        <div className="w-full space-y-2 rounded-lg border border-edge bg-surface-raised p-3">
          <div className="h-2.5 w-1/2 rounded bg-ink/20" />
          {["w-full", "w-11/12", "w-full", "w-4/5"].map((w, i) => (
            <div key={i} className={`h-1.5 rounded bg-ink/10 ${w}`} />
          ))}
        </div>
      );
    case "forms":
      return (
        <div className="w-full space-y-1.5 rounded-lg border border-edge bg-surface-raised p-2.5">
          <div className="h-2 w-10 rounded bg-ink/15" />
          <div className="h-6 rounded-md border border-edge bg-surface-sunken" />
          <div className="h-6 rounded-md border border-edge bg-surface-sunken" />
          <div className="flex h-6 items-center justify-center rounded-md bg-primary text-[9.5px] font-semibold text-white">
            Submit request
          </div>
        </div>
      );
    case "chat":
      return (
        <div className="w-full space-y-2">
          <div className="flex items-end gap-1.5">
            <Av i="SA" c="#10B981" />
            <span className="rounded-2xl rounded-bl-sm bg-surface-sunken px-2.5 py-1.5 text-[10px] text-ink">
              Shipped the login fix
            </span>
          </div>
          <div className="flex flex-row-reverse items-end gap-1.5">
            <Av i="EK" c="#8B5CF6" />
            <span className="rounded-2xl rounded-br-sm bg-primary px-2.5 py-1.5 text-[10px] text-white">
              Nice — deploying now
            </span>
          </div>
        </div>
      );
    case "files":
      return (
        <div className="w-full space-y-1.5">
          {[
            ["spec.pdf", "2.4 MB", "#E2445C"],
            ["design.fig", "8.1 MB", "#9D99FF"],
          ].map(([name, size, c]) => (
            <div key={name} className="flex items-center gap-2 rounded-lg border border-edge bg-surface-raised px-2 py-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ backgroundColor: c }}>
                <FileText size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px] font-semibold text-ink">{name}</p>
                <p className="text-[9px] text-ink-faint">{size}</p>
              </div>
              <Download size={13} className="text-ink-faint" />
            </div>
          ))}
        </div>
      );
  }
}

export function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
  kind,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
  kind: FeatureKind;
}) {
  return (
    <div className="group overflow-hidden rounded-[20px] border border-edge bg-surface-raised shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex h-[136px] items-center border-b border-edge bg-surface-sunken/60 p-4">
        <Preview kind={kind} />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1f`, color }}>
            <Icon size={15} />
          </span>
          <h3 className="text-[15.5px] font-bold text-ink">{title}</h3>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{desc}</p>
      </div>
    </div>
  );
}
