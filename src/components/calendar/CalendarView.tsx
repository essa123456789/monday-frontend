"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cake,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Palmtree,
  Plus,
  Video,
} from "lucide-react";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { api } from "@/lib/api";
import { useBoardStore } from "@/store/boardStore";
import { cn, PRIORITY_META, STATUS_META } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Badges";
import { LEAVE_ACCENT, LEAVE_META, leaveRangeText } from "@/components/leave/LeavesView";
import { MeetingModal } from "@/components/meetings/MeetingModal";
import { MeetingRow } from "@/components/meetings/MeetingRow";
import type {
  BoardDetail,
  BoardListItem,
  LeaveRequest,
  Meeting,
  Member,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

const BIRTHDAY_COLOR = "#FF7AB3";
const MEETING_COLOR = "#6C6CFF";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A due task flattened out of its board for calendar display. */
interface CalendarTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assignees: Member[];
  boardName: string;
  parentTitle: string | null;
}

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
const monthDayKey = (iso: string) => iso.slice(5); // "MM-dd" — birthdays recur yearly

function birthdayAge(member: Member, onDate: Date): number | null {
  if (!member.birthday) return null;
  const age = onDate.getFullYear() - parseISO(member.birthday).getFullYear();
  return age > 0 && age < 120 ? age : null;
}

// ---------------------------------------------------------------- month card

function MonthCard({
  month,
  selected,
  onSelect,
  tasksByDay,
  birthdaysByMonthDay,
  leavesByDay,
  meetingsByDay,
}: {
  month: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  tasksByDay: Map<string, CalendarTask[]>;
  birthdaysByMonthDay: Map<string, Member[]>;
  leavesByDay: Map<string, LeaveRequest[]>;
  meetingsByDay: Map<string, Meeting[]>;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <section className="rounded-2xl border border-edge bg-surface-raised p-4 shadow-card">
      <h2 className="px-1 pb-3 text-[14.5px] font-bold text-ink">{format(month, "MMMM yyyy")}</h2>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="pb-1 text-center text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint"
          >
            {d}
          </span>
        ))}

        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const key = dayKey(day);
          const dayTasks = inMonth ? tasksByDay.get(key) ?? [] : [];
          const dayBirthdays = inMonth ? birthdaysByMonthDay.get(key.slice(5)) ?? [] : [];
          const dayLeaves = inMonth ? leavesByDay.get(key) ?? [] : [];
          const dayMeetings = inMonth ? meetingsByDay.get(key) ?? [] : [];
          const hasEvents =
            dayTasks.length > 0 ||
            dayBirthdays.length > 0 ||
            dayLeaves.length > 0 ||
            dayMeetings.length > 0;
          const today = isToday(day);
          const isSelected = inMonth && isSameDay(day, selected);
          // One dot per status present that day keeps busy days readable.
          const dotStatuses = Array.from(new Set(dayTasks.map((t) => t.status))).slice(0, 3);

          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => onSelect(day)}
              aria-label={`${format(day, "EEEE, MMMM d")}${
                hasEvents
                  ? ` — ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"} due${
                      dayBirthdays.length ? `, ${dayBirthdays.length} birthday${dayBirthdays.length === 1 ? "" : "s"}` : ""
                    }${dayLeaves.length ? `, ${dayLeaves.length} on leave` : ""}${
                      dayMeetings.length ? `, ${dayMeetings.length} meeting${dayMeetings.length === 1 ? "" : "s"}` : ""
                    }`
                  : ""
              }`}
              aria-pressed={isSelected}
              className={cn(
                "relative flex h-[52px] flex-col items-center rounded-lg pt-1.5 outline-none transition-colors duration-150",
                inMonth
                  ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  : "cursor-default opacity-0 sm:opacity-30",
                isSelected
                  ? "bg-primary-soft ring-1 ring-primary dark:bg-primary/20"
                  : inMonth && "hover:bg-surface-sunken"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[12.5px]",
                  today
                    ? "bg-primary font-bold text-white"
                    : isSelected
                      ? "font-bold text-primary"
                      : hasEvents
                        ? "font-semibold text-ink"
                        : "font-medium text-ink-muted"
                )}
              >
                {format(day, "d")}
              </span>

              {hasEvents && (
                <span className="mt-1 flex items-center gap-[3px]">
                  {dotStatuses.map((s) => (
                    <span
                      key={s}
                      className="h-[5px] w-[5px] rounded-full"
                      style={{ backgroundColor: STATUS_META[s].color }}
                    />
                  ))}
                  {dayBirthdays.length > 0 && (
                    <Cake size={9} strokeWidth={2.75} style={{ color: BIRTHDAY_COLOR }} />
                  )}
                  {dayLeaves.length > 0 && (
                    <Palmtree size={9} strokeWidth={2.75} style={{ color: LEAVE_ACCENT }} />
                  )}
                  {dayMeetings.length > 0 && (
                    <Video size={9} strokeWidth={2.75} style={{ color: MEETING_COLOR }} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ------------------------------------------------------------- details panel

function DayDetails({
  selected,
  tasks,
  birthdays,
  leaves,
  meetings,
  currentMemberId,
  onMeetingCancelled,
}: {
  selected: Date;
  tasks: CalendarTask[];
  birthdays: Member[];
  leaves: LeaveRequest[];
  meetings: Meeting[];
  currentMemberId: number | undefined;
  onMeetingCancelled: (id: number) => void;
}) {
  const openTask = useBoardStore((s) => s.openTask);
  const overdue = (t: CalendarTask) =>
    t.status !== "done" && differenceInCalendarDays(parseISO(t.due_date), new Date()) < 0;

  // Open work first (by priority), finished work last.
  const sorted = [...tasks].sort((a, b) => {
    if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1;
    return PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
  });

  return (
    <aside className="flex min-w-0 flex-col rounded-2xl border border-edge bg-surface-raised p-4 shadow-card xl:w-[360px] xl:shrink-0">
      <div className="flex items-start justify-between gap-2 border-b border-edge pb-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink">{format(selected, "EEEE, MMMM d")}</h2>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} due
            {birthdays.length > 0 &&
              ` · ${birthdays.length} birthday${birthdays.length === 1 ? "" : "s"}`}
            {leaves.length > 0 && ` · ${leaves.length} on leave`}
            {meetings.length > 0 &&
              ` · ${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {isToday(selected) && (
          <span className="shrink-0 rounded-md bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary dark:bg-primary/20">
            Today
          </span>
        )}
      </div>

      <div className="nice-scroll min-h-0 flex-1 space-y-4 overflow-y-auto pt-3">
        {meetings.length > 0 && (
          <div>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">
              <Video size={11} style={{ color: MEETING_COLOR }} /> Meetings
            </h3>
            <div className="space-y-1.5">
              {[...meetings]
                .sort((a, b) => a.start_at.localeCompare(b.start_at))
                .map((m) => (
                  <MeetingRow
                    key={m.id}
                    meeting={m}
                    currentMemberId={currentMemberId}
                    onCancelled={onMeetingCancelled}
                  />
                ))}
            </div>
          </div>
        )}

        {birthdays.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <Cake size={12} style={{ color: BIRTHDAY_COLOR }} /> Birthdays
            </h3>
            <ul className="space-y-1.5">
              {birthdays.map((m) => {
                const age = birthdayAge(m, selected);
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-lg border border-edge px-2.5 py-2"
                    style={{ backgroundColor: `${BIRTHDAY_COLOR}0D` }}
                  >
                    <Avatar member={m} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{m.name}</p>
                      <p className="text-[11.5px] text-ink-faint">
                        {age !== null ? `Turns ${age}` : "Birthday"}
                      </p>
                    </div>
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${BIRTHDAY_COLOR}22`, color: BIRTHDAY_COLOR }}
                    >
                      <Cake size={14} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {leaves.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <Palmtree size={12} style={{ color: LEAVE_ACCENT }} /> On leave
            </h3>
            <ul className="space-y-1.5">
              {leaves.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-2.5 rounded-lg border border-edge px-2.5 py-2"
                  style={{ backgroundColor: `${LEAVE_ACCENT}0D` }}
                >
                  <Avatar member={l.member_detail} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{l.member_detail.name}</p>
                    <p className="truncate text-[11.5px] text-ink-faint">
                      {LEAVE_META[l.leave_type].label} · {leaveRangeText(l)} · back{" "}
                      {format(addDays(parseISO(l.end_date), 1), "MMM d")}
                    </p>
                  </div>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: `${LEAVE_META[l.leave_type].color}22`,
                      color: LEAVE_META[l.leave_type].color,
                    }}
                  >
                    <Palmtree size={14} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sorted.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <Clock size={12} /> Tasks due
            </h3>
            <ul className="space-y-1.5">
              {sorted.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTask(t.id)}
                    className="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-edge px-2.5 py-2 text-left transition-colors duration-150 hover:border-primary/40 hover:bg-surface-sunken"
                  >
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_META[t.status].color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink group-hover:text-primary">
                        {t.title}
                      </p>
                      <p className="truncate text-[11.5px] text-ink-faint">
                        {t.boardName}
                        {t.parentTitle && ` · ${t.parentTitle}`}
                        {overdue(t) && (
                          <span className="ml-1.5 font-semibold text-[#E2445C]">Overdue</span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {t.assignees.slice(0, 3).map((m) => (
                        <Avatar key={m.id} member={m} size={22} />
                      ))}
                      <StatusPill status={t.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sorted.length === 0 && birthdays.length === 0 && leaves.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
              <CheckCircle2 size={20} />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-ink">Nothing on this day</p>
            <p className="mt-0.5 text-[12px] text-ink-faint">
              No due dates or birthdays — pick a highlighted date.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------- main view

export function CalendarView() {
  const [baseMonth, setBaseMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingModal, setMeetingModal] = useState(false);
  const currentMember = useBoardStore((s) => s.currentMember);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [boards, memberList, leaveList, meetingList] = await Promise.all([
          api.get<BoardListItem[]>("/boards/"),
          api.get<Member[]>("/members/"),
          api.get<LeaveRequest[]>("/leaves/"),
          api.get<Meeting[]>("/meetings/"),
        ]);
        const details = await Promise.all(
          boards.map((b) => api.get<BoardDetail>(`/boards/${b.id}/`))
        );
        const collected: CalendarTask[] = [];
        for (const board of details) {
          for (const group of board.groups) {
            for (const task of group.tasks) {
              if (task.due_date) {
                collected.push({
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  priority: task.priority,
                  due_date: task.due_date,
                  assignees: task.assignees,
                  boardName: board.name,
                  parentTitle: null,
                });
              }
              for (const sub of task.subitems ?? []) {
                if (sub.due_date) {
                  collected.push({
                    id: sub.id,
                    title: sub.title,
                    status: sub.status,
                    priority: sub.priority,
                    due_date: sub.due_date,
                    assignees: sub.assignees,
                    boardName: board.name,
                    parentTitle: task.title,
                  });
                }
              }
            }
          }
        }
        if (!cancelled) {
          setTasks(collected);
          setMembers(memberList);
          setLeaves(leaveList.filter((l) => l.status === "approved"));
          setMeetings(meetingList);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const t of tasks) {
      const list = map.get(t.due_date);
      if (list) list.push(t);
      else map.set(t.due_date, [t]);
    }
    return map;
  }, [tasks]);

  const birthdaysByMonthDay = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of members) {
      if (!m.birthday) continue;
      const key = monthDayKey(m.birthday);
      const list = map.get(key);
      if (list) list.push(m);
      else map.set(key, [m]);
    }
    return map;
  }, [members]);

  const leavesByDay = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const l of leaves) {
      const days = eachDayOfInterval({
        start: parseISO(l.start_date),
        end: parseISO(l.end_date),
      });
      for (const day of days) {
        const key = dayKey(day);
        const list = map.get(key);
        if (list) list.push(l);
        else map.set(key, [l]);
      }
    }
    return map;
  }, [leaves]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      // Keyed on local time so a meeting shows on the day the viewer sees it,
      // not the UTC day it happens to fall on.
      const key = dayKey(parseISO(m.start_at));
      const list = map.get(key);
      if (list) list.push(m);
      else map.set(key, [m]);
    }
    return map;
  }, [meetings]);

  const months = [baseMonth, addMonths(baseMonth, 1)];
  const selectedTasks = tasksByDay.get(dayKey(selected)) ?? [];
  const selectedBirthdays = birthdaysByMonthDay.get(format(selected, "MM-dd")) ?? [];
  const selectedLeaves = leavesByDay.get(dayKey(selected)) ?? [];
  const selectedMeetings = meetingsByDay.get(dayKey(selected)) ?? [];

  const goToday = () => {
    const now = new Date();
    setBaseMonth(startOfMonth(now));
    setSelected(now);
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-[380px] animate-pulse rounded-2xl border border-edge bg-surface-raised" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="nice-scroll flex-1 overflow-y-auto mt-6">
      <div className="mx-auto">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-[15px] font-bold text-ink">
            {format(months[0], "MMMM")} – {format(months[1], "MMMM yyyy")}
          </h2>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-3 text-[11.5px] text-ink-faint sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-[6px] w-[6px] rounded-full bg-primary" /> Tasks due
              </span>
              <span className="flex items-center gap-1.5">
                <Cake size={11} style={{ color: BIRTHDAY_COLOR }} /> Birthday
              </span>
              <span className="flex items-center gap-1.5">
                <Palmtree size={11} style={{ color: LEAVE_ACCENT }} /> On leave
              </span>
              <span className="flex items-center gap-1.5">
                <Video size={11} style={{ color: MEETING_COLOR }} /> Meeting
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMeetingModal(true)}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover"
            >
              <Plus size={13} /> Meeting
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBaseMonth((m) => addMonths(m, -1))}
                aria-label="Previous month"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-edge text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-3 text-[12.5px] font-semibold text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                <CalendarDays size={13} /> Today
              </button>
              <button
                type="button"
                onClick={() => setBaseMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-edge text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Months + day details */}
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="grid min-w-0 flex-1 content-start gap-4 md:grid-cols-2">
            {months.map((m) => (
              <MonthCard
                key={m.toISOString()}
                month={m}
                selected={selected}
                onSelect={setSelected}
                tasksByDay={tasksByDay}
                birthdaysByMonthDay={birthdaysByMonthDay}
                leavesByDay={leavesByDay}
                meetingsByDay={meetingsByDay}
              />
            ))}
          </div>
          <DayDetails
            selected={selected}
            tasks={selectedTasks}
            birthdays={selectedBirthdays}
            leaves={selectedLeaves}
            meetings={selectedMeetings}
            currentMemberId={currentMember?.id}
            onMeetingCancelled={(id) =>
              setMeetings((list) => list.filter((m) => m.id !== id))
            }
          />
        </div>
      </div>

      {meetingModal && (
        <MeetingModal
          members={members}
          currentMemberId={currentMember?.id}
          googleConnected={Boolean(currentMember?.google_connected)}
          defaultDate={selected}
          onClose={() => setMeetingModal(false)}
          onCreated={(meeting) => setMeetings((list) => [...list, meeting])}
        />
      )}
    </main>
  );
}
