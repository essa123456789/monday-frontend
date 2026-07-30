"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  NotebookText,
  Plus,
  UsersRound,
} from "lucide-react";
import { endOfISOWeek, format, getISOWeek, parseISO, startOfISOWeek } from "date-fns";
import { api } from "@/lib/api";
import { useBoardStore } from "@/store/boardStore";
import { useOverviewStore, type OverviewProject } from "@/store/overviewStore";
import { TeamStrip, type Workload } from "@/components/overview/TeamStrip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, GROUP_COLORS } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** Week table columns: Project | To Do | In Progress | In Review | Completed | Total */
const GRID = "minmax(280px, 1fr) repeat(5, 140px)";
const MIN_W = 1000;

/** Count colours per column — Figma node 130:9107 (light). */
const COL = {
  todo: "#247DF9",
  progress: "#8B5CF6",
  review: "#FDA633",
  done: "#11B875",
} as const;

/** Stat-card accents — icon colour at 100%, tile fill at 10%. */
const STAT = {
  purple: "#8B5CF6",
  rose: "#F03650",
  orange: "#FDA633",
  blue: "#247DF9",
  green: "#11B875",
} as const;

interface ProjectCounts {
  todo: number;
  progress: number;
  review: number;
  done: number;
  total: number;
}

/** Status tallies over a project's week tasks (the sprint parent is a meta
 * row, so it stays out). "Stuck" is still active work → In Progress. */
function projectCounts(project: OverviewProject): ProjectCounts {
  const counts = { todo: 0, progress: 0, review: 0, done: 0, total: project.tasks.length };
  for (const t of project.tasks) {
    if (t.status === "not_started") counts.todo += 1;
    else if (t.status === "working" || t.status === "stuck") counts.progress += 1;
    else if (t.status === "review") counts.review += 1;
    else if (t.status === "done") counts.done += 1;
  }
  return counts;
}

function StatCard({
  icon: Icon,
  color,
  value,
  label,
  sub,
}: {
  icon: LucideIcon;
  color: string;
  value: number;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-[20px] rounded-[16px] border-[1.5px] border-[#EDEEF2] bg-white p-[20px] dark:border-edge dark:bg-surface-raised">
      <span
        className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[10px]"
        style={{ color, backgroundColor: `${color}1A` }}
      >
        <Icon size={24} strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-col gap-[10px]">
        <p className="text-[34px] font-bold leading-none text-[#262D39] dark:text-ink">{value}</p>
        <p className="truncate text-[14px] font-bold leading-none text-[#262D39] dark:text-ink">{label}</p>
        <p className="truncate text-[12px] leading-none text-[rgba(38,45,57,0.7)] dark:text-ink-muted">{sub}</p>
      </div>
    </div>
  );
}

/** A coloured count cell — 15px semibold, per-column colour. */
function Num({ value, color }: { value: number; color?: string }) {
  return (
    <span
      className={cn("text-[15px] font-semibold", !color && "text-[#262D39] dark:text-ink")}
      style={color ? { color } : undefined}
    >
      {value}
    </span>
  );
}

function ProjectRow({ project }: { project: OverviewProject }) {
  const counts = projectCounts(project);
  const color = GROUP_COLORS[project.board.id % GROUP_COLORS.length];

  return (
    <Link
      href={`/board/${project.board.id}`}
      title={`Open board ${project.board.name}`}
      className="grid h-[54px] items-center border-b border-[#E2E2E2] transition-colors duration-100 hover:bg-[#FAFAFC] dark:border-edge-soft dark:hover:bg-surface-sunken"
      style={{ gridTemplateColumns: GRID, minWidth: MIN_W }}
    >
      <div className="flex min-w-0 items-center gap-[16px]">
        {project.board.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logos come from the API host, not the Next image loader
          <img
            src={project.board.logo}
            alt=""
            className="h-[30px] w-[30px] shrink-0 rounded-full bg-white object-cover dark:bg-surface-sunken"
          />
        ) : (
          <span
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {project.board.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate text-[15px] font-semibold text-[#262D39] dark:text-ink">
          {project.board.name}
        </span>
      </div>
      <div className="text-center"><Num value={counts.todo} color={COL.todo} /></div>
      <div className="text-center"><Num value={counts.progress} color={COL.progress} /></div>
      <div className="text-center"><Num value={counts.review} color={COL.review} /></div>
      <div className="text-center"><Num value={counts.done} color={COL.done} /></div>
      <div className="text-center"><Num value={counts.total} /></div>
    </Link>
  );
}

export function OverviewView() {
  const anchor = useOverviewStore((s) => s.anchor);
  const loading = useOverviewStore((s) => s.loading);
  const projects = useOverviewStore((s) => s.projects);
  const load = useOverviewStore((s) => s.load);
  const shiftWeek = useOverviewStore((s) => s.shiftWeek);
  const goToday = useOverviewStore((s) => s.goToday);
  const members = useBoardStore((s) => s.members);
  const activeTask = useBoardStore((s) => s.activeTask);
  const prevTask = useRef(activeTask);
  const [workload, setWorkload] = useState<Workload>({});

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh silently after the task panel closes (details may have changed there)
  useEffect(() => {
    if (prevTask.current && !activeTask) load(true);
    prevTask.current = activeTask;
  }, [activeTask, load]);

  // Per-member workload — feeds the team cards and the "with no tasks" stat.
  // Refetched whenever the task panel closes, so a status change there keeps
  // the counts honest without a manual reload.
  useEffect(() => {
    if (activeTask) return;
    let cancelled = false;
    api
      .get<Workload>("/tasks/workload/")
      .then((data) => {
        if (!cancelled) setWorkload(data);
      })
      .catch(() => {
        /* counts are a hint; a failed fetch just leaves them at 0 */
      });
    return () => {
      cancelled = true;
    };
  }, [activeTask]);

  // Kiosk / always-on safety net. Live updates ride a WebSocket, which can be
  // silently dropped on a long-running display (proxy idle timeouts, throttled
  // tabs) with no close event — leaving the page frozen on its first load. Poll
  // a silent refresh so the Overview stays current no matter the socket's state.
  useEffect(() => {
    const REFRESH_MS = 5_000;
    const id = setInterval(() => {
      // Don't fight an open task panel; the close handler above refreshes anyway.
      if (useBoardStore.getState().activeTask) return;
      load(true);
      api
        .get<Workload>("/tasks/workload/")
        .then(setWorkload)
        .catch(() => {});
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const anchorDate = parseISO(anchor);
  const week = getISOWeek(anchorDate);
  const rangeLabel = `${format(startOfISOWeek(anchorDate), "MMM d")} – ${format(endOfISOWeek(anchorDate), "MMM d, yyyy")}`;
  const isCurrentWeek =
    format(startOfISOWeek(anchorDate), "yyyy-MM-dd") === format(startOfISOWeek(new Date()), "yyyy-MM-dd");

  // Workspace-wide numbers for the stat cards
  const weekTasks = projects.flatMap((p) => p.tasks);
  const inReview = weekTasks.filter((t) => t.status === "review").length;
  const notStarted = weekTasks.filter((t) => t.status === "not_started").length;
  const completed = weekTasks.filter((t) => t.status === "done").length;
  const idleMembers = members.filter((m) => {
    const w = workload[m.id];
    return !w || (w.todo === 0 && w.working === 0);
  }).length;

  const firstLoad = loading && projects.length === 0;

  return (
    <div className="nice-scroll flex-1 overflow-y-auto pb-6">
      <TeamStrip workload={workload} />

      {/* Stat cards */}
      {firstLoad ? (
        <div className="mt-[65px] grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[114px] w-full rounded-[16px]" />
          ))}
        </div>
      ) : (
        <div className="mt-[65px] grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard icon={NotebookText} color={STAT.purple} value={projects.length} label="Projects" sub="Currently active" />
          <StatCard icon={UsersRound} color={STAT.rose} value={idleMembers} label="Team members" sub="With no tasks" />
          <StatCard icon={Eye} color={STAT.orange} value={inReview} label="Tasks in review" sub="To get checked" />
          <StatCard icon={Plus} color={STAT.blue} value={notStarted} label="Open tickets" sub="Needs to get started" />
          <StatCard icon={Check} color={STAT.green} value={completed} label="Tasks completed" sub="This week" />
        </div>
      )}

      {/* Week summary */}
      <section className="mt-[26px] overflow-hidden rounded-[16px] border border-[#EDEDED] bg-white dark:border-edge dark:bg-surface-raised">
        <header className="flex flex-wrap items-center gap-[8px] border-b border-[#E2E2E2] p-[20px] dark:border-edge">
          <h2 className="text-[19px] font-bold text-[#262D39] dark:text-ink">Week {week}</h2>
          <span className="text-[13px] text-[#55596B] dark:text-ink-muted">{rangeLabel}</span>
          <div className="ml-auto flex items-center gap-[4px]">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              aria-label="Previous week"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#EDEDED] text-[#55596B] transition-colors duration-150 hover:bg-surface-sunken hover:text-ink dark:border-edge dark:text-ink-muted"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToday}
              disabled={isCurrentWeek}
              className={cn(
                "h-8 cursor-pointer rounded-[8px] border border-[#EDEDED] px-[13px] text-[12.5px] font-medium transition-colors duration-150 dark:border-edge",
                isCurrentWeek
                  ? "cursor-default text-[#B0B3C0] dark:text-ink-faint"
                  : "text-[#55596B] hover:bg-surface-sunken hover:text-ink dark:text-ink-muted"
              )}
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              aria-label="Next week"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#EDEDED] text-[#55596B] transition-colors duration-150 hover:bg-surface-sunken hover:text-ink dark:border-edge dark:text-ink-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        <div className="nice-scroll overflow-x-auto px-[20px] pb-[20px]">
          {/* Column headers */}
          <div
            className="grid h-[40px] items-center border-b border-[#E2E2E2] text-[11.5px] font-medium text-[#262D39] dark:border-edge-soft dark:text-ink-muted"
            style={{ gridTemplateColumns: GRID, minWidth: MIN_W }}
          >
            <div className="pl-[32px]">Project</div>
            <div className="text-center">To Do</div>
            <div className="text-center">In Progress</div>
            <div className="text-center">In Review</div>
            <div className="text-center">Completed</div>
            <div className="text-center">Total</div>
          </div>

          {loading ? (
            <div className="space-y-2 py-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[42px] w-full rounded-lg" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="py-4">
              <EmptyState
                icon={<CalendarDays size={22} />}
                title="No projects yet"
                message="Create a board from the sidebar and it will appear here with its weekly sprint."
              />
            </div>
          ) : (
            projects.map((project) => <ProjectRow key={project.board.id} project={project} />)
          )}
        </div>
      </section>
    </div>
  );
}
