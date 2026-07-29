"use client";

import { useEffect } from "react";
import { Columns3, Table2 } from "lucide-react";
import { useBoardStore, type BoardViewMode } from "@/store/boardStore";
import { cn } from "@/lib/utils";

const TABS: { id: BoardViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "table", label: "Main table", icon: <Table2 size={15} /> },
  { id: "kanban", label: "Kanban", icon: <Columns3 size={15} /> },
];

export function ViewTabs() {
  const view = useBoardStore((s) => s.view);
  const setView = useBoardStore((s) => s.setView);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("workboard_view");
      if (stored === "table" || stored === "kanban") setView(stored);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-end gap-1 ">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setView(tab.id)}
          className={cn(
            "relative -mb-px flex cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-3.5 py-2 text-[13px] font-medium transition-colors duration-150",
            view === tab.id
              ? "border-transparent text-primary"
              : "border-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink"
          )}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}
