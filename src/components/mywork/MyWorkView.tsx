"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ListTodo,
} from "lucide-react";
import { format, isBefore, isToday, parseISO, startOfToday } from "date-fns";
import { api } from "@/lib/api";
import { useBoardStore } from "@/store/boardStore";
import { cn, STATUS_META } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AvatarStack } from "@/components/ui/Avatar";
import { PriorityBadge } from "@/components/ui/Badges";
import type { TaskCard, TaskStatus } from "@/lib/types";

/** A task from /tasks/my_work/ — a board card plus its project context. */
interface MyTask extends TaskCard {
  board: number;
  board_name: string;
  group_title: string;
  group_color: string;
}

/** Status buckets, in the order tasks are shown: To Do → Working → Review →
 * Completed. "Stuck" is still active work, so it rides along with Working. */
type Bucket = "todo" | "working" | "review" | "done";

const BUCKETS: {
  key: Bucket;
  label: string;
  statuses: TaskStatus[];
  color: string;
}[] = [
  { key: "todo", label: "To Do", statuses: ["not_started"], color: STATUS_META.not_started.tint },
  { key: "working", label: "Working", statuses: ["working", "stuck"], color: STATUS_META.working.tint },
  { key: "review", label: "In Review", statuses: ["review"], color: STATUS_META.review.tint },
  { key: "done", label: "Completed", statuses: ["done"], color: STATUS_META.done.tint },
];

const bucketIndex = (status: TaskStatus): number =>
  BUCKETS.findIndex((b) => b.statuses.includes(status));

/** Table column widths — matches the dense, bordered feel of the board table. */
const GRID = "minmax(220px, 1fr) 150px minmax(130px, 1fr) 120px 110px 96px";
const MIN_W = 880;

/** Status chip drawn exactly like the board's status cell: soft tint fill with
 * the accent as text. Read-only here (the row opens the task to edit it). */
function StatusSoftLabel({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex h-[32px] min-w-[96px] max-w-full items-center justify-center truncate rounded-full px-4 text-[12px] font-semibold"
      style={{ backgroundColor: `${meta.tint}22`, color: meta.tint }}
    >
      {meta.label}
    </span>
  );
}

/** Label pills drawn exactly like the board table: first two colored chips
 * plus a "+N" overflow. */
function LabelChips({ labels }: { labels: TaskCard["labels"] }) {
  if (labels.length === 0) return <span className="text-[12px] text-ink-faint">—</span>;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 overflow-hidden">
      {labels.slice(0, 2).map((l) => (
        <span
          key={l.id}
          className="inline-flex h-[18px] max-w-[76px] items-center truncate rounded-full px-2 text-[10.5px] font-semibold text-white"
          style={{ backgroundColor: l.color }}
        >
          {l.name}
        </span>
      ))}
      {labels.length > 2 && (
        <span className="text-[11px] font-semibold text-ink-faint">+{labels.length - 2}</span>
      )}
    </div>
  );
}

function StatCard({
  icon,
  color,
  value,
  label,
}: {
  icon: React.ReactNode;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-edge bg-surface-raised px-4 py-3.5 shadow-card">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ color, backgroundColor: `${color}1A` }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[20px] font-bold leading-tight text-ink">{value}</p>
        <p className="truncate text-[12px] font-medium text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

/** One project's tasks as a bordered table, headed by the project name. */
function ProjectTable({
  name,
  color,
  tasks,
  today,
  onOpen,
}: {
  name: string;
  color: string;
  tasks: MyTask[];
  today: Date;
  onOpen: (id: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-edge bg-surface-raised shadow-card">
      {/* Project header */}
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <span className="h-3 w-3 shrink-0 rounded-md" style={{ backgroundColor: color }} />
        <h3 className="min-w-0 truncate text-[14px] font-bold text-ink">{name}</h3>
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
          {tasks.length}
        </span>
      </div>

      <div className="nice-scroll overflow-x-auto">
        {/* Column headers */}
        <div
          className="grid h-9 items-center border-b border-edge bg-surface-sunken/60 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
          style={{ gridTemplateColumns: GRID, minWidth: MIN_W }}
        >
          <div className="truncate px-4">Task</div>
          <div className="truncate px-3">Status</div>
          <div className="truncate px-3 text-center">Labels</div>
          <div className="truncate px-3">Due date</div>
          <div className="truncate px-3">Group</div>
          <div className="truncate px-3 text-center">Priority</div>
        </div>

        {/* Rows */}
        {tasks.map((task, i) => {
          const late =
            task.status !== "done" && !!task.due_date && isBefore(parseISO(task.due_date), today);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onOpen(task.id)}
              className={cn(
                "grid h-[52px] w-full items-center text-left transition-colors duration-100 hover:bg-surface-sunken",
                i !== tasks.length - 1 && "border-b border-edge"
              )}
              style={{ gridTemplateColumns: GRID, minWidth: MIN_W }}
            >
              {/* Task + assignees */}
              <div className="flex min-w-0 items-center gap-2.5 px-4">
                <span
                  className="h-7 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_META[task.status].tint }}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13.5px] font-medium",
                    task.status === "done" ? "text-ink-muted line-through" : "text-ink"
                  )}
                  title={task.title}
                >
                  {task.title}
                </span>
                {task.assignees.length > 0 && (
                  <AvatarStack members={task.assignees} size={22} max={3} />
                )}
              </div>

              {/* Status */}
              <div className="px-3">
                <StatusSoftLabel status={task.status} />
              </div>

              {/* Labels */}
              <div className="flex min-w-0 items-center justify-center px-3">
                <LabelChips labels={task.labels} />
              </div>

              {/* Due date */}
              <div className="px-3">
                {task.due_date ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[12.5px] font-medium",
                      late ? "text-[#E2445C]" : "text-ink-muted"
                    )}
                    title={late ? "Overdue" : "Due date"}
                  >
                    <CalendarDays size={13} />
                    {format(parseISO(task.due_date), "MMM d")}
                  </span>
                ) : (
                  <span className="text-[12.5px] text-ink-faint">—</span>
                )}
              </div>

              {/* Group */}
              <div className="min-w-0 px-3">
                <span className="truncate text-[12.5px] text-ink-muted">{task.group_title}</span>
              </div>

              {/* Priority */}
              <div className="flex justify-center px-3">
                {task.priority !== "no_priority" ? (
                  <PriorityBadge priority={task.priority} />
                ) : (
                  <span className="text-[12.5px] text-ink-faint">—</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function MyWorkView() {
  const openTask = useBoardStore((s) => s.openTask);
  const activeTask = useBoardStore((s) => s.activeTask);
  const prevTask = useRef(activeTask);
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  // null = "All"; otherwise the single status bucket the chips have narrowed to.
  const [filter, setFilter] = useState<Bucket | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<MyTask[]>("/tasks/my_work/");
      setTasks(data);
    } catch {
      /* a failed fetch just leaves the last list in place */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh silently after the task panel closes — status/due may have changed.
  useEffect(() => {
    if (prevTask.current && !activeTask) load(true);
    prevTask.current = activeTask;
  }, [activeTask, load]);

  const today = startOfToday();
  const isOverdue = (t: MyTask) =>
    t.status !== "done" && !!t.due_date && isBefore(parseISO(t.due_date), today);

  const counts = useMemo(
    () => ({
      assigned: tasks.length,
      done: tasks.filter((t) => t.status === "done").length,
      overdue: tasks.filter(isOverdue).length,
      today: tasks.filter(
        (t) => t.status !== "done" && t.due_date && isToday(parseISO(t.due_date))
      ).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks]
  );

  const bucketCount = (key: Bucket) =>
    tasks.filter((t) => BUCKETS.find((b) => b.key === key)!.statuses.includes(t.status)).length;

  // Group by project; within each, sort To Do → Working → Review → Done, keeping
  // the server's due-date order inside a status. Projects keep first-seen order.
  const projects = useMemo(() => {
    const active = BUCKETS.find((b) => b.key === filter);
    const visible = active ? tasks.filter((t) => active.statuses.includes(t.status)) : tasks;
    const byBoard = new Map<number, { name: string; color: string; tasks: MyTask[] }>();
    for (const t of visible) {
      const entry = byBoard.get(t.board) ?? { name: t.board_name, color: t.group_color, tasks: [] };
      entry.tasks.push(t);
      byBoard.set(t.board, entry);
    }
    // Sort each project's tasks To Do → Working → Review → Done, keeping the
    // server's due-date order inside a status.
    return Array.from(byBoard, ([id, v]) => ({
      id,
      name: v.name,
      color: v.color,
      tasks: v.tasks
        .map((t, i) => ({ t, i }))
        .sort((a, b) => bucketIndex(a.t.status) - bucketIndex(b.t.status) || a.i - b.i)
        .map((x) => x.t),
    }));
  }, [tasks, filter]);

  if (loading && tasks.length === 0) {
    return (
      <div className="nice-scroll flex-1 overflow-y-auto pt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-2xl border border-edge bg-surface-raised" />
          ))}
        </div>
        <div className="mt-5 h-[320px] animate-pulse rounded-2xl border border-edge bg-surface-raised" />
      </div>
    );
  }

  return (
    <div className="nice-scroll flex-1 overflow-y-auto pt-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<ListTodo size={19} />} color="#8B5CF6" value={counts.assigned} label="Assigned to me" />
        <StatCard icon={<CalendarDays size={19} />} color="#247DF9" value={counts.today} label="Due today" />
        <StatCard icon={<ClipboardList size={19} />} color="#F03650" value={counts.overdue} label="Overdue" />
        <StatCard icon={<CheckCircle2 size={19} />} color="#11B875" value={counts.done} label="Completed" />
      </div>

      {/* Status filter */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter(null)}
          aria-pressed={filter === null}
          className={cn(
            "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors duration-150",
            filter === null
              ? "border-transparent bg-primary-soft text-primary dark:bg-primary/20"
              : "border-edge text-ink-muted hover:bg-surface-sunken hover:text-ink"
          )}
        >
          All
          <span
            className={cn(
              "flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold",
              filter === null ? "bg-primary/15 text-primary" : "bg-surface-sunken text-ink-muted"
            )}
          >
            {tasks.length}
          </span>
        </button>
        {BUCKETS.map((b) => {
          const active = filter === b.key;
          const n = bucketCount(b.key);
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setFilter(active ? null : b.key)}
              aria-pressed={active}
              className={cn(
                "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors duration-150",
                !active && "border-edge text-ink-muted hover:bg-surface-sunken hover:text-ink"
              )}
              style={active ? { borderColor: "transparent", backgroundColor: `${b.color}1A`, color: b.color } : undefined}
            >
              <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: b.color }} />
              {b.label}
              <span
                className={cn(
                  "flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold",
                  !active && "bg-surface-sunken text-ink-muted"
                )}
                style={active ? { backgroundColor: `${b.color}26`, color: b.color } : undefined}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Projects, each a table of its tasks */}
      <div className="mt-4 space-y-4 pb-6">
        {projects.length === 0 ? (
          <EmptyState
            icon={<ListTodo size={22} />}
            title={tasks.length === 0 ? "Nothing assigned yet" : "Nothing here"}
            message={
              tasks.length === 0
                ? "Tasks assigned to you across every board will show up here."
                : "No tasks in this status. Pick another filter."
            }
          />
        ) : (
          projects.map((project) => (
            <ProjectTable
              key={project.id}
              name={project.name}
              color={project.color}
              tasks={project.tasks}
              today={today}
              onOpen={openTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
