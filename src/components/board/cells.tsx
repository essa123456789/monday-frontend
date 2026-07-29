"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { useBoardMembers } from "@/store/boardStore";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import {
  cn,
  dueDateTone,
  formatDueDate,
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/utils";
import type { Member, TaskCard } from "@/lib/types";

export type CellUpdate = (patch: Record<string, unknown>) => void;

/** Minimal task shape the cells need — satisfied by both TaskCard and Subitem. */
export type CellTask = Pick<TaskCard, "id" | "assignees" | "status" | "priority" | "due_date">;

/** People picker body: selected chips, a search box, then the suggestion list.
 *
 * The list scrolls after ~5 rows so the menu stays a predictable height no
 * matter how big the board's member list is. */
function OwnerPicker({
  members,
  selected,
  onToggle,
}: {
  members: Member[];
  selected: Member[];
  onToggle: (memberId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search box as soon as the picker opens so the assigner can type
  // straight away. `autoFocus` alone is unreliable inside the portal dropdown,
  // which mounts hidden then positions — a rAF focus after mount is robust.
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, query]);

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-0.5 pt-0.5">
          {selected.map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-1.5 rounded-full bg-surface-sunken py-0.5 pl-0.5 pr-1.5 text-[12px] font-medium text-ink"
            >
              <Avatar member={m} size={18} />
              <span className="max-w-[120px] truncate">{m.name}</span>
              <button
                type="button"
                onClick={() => onToggle(m.id)}
                aria-label={`Remove ${m.name}`}
                className="cursor-pointer text-ink-faint transition-colors duration-150 hover:text-ink"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names or emails"
          className="h-8 w-full rounded-md border border-edge bg-surface-sunken pl-7 pr-2 text-[12.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
        />
      </div>

      <div className="flex flex-col">
        <span className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          Suggested people
        </span>
        <div className="max-h-[190px] overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-2.5 py-2 text-[12.5px] text-ink-muted">No people found.</p>
          ) : (
            matches.map((m) => (
              <DropdownItem key={m.id} onClick={() => onToggle(m.id)}>
                <Avatar member={m} size={22} />
                <span className="flex-1 truncate">{m.name}</span>
                {selected.some((a) => a.id === m.id) && <Check size={15} className="text-primary" />}
              </DropdownItem>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function OwnerCell({
  task,
  onUpdate,
  boardId,
}: {
  task: CellTask;
  onUpdate: CellUpdate;
  /** Board the task belongs to; defaults to the currently loaded board. */
  boardId?: number;
}) {
  const boardMembers = useBoardMembers(boardId);
  // Keep already-assigned people in the list even if they lost board access,
  // so they can still be unassigned.
  const members = [
    ...boardMembers,
    ...task.assignees.filter((a) => !boardMembers.some((m) => m.id === a.id)),
  ];
  const toggleAssignee = (memberId: number) => {
    const ids = task.assignees.map((a) => a.id);
    const next = ids.includes(memberId) ? ids.filter((i) => i !== memberId) : [...ids, memberId];
    onUpdate({ assignee_ids: next });
  };
  return (
    <Dropdown
      width={260}
      trigger={
        <button type="button" className="flex w-full cursor-pointer items-center justify-center p-1" aria-label="Edit owners">
          {task.assignees.length > 0 ? (
            <AvatarStack members={task.assignees} size={26} max={2} />
          ) : (
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-ink-faint/50 text-ink-faint transition-colors duration-150 hover:border-primary hover:text-primary">
              <Plus size={13} />
            </span>
          )}
        </button>
      }
    >
      <OwnerPicker members={members} selected={task.assignees} onToggle={toggleAssignee} />
    </Dropdown>
  );
}

/** Soft pill label — light tint background with the accent color as text. */
function SoftLabel({ label, tint }: { label: string; tint: string }) {
  return (
    <span
      className="inline-flex h-[32px] min-w-[96px] max-w-full items-center justify-center truncate rounded-full px-4 text-[12px] font-semibold transition-opacity duration-150 group-hover/chip:opacity-80"
      style={{ backgroundColor: `${tint}22`, color: tint }}
    >
      {label}
    </span>
  );
}

export function StatusCell({ task, onUpdate }: { task: CellTask; onUpdate: CellUpdate }) {
  return (
    <Dropdown
      matchTriggerSize
      trigger={
        <button
          type="button"
          className="group/chip flex h-full w-full cursor-pointer items-center justify-center px-2"
          aria-label="Change status"
        >
          <SoftLabel label={STATUS_META[task.status].label} tint={STATUS_META[task.status].tint} />
        </button>
      }
    >
      {(close) => (
        <div className="flex flex-col gap-1">
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            const active = task.status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onUpdate({ status: s });
                  close();
                }}
                style={{
                  backgroundColor: `${meta.tint}22`,
                  color: meta.tint,
                  boxShadow: active ? `inset 0 0 0 1.5px ${meta.tint}` : undefined,
                }}
                className="flex w-full cursor-pointer items-center justify-center rounded-full px-2.5 py-2 text-[12.5px] font-semibold transition-opacity duration-150 hover:opacity-80"
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </Dropdown>
  );
}

export function PriorityCell({ task, onUpdate }: { task: CellTask; onUpdate: CellUpdate }) {
  return (
    <Dropdown
      align="right"
      matchTriggerSize
      trigger={
        <button
          type="button"
          className="group/chip flex h-full w-full cursor-pointer items-center justify-center px-2"
          aria-label="Change priority"
        >
          <SoftLabel label={PRIORITY_META[task.priority].label} tint={PRIORITY_META[task.priority].tint} />
        </button>
      }
    >
      {(close) => (
        <div className="flex flex-col gap-1">
          {PRIORITY_ORDER.map((p) => {
            const meta = PRIORITY_META[p];
            const active = task.priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onUpdate({ priority: p });
                  close();
                }}
                style={{
                  backgroundColor: `${meta.tint}22`,
                  color: meta.tint,
                  boxShadow: active ? `inset 0 0 0 1.5px ${meta.tint}` : undefined,
                }}
                className="flex w-full cursor-pointer items-center justify-center rounded-full px-2.5 py-2 text-[12.5px] font-semibold transition-opacity duration-150 hover:opacity-80"
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </Dropdown>
  );
}

export function DueCell({ task, onUpdate }: { task: CellTask; onUpdate: CellUpdate }) {
  const tone = dueDateTone(task.due_date, task.status);
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <input
        type="date"
        value={task.due_date ?? ""}
        onChange={(e) => onUpdate({ due_date: e.target.value || null })}
        aria-label="Due date"
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <span
        className={cn(
          "pointer-events-none text-[12.5px] font-medium",
          tone === "overdue" && "text-[#E2445C]",
          tone === "soon" && "text-[#B97B1E] dark:text-[#F59E0B]",
          tone === "normal" && (task.due_date ? "text-ink-muted" : "text-ink-faint")
        )}
      >
        {task.due_date ? formatDueDate(task.due_date) : "—"}
      </span>
    </div>
  );
}
