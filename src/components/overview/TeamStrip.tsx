"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, CircleAlert, Palmtree, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useBoardStore } from "@/store/boardStore";
import { countryFlag, countryLabel, timezoneLocalTime } from "@/lib/locations";
import { MemberTasksPanel } from "@/components/overview/MemberTasksPanel";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { LeaveRequest, Member } from "@/lib/types";

/** Open-task tally per member, keyed by member id. From /tasks/workload/. */
export type Workload = Record<number, { todo: number; working: number; done: number; total: number }>;

/** Collapsed view shows one row: this many member cards plus the "+N" tile. */
const COLLAPSED_COUNT = 5;

/** Figma palette (node 130:9107, light) */
const RED = "#F03650";
const ORANGE = "#FDA633";
/** Teal — the "on holiday" accent, matching the leave/calendar palette. */
const HOLIDAY = "#14B8A6";

/** Ticking wall-clock for one teammate's zone; blank until a zone is set. */
function useNow(intervalMs = 30_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

interface WorkloadTone {
  color: string;
  icon: LucideIcon;
}

/** Colour + avatar-corner icon for a member whose queue needs attention.
 *
 * Admin-only: orange (danger circle) when someone's only got tasks still in
 * progress, red (danger triangle) when they've nothing to work on at all.
 * Members always see the neutral counts. Returns `null` while there's still
 * "to do" work queued. */
function workloadTone(
  load: Workload[number] | undefined,
  viewerIsAdmin: boolean
): WorkloadTone | null {
  if (!viewerIsAdmin) return null;
  const todo = load?.todo ?? 0;
  const working = load?.working ?? 0;
  if (todo > 0) return null;
  return working > 0
    ? { color: ORANGE, icon: CircleAlert }
    : { color: RED, icon: TriangleAlert };
}

function TeamCard({
  member,
  load,
  tone,
  holiday,
  onOpen,
}: {
  member: Member;
  load: Workload[number] | undefined;
  tone: WorkloadTone | null;
  /** True when the member is on approved leave today. */
  holiday: boolean;
  onOpen: () => void;
}) {
  const time = member.timezone ? timezoneLocalTime(member.timezone) : "";
  const flag = member.country ? countryFlag(member.country) : "";
  const place = member.country ? countryLabel(member.country) : "";
  const todo = load?.todo ?? 0;
  const working = load?.working ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`See ${member.name}'s tasks${holiday ? " · On holiday" : ""}${place ? ` · ${place}` : ""}`}
      className={cn(
        "relative flex min-w-0 cursor-pointer items-center gap-[17px] rounded-[16px] border-[1.5px] px-[19px] py-[20px] text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        holiday
          ? "border-[#14B8A6]/40 bg-[#14B8A6]/[0.06] hover:border-[#14B8A6] dark:bg-[#14B8A6]/[0.08]"
          : "border-[#EDEEF2] bg-white hover:border-primary/50 dark:border-edge dark:bg-surface-raised"
      )}
    >
      {/* Local time + flag — top-right corner */}
      {(time || flag) && (
        <span className="pointer-events-none absolute right-[8px] top-[8.5px] flex items-center gap-[8px]">
          {time && (
            <span className="text-[12px] font-medium leading-none text-[rgba(38,45,57,0.54)] dark:text-ink-faint">
              {time}
            </span>
          )}
          {flag && <span className="text-[13px] leading-none">{flag}</span>}
        </span>
      )}

      {/* Avatar — 60px circle with presence dot + admin warning icon */}
      <span className="relative h-[60px] w-[60px] shrink-0">
        {member.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatars come from the API host, not the Next image loader
          <img
            src={member.avatar}
            alt={member.name}
            className="h-[60px] w-[60px] rounded-full bg-[#F5F5FA] object-cover object-top dark:bg-surface-sunken"
          />
        ) : (
          <span
            className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-[20px] font-semibold text-white"
            style={{ backgroundColor: member.color }}
          >
            {member.initials}
          </span>
        )}
        <span
          className="absolute bottom-[4px] right-[4px] h-[10px] w-[10px] rounded-full border-2 border-white dark:border-surface-raised"
          style={{ backgroundColor: holiday ? HOLIDAY : "#01AD64" }}
        />
        {holiday ? (
          <span className="absolute -left-px -top-px" style={{ color: HOLIDAY }}>
            <Palmtree size={15} strokeWidth={2.4} />
          </span>
        ) : (
          tone && (
            <span className="absolute -left-px -top-px" style={{ color: tone.color }}>
              <tone.icon size={14} strokeWidth={2.4} />
            </span>
          )
        )}
      </span>

      {/* Name + workload counts (or holiday state) */}
      <span className="flex min-w-0 flex-1 flex-col gap-[8px]">
        <span className="truncate text-[16px] font-bold leading-none text-[#262D39] dark:text-ink">
          {member.name}
        </span>
        {holiday ? (
          <span
            className="flex items-center gap-1 truncate text-[11px] font-semibold leading-none"
            style={{ color: HOLIDAY }}
          >
            <Palmtree size={12} strokeWidth={2.4} /> On holiday
          </span>
        ) : (
          <span
            className={cn(
              "truncate text-[11px] font-medium leading-none",
              !tone && "text-[rgba(38,45,57,0.7)] dark:text-ink-muted"
            )}
            style={tone ? { color: tone.color } : undefined}
          >
            {todo} To Do - {working} In Progress
          </span>
        )}
      </span>
    </button>
  );
}

/** Admin-only team filter: everyone, red (no tasks), or orange (almost out). */
type TeamFilter = "all" | "red" | "orange";

function FilterPill({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 cursor-pointer items-center gap-[6px] rounded-[8px] border px-[10px] text-[12px] font-semibold transition-colors duration-150",
        active
          ? "border-transparent"
          : "border-[#EDEEF2] bg-white text-[#55596B] hover:bg-surface-sunken dark:border-edge dark:bg-surface-raised dark:text-ink-muted"
      )}
      style={active ? { color: color ?? "#262D39", backgroundColor: `${color ?? "#262D39"}1A` } : undefined}
    >
      {color && <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <span
        className={cn(
          "flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold",
          !active && "bg-surface-sunken text-ink-muted"
        )}
        style={active ? { backgroundColor: `${color ?? "#262D39"}26` } : undefined}
      >
        {count}
      </span>
    </button>
  );
}

export function TeamStrip({ workload }: { workload: Workload }) {
  const members = useBoardStore((s) => s.members);
  const viewerIsAdmin = useBoardStore((s) => s.currentMember?.role === "admin");
  const [active, setActive] = useState<Member | null>(null);
  // Collapsed by default: the page lands on a single row of cards plus the +N
  // tile, and the viewer opts into the full team via "View all".
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<TeamFilter>("all");
  // Member ids on approved leave today — approved leaves are visible to everyone.
  const [onLeave, setOnLeave] = useState<Set<number>>(new Set());
  useNow();

  useEffect(() => {
    let cancelled = false;
    api
      .get<LeaveRequest[]>("/leaves/")
      .then((leaves) => {
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        setOnLeave(
          new Set(
            leaves
              .filter((l) => l.status === "approved" && l.start_date <= today && l.end_date >= today)
              .map((l) => l.member)
          )
        );
      })
      .catch(() => {
        /* holiday badge is a hint; a failed fetch just leaves it off */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (members.length === 0) return null;

  // Tone per member, computed once — drives both the cards and the filter.
  const tones = new Map<number, WorkloadTone | null>(
    members.map((m) => [m.id, workloadTone(workload[m.id], !!viewerIsAdmin)])
  );
  const redCount = members.filter((m) => tones.get(m.id)?.color === RED).length;
  const orangeCount = members.filter((m) => tones.get(m.id)?.color === ORANGE).length;

  // Members on holiday always sink to the end. Among the rest, admins see who
  // needs work first: red (nothing to do), then orange (almost out), then
  // everyone else; non-admins keep the directory order.
  const rank = (m: Member) => {
    if (onLeave.has(m.id)) return 3;
    if (!viewerIsAdmin) return 2;
    const color = tones.get(m.id)?.color;
    if (color === RED) return 0;
    if (color === ORANGE) return 1;
    return 2;
  };
  const ordered = members
    .map((m, i) => ({ m, i }))
    .sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i)
    .map((x) => x.m);

  const filtered =
    filter === "all"
      ? ordered
      : ordered.filter((m) => tones.get(m.id)?.color === (filter === "red" ? RED : ORANGE));

  // Collapse only applies to the unfiltered view; a filter shows every match.
  const hasMore = filter === "all" && filtered.length > COLLAPSED_COUNT;
  const visible = expanded || !hasMore ? filtered : filtered.slice(0, COLLAPSED_COUNT);
  const hiddenCount = filtered.length - COLLAPSED_COUNT;

  return (
    <section className="pt-[24px]">
      <div className="mb-[10px] flex flex-wrap items-center gap-2">
        <h2 className="text-[19px] font-bold text-[#262D39] dark:text-ink">Team</h2>
        <div className="ml-auto flex flex-wrap items-center gap-[8px]">
          {viewerIsAdmin && (
            <>
              <FilterPill
                label="All"
                count={members.length}
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />
              <FilterPill
                label="No tasks"
                count={redCount}
                color={RED}
                active={filter === "red"}
                onClick={() => setFilter(filter === "red" ? "all" : "red")}
              />
              <FilterPill
                label="Almost out of work"
                count={orangeCount}
                color={ORANGE}
                active={filter === "orange"}
                onClick={() => setFilter(filter === "orange" ? "all" : "orange")}
              />
            </>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex cursor-pointer items-center gap-[10px] rounded-[8px] px-1.5 py-1 text-[12.5px] font-semibold text-[#262D39] transition-colors duration-150 hover:bg-surface-sunken dark:text-ink"
            >
              {expanded ? (
                <>
                  View less <ChevronDown size={16} />
                </>
              ) : (
                <>
                  View all <ChevronRight size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-[16px] border-[1.5px] border-dashed border-[#EDEEF2] bg-white px-4 py-6 text-center text-[12.5px] text-ink-muted dark:border-edge dark:bg-surface-raised">
          {filter === "red" ? "Nobody is out of work — everyone has tasks." : "Nobody is almost out of work right now."}
        </p>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3",
            expanded || !hasMore
              ? "xl:grid-cols-5"
              : "xl:grid-cols-[repeat(5,minmax(0,1fr))_100px]"
          )}
        >
          {visible.map((m) => (
            <TeamCard
              key={m.id}
              member={m}
              load={workload[m.id]}
              tone={tones.get(m.id) ?? null}
              holiday={onLeave.has(m.id)}
              onOpen={() => setActive(m)}
            />
          ))}
          {!expanded && hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              title={`Show ${hiddenCount} more teammates`}
              className="flex min-h-[100px] cursor-pointer items-center justify-center rounded-[16px] border-[1.5px] border-[#EDEEF2] bg-white px-[20px] py-[13px] text-[22px] font-extrabold text-[#262D39] transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-edge dark:bg-surface-raised dark:text-ink"
            >
              +{hiddenCount}
            </button>
          )}
        </div>
      )}

      <MemberTasksPanel member={active} onClose={() => setActive(null)} />
    </section>
  );
}
