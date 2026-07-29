"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ListTodo, Loader2, X } from "lucide-react";
import { format, isBefore, parseISO, startOfToday } from "date-fns";
import { api } from "@/lib/api";
import { useBoardStore } from "@/store/boardStore";
import { cn, STATUS_META } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge } from "@/components/ui/Badges";
import { countryFlag, countryLabel, timezoneLocalTime, timezoneOffsetLabel } from "@/lib/locations";
import type { Member, TaskCard } from "@/lib/types";

/** A task from /tasks/by_member/ — a board card plus its project context. */
interface MemberTask extends TaskCard {
  board: number;
  board_name: string;
  group_title: string;
  group_color: string;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surface-sunken px-3 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-0.5 text-[18px] font-bold leading-none" style={tone ? { color: tone } : undefined}>
        <span className={cn(!tone && "text-ink")}>{value}</span>
      </p>
    </div>
  );
}

export function MemberTasksPanel({
  member,
  onClose,
}: {
  member: Member | null;
  onClose: () => void;
}) {
  const openTask = useBoardStore((s) => s.openTask);
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    setLoading(true);
    setTasks([]);
    api
      .get<MemberTask[]>(`/tasks/by_member/?member=${member.id}`)
      .then((data) => {
        if (!cancelled) setTasks(data);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member]);

  useEffect(() => {
    if (!member) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [member, onClose]);

  // Group by project, keeping the server's due-date ordering inside each.
  // Done tasks are left out — this view is about what's still open.
  const projects = useMemo(() => {
    const byBoard = new Map<number, { name: string; color: string; tasks: MemberTask[] }>();
    for (const t of tasks) {
      if (t.status === "done") continue;
      const entry = byBoard.get(t.board) ?? { name: t.board_name, color: t.group_color, tasks: [] };
      entry.tasks.push(t);
      byBoard.set(t.board, entry);
    }
    return Array.from(byBoard, ([id, v]) => ({ id, ...v }));
  }, [tasks]);

  const done = tasks.filter((t) => t.status === "done").length;
  const today = startOfToday();
  const overdue = tasks.filter(
    (t) => t.status !== "done" && t.due_date && isBefore(parseISO(t.due_date), today)
  ).length;

  if (!member) return null;

  const place = member.country ? `${countryFlag(member.country)} ${countryLabel(member.country)}` : "";
  const time = member.timezone ? timezoneLocalTime(member.timezone) : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.name}'s tasks`}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-2xl animate-pop-in flex-col overflow-hidden rounded-2xl border border-edge bg-surface-raised shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-edge p-5">
          <Avatar member={member} size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15.5px] font-bold text-ink">{member.name}</p>
            <p className="truncate text-[12.5px] text-ink-faint">{member.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-ink-muted">
              {place && <span>{place}</span>}
              {time && (
                <span>
                  Local time {time}{" "}
                  <span className="text-ink-faint">({timezoneOffsetLabel(member.timezone!)})</span>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        {!loading && tasks.length > 0 && (
          <div className="grid shrink-0 grid-cols-3 gap-3 border-b border-edge p-4">
            <Stat label="Assigned" value={tasks.length} />
            <Stat label="Done" value={done} tone={done > 0 ? "#10B981" : undefined} />
            <Stat label="Overdue" value={overdue} tone={overdue > 0 ? "#E2445C" : undefined} />
          </div>
        )}

        {/* Tasks by project */}
        <div className="nice-scroll min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-ink-faint">
              <Loader2 size={15} className="animate-spin" /> Loading tasks…
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
                <ListTodo size={20} />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-ink">Nothing assigned</p>
              <p className="mt-0.5 text-[12px] text-ink-faint">
                {member.name.split(" ")[0]} has no tasks on the boards you can see.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <section key={project.id}>
                  {/* Project name — the group's own colour keeps it tied to the board */}
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: project.color }}
                    />
                    <h4 className="min-w-0 truncate text-[13px] font-bold text-ink">{project.name}</h4>
                    <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-muted">
                      {project.tasks.length}
                    </span>
                  </div>

                  <ul className="overflow-hidden rounded-xl border border-edge">
                    {project.tasks.map((task) => {
                      const late =
                        task.status !== "done" &&
                        task.due_date &&
                        isBefore(parseISO(task.due_date), today);
                      return (
                        <li key={task.id} className="border-b border-edge-soft last:border-b-0">
                          <button
                            type="button"
                            onClick={() => {
                              openTask(task.id);
                              onClose();
                            }}
                            className="flex w-full cursor-pointer items-center gap-2.5 bg-surface-raised px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-sunken"
                          >
                            {task.status === "done" ? (
                              <CheckCircle2 size={15} className="shrink-0 text-[#10B981]" />
                            ) : (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: STATUS_META[task.status].tint }}
                              />
                            )}
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-[13px]",
                                task.status === "done" ? "text-ink-muted line-through" : "text-ink"
                              )}
                            >
                              {task.title}
                            </span>
                            {task.due_date && (
                              <span
                                className={cn(
                                  "hidden shrink-0 items-center gap-1 text-[11.5px] sm:flex",
                                  late ? "font-semibold text-[#E2445C]" : "text-ink-faint"
                                )}
                                title={late ? "Overdue" : "Due date"}
                              >
                                <CalendarDays size={12} />
                                {format(parseISO(task.due_date), "MMM d")}
                              </span>
                            )}
                            {task.priority !== "no_priority" && (
                              <PriorityBadge priority={task.priority} />
                            )}
                            {/* Status chip drawn exactly like the board's status cell. */}
                            <span
                              className="inline-flex h-[32px] min-w-[96px] max-w-full shrink-0 items-center justify-center truncate rounded-full px-4 text-[12px] font-semibold"
                              style={{
                                backgroundColor: `${STATUS_META[task.status].tint}22`,
                                color: STATUS_META[task.status].tint,
                              }}
                            >
                              {STATUS_META[task.status].label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
