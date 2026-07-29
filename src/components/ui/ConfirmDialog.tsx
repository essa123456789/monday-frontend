"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm animate-pop-in rounded-2xl border border-edge bg-surface-raised p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E2445C]/10 text-[#E2445C]">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 cursor-pointer rounded-lg px-4 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 cursor-pointer rounded-lg bg-[#E2445C] px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#C93A4F]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
