"use client";

import { useState } from "react";
import {
  Archive,
  ArrowUpDown,
  Check,
  Filter,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useBoardMembers, useBoardStore } from "@/store/boardStore";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import {
  cn,
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/utils";
import type { SortMode } from "@/lib/types";

const SORT_LABELS: Record<SortMode, string> = {
  manual: "Manual (default)",
  due_date: "Due date",
  priority: "Priority",
  title: "Name (A–Z)",
  status: "Status",
};

export function FilterBar() {
  const board = useBoardStore((s) => s.board);
  const members = useBoardMembers();
  const filters = useBoardStore((s) => s.filters);
  const setFilters = useBoardStore((s) => s.setFilters);
  const clearFilters = useBoardStore((s) => s.clearFilters);
  const addGroup = useBoardStore((s) => s.addGroup);

  const router = useRouter();
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");

  const activeFilterCount =
    filters.assignees.length +
    filters.statuses.length +
    filters.priorities.length +
    filters.labels.length;

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const submitGroup = () => {
    const name = groupName.trim();
    setAddingGroup(false);
    setGroupName("");
    if (name) addGroup(name);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="h-9 w-40 rounded-lg border border-edge bg-surface-raised pl-8 pr-7 text-[13px] text-ink outline-none transition-all duration-200 placeholder:text-ink-faint focus:w-56 focus:border-primary md:w-52 md:focus:w-64"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => setFilters({ search: "" })}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-ink-faint hover:text-ink"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Person filter */}
      <Dropdown
        width={220}
        trigger={
          <button
            type="button"
            className={cn(
              "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors duration-150",
              filters.assignees.length
                ? "border-primary bg-primary-soft text-primary dark:bg-primary/20"
                : "border-edge text-ink-muted hover:bg-surface-sunken"
            )}
          >
            Person {filters.assignees.length > 0 && `(${filters.assignees.length})`}
          </button>
        }
      >
        {members.map((m) => (
          <DropdownItem key={m.id} onClick={() => setFilters({ assignees: toggle(filters.assignees, m.id) })}>
            <Avatar member={m} size={22} />
            <span className="flex-1">{m.name}</span>
            {filters.assignees.includes(m.id) && <Check size={15} className="text-primary" />}
          </DropdownItem>
        ))}
      </Dropdown>

      {/* Status / priority / label filter */}
      <Dropdown
        width={260}
        trigger={
          <button
            type="button"
            className={cn(
              "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors duration-150",
              activeFilterCount - filters.assignees.length > 0
                ? "border-primary bg-primary-soft text-primary dark:bg-primary/20"
                : "border-edge text-ink-muted hover:bg-surface-sunken"
            )}
          >
            <Filter size={14} /> Filter
            {activeFilterCount - filters.assignees.length > 0 &&
              ` (${activeFilterCount - filters.assignees.length})`}
          </button>
        }
      >
        <div className="max-h-[400px] overflow-y-auto nice-scroll">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Status</p>
          {STATUS_ORDER.map((s) => (
            <DropdownItem key={s} onClick={() => setFilters({ statuses: toggle(filters.statuses, s) })}>
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: STATUS_META[s].color }} />
              <span className="flex-1">{STATUS_META[s].label}</span>
              {filters.statuses.includes(s) && <Check size={15} className="text-primary" />}
            </DropdownItem>
          ))}
          <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Priority</p>
          {PRIORITY_ORDER.map((p) => (
            <DropdownItem key={p} onClick={() => setFilters({ priorities: toggle(filters.priorities, p) })}>
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: PRIORITY_META[p].color }} />
              <span className="flex-1">{PRIORITY_META[p].label}</span>
              {filters.priorities.includes(p) && <Check size={15} className="text-primary" />}
            </DropdownItem>
          ))}
          {(board?.labels.length ?? 0) > 0 && (
            <>
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Label</p>
              {board!.labels.map((l) => (
                <DropdownItem key={l.id} onClick={() => setFilters({ labels: toggle(filters.labels, l.id) })}>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="flex-1">{l.name}</span>
                  {filters.labels.includes(l.id) && <Check size={15} className="text-primary" />}
                </DropdownItem>
              ))}
            </>
          )}
        </div>
      </Dropdown>

      {/* Sort */}
      <Dropdown
        width={200}
        trigger={
          <button
            type="button"
            className={cn(
              "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors duration-150",
              filters.sort !== "manual"
                ? "border-primary bg-primary-soft text-primary dark:bg-primary/20"
                : "border-edge text-ink-muted hover:bg-surface-sunken"
            )}
          >
            <ArrowUpDown size={14} /> Sort
            {filters.sort !== "manual" && `: ${SORT_LABELS[filters.sort]}`}
          </button>
        }
      >
        {(close) => (
          <>
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <DropdownItem
                key={mode}
                active={filters.sort === mode}
                onClick={() => {
                  setFilters({ sort: mode });
                  close();
                }}
              >
                <span className="flex-1">{SORT_LABELS[mode]}</span>
                {filters.sort === mode && <Check size={15} className="text-primary" />}
              </DropdownItem>
            ))}
          </>
        )}
      </Dropdown>

      {(activeFilterCount > 0 || filters.search || filters.sort !== "manual") && (
        <button
          type="button"
          onClick={clearFilters}
          className="flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
        >
          <X size={14} /> Clear
        </button>
      )}

      {addingGroup ? (
        <input
          autoFocus
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onBlur={submitGroup}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitGroup();
            if (e.key === "Escape") {
              setAddingGroup(false);
              setGroupName("");
            }
          }}
          placeholder="Group name…"
          className="h-9 w-44 rounded-lg border border-primary bg-surface-raised px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingGroup(true)}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-transparent border border-primary px-3.5 text-[13px] font-semibold text-primary transition-colors duration-150 hover:opacity-70"
        >
          <Plus size={16} /> New group
        </button>
      )}

      {board && (
        <button
          type="button"
          onClick={() => router.push(`/board/${board.id}/archived`)}
          title="View archived tickets"
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
        >
          <Archive size={15} /> Archived
        </button>
      )}
    </div>
  );
}
