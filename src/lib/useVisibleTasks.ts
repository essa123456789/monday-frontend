import { useMemo } from "react";
import { useBoardStore } from "@/store/boardStore";
import { PRIORITY_META, STATUS_ORDER } from "./utils";
import type { TaskCard } from "./types";

/** Tasks per group after applying board filters, search and sort. */
export function useVisibleTasks() {
  const board = useBoardStore((s) => s.board);
  const filters = useBoardStore((s) => s.filters);

  const hasFilters =
    filters.search.trim() !== "" ||
    filters.assignees.length > 0 ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0;

  const map = useMemo(() => {
    const result = new Map<number, TaskCard[]>();
    if (!board) return result;
    const q = filters.search.trim().toLowerCase();
    for (const group of board.groups) {
      let tasks = group.tasks.filter((t) => {
        if (q && !t.title.toLowerCase().includes(q)) return false;
        if (filters.assignees.length && !t.assignees.some((a) => filters.assignees.includes(a.id)))
          return false;
        if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;
        if (filters.priorities.length && !filters.priorities.includes(t.priority)) return false;
        if (filters.labels.length && !t.labels.some((l) => filters.labels.includes(l.id)))
          return false;
        return true;
      });
      if (filters.sort !== "manual") {
        tasks = [...tasks].sort((a, b) => {
          switch (filters.sort) {
            case "due_date": {
              if (!a.due_date && !b.due_date) return 0;
              if (!a.due_date) return 1;
              if (!b.due_date) return -1;
              return a.due_date.localeCompare(b.due_date);
            }
            case "priority":
              return PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
            case "title":
              return a.title.localeCompare(b.title);
            case "status":
              return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
            default:
              return 0;
          }
        });
      }
      result.set(group.id, tasks);
    }
    return result;
  }, [board, filters]);

  const totalVisible = useMemo(
    () => Array.from(map.values()).reduce((n, t) => n + t.length, 0),
    [map]
  );

  return { map, hasFilters, totalVisible };
}
