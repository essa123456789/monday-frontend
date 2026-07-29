"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Dropdown menu rendered in a portal at document.body so it is never clipped
 * by scrolling/overflow containers (board columns, tables, side panel).
 */
export function Dropdown({
  trigger,
  children,
  align = "left",
  width = 240,
  matchTriggerSize = false,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void, triggerSize: { width: number; height: number }) => ReactNode);
  align?: "left" | "right";
  width?: number;
  /** Size the menu (and expose triggerSize to children) to match the trigger element exactly. */
  matchTriggerSize?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [triggerSize, setTriggerSize] = useState({ width, height: 0 });

  // Position the menu next to the trigger; flip up / clamp if it would overflow.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      // The wrapper is display:contents (no box) — measure its first child
      const el = (triggerRef.current?.firstElementChild ?? triggerRef.current) as HTMLElement | null;
      const rect = el?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = matchTriggerSize ? rect.width : width;
      setTriggerSize({ width: rect.width, height: rect.height });
      const menuH = menuRef.current?.offsetHeight ?? 0;
      let left = align === "right" ? rect.right - menuWidth : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
      let top = rect.bottom + 6;
      if (menuH && top + menuH > window.innerHeight - 8) {
        const above = rect.top - menuH - 6;
        top = above >= 8 ? above : Math.max(8, window.innerHeight - menuH - 8);
      }
      setPos({ top, left });
    };
    place();
    // Re-measure once the menu has rendered (height only known after mount)
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [open, align, width, matchTriggerSize]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = (e: Event) => {
      // Scrolling inside the menu itself is fine; any outside scroll closes it
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <div ref={triggerRef} className="contents" onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[999] animate-pop-in rounded-lg border border-edge bg-surface-raised p-1.5 shadow-pop"
            style={{
              width: matchTriggerSize ? triggerSize.width : width,
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              visibility: pos ? "visible" : "hidden",
            }}
            role="menu"
          >
            {typeof children === "function" ? children(() => setOpen(false), triggerSize) : children}
          </div>,
          document.body
        )}
    </>
  );
}

export function DropdownItem({
  children,
  onClick,
  danger,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150",
        danger
          ? "text-[#E2445C] hover:bg-[#E2445C]/10"
          : "text-ink hover:bg-surface-sunken",
        active && "bg-primary-soft dark:bg-primary/20"
      )}
    >
      {children}
    </button>
  );
}
