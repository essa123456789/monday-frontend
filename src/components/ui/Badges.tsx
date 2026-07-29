"use client";

import { Flag } from "lucide-react";
import { cn, PRIORITY_META, STATUS_META } from "@/lib/utils";
import type { Label, TaskPriority, TaskStatus } from "@/lib/types";

export function StatusPill({
  status,
  size = "sm",
  className,
}: {
  status: TaskStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold leading-none",
        size === "sm" ? "h-[22px] px-2 text-[11px]" : "h-8 px-3 text-[13px]",
        className
      )}
      style={{ backgroundColor: meta.color, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority, size = "sm" }: { priority: TaskPriority; size?: "sm" | "md" }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium leading-none",
        size === "sm" ? "h-[22px] px-1.5 text-[11px]" : "h-8 px-2.5 text-[13px]"
      )}
      style={{ borderColor: `${meta.color}66`, color: meta.color, backgroundColor: `${meta.color}14` }}
    >
      <Flag size={size === "sm" ? 10 : 13} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

export function LabelChip({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex h-[20px] items-center gap-1 rounded-full px-2 text-[11px] font-medium text-white"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove label ${label.name}`}
          className="-mr-0.5 cursor-pointer rounded-full leading-none opacity-70 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      )}
    </span>
  );
}
