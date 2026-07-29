"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Hourglass,
  Inbox,
  Loader2,
  Palmtree,
  Pencil,
  Plus,
  Send,
  Thermometer,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { differenceInCalendarDays, eachDayOfInterval, format, isWeekend, parseISO } from "date-fns";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useBoardStore } from "@/store/boardStore";
import { useLeaveStore } from "@/store/leaveStore";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import type { LeaveRequest, LeaveStatus, LeaveType, Member } from "@/lib/types";

// Shared by the calendar view, so leave rendering stays consistent app-wide.
export const LEAVE_META: Record<LeaveType, { label: string; color: string; icon: LucideIcon }> = {
  vacation: { label: "Vacation", color: "#14B8A6", icon: Palmtree },
  sick: { label: "Sick leave", color: "#E2445C", icon: Thermometer },
  personal: { label: "Personal", color: "#4B91F7", icon: UserRound },
  other: { label: "Other", color: "#9D99FF", icon: CircleHelp },
};
/** Accent used wherever "on leave" is shown generically (calendar dots, legend). */
export const LEAVE_ACCENT = "#14B8A6";

const STATUS_META: Record<LeaveStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#F59E0B" },
  approved: { label: "Approved", color: "#10B981" },
  rejected: { label: "Declined", color: "#E2445C" },
};

export function leaveRangeText(leave: Pick<LeaveRequest, "start_date" | "end_date">): string {
  const s = parseISO(leave.start_date);
  const e = parseISO(leave.end_date);
  if (leave.start_date === leave.end_date) return format(s, "MMM d");
  return `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
}

function apiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const match = /"(?:detail|end_date|start_date|reason|leave_type)"\s*:\s*\[?"([^"]+)/.exec(err.message);
    if (match) return match[1];
  }
  return fallback;
}

const todayIso = () => format(new Date(), "yyyy-MM-dd");

function isOnLeaveToday(l: LeaveRequest): boolean {
  const t = todayIso();
  return l.status === "approved" && l.start_date <= t && l.end_date >= t;
}

// ------------------------------------------------------------------- badges

function LeaveStatusPill({ status }: { status: LeaveStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-md border px-2 text-[11px] font-semibold leading-none"
      style={{ borderColor: `${meta.color}66`, color: meta.color, backgroundColor: `${meta.color}14` }}
    >
      {meta.label}
    </span>
  );
}

function TypeBubble({ type, size = 34 }: { type: LeaveType; size?: number }) {
  const meta = LEAVE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: `${meta.color}1A`,
        color: meta.color,
      }}
      aria-hidden
    >
      <Icon size={size * 0.47} />
    </span>
  );
}

// ------------------------------------------------------------ request modal

function RequestLeaveModal({
  open,
  onClose,
  onCreated,
  isAdmin,
  members,
  myId,
  leave = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  isAdmin: boolean;
  members: Member[];
  myId?: number;
  /** Pass an existing leave to amend it (admins only) instead of booking a new one. */
  leave?: LeaveRequest | null;
}) {
  const editing = leave !== null;
  const [leaveType, setLeaveType] = useState<LeaveType>("vacation");
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [forMemberId, setForMemberId] = useState<number | undefined>(myId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLeaveType(leave?.leave_type ?? "vacation");
      setStart(leave?.start_date ?? todayIso());
      setEnd(leave?.end_date ?? todayIso());
      setReason(leave?.reason ?? "");
      setForMemberId(leave?.member ?? myId);
      setPickerOpen(false);
    }
  }, [open, myId, leave]);

  useEffect(() => {
    if (!open) return;
    // While the member picker is open Escape belongs to it, not to the modal —
    // otherwise one keypress closes both.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pickerOpen && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, pickerOpen]);

  if (!open) return null;

  const days =
    start && end ? differenceInCalendarDays(parseISO(end), parseISO(start)) + 1 : 0;
  const valid = Boolean(start && end) && days >= 1 && days <= 90;

  const forSomeoneElse = isAdmin && forMemberId !== undefined && forMemberId !== myId;
  const forMember = members.find((m) => m.id === forMemberId);
  const subjectName = leave?.member_detail.name ?? forMember?.name;
  // Myself pinned to the top, everyone else after — the common case stays first.
  const pickerOptions = [
    ...members.filter((m) => m.id === myId),
    ...members.filter((m) => m.id !== myId),
  ];
  const pickerMember = forMember ?? members.find((m) => m.id === myId);

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const body = {
        leave_type: leaveType,
        start_date: start,
        end_date: end,
        reason: reason.trim(),
      };
      if (leave) {
        await api.patch<LeaveRequest>(`/leaves/${leave.id}/`, body);
        toast.success(`${subjectName ?? "Their"} time off updated`);
      } else {
        await api.post<LeaveRequest>("/leaves/", {
          ...body,
          ...(forSomeoneElse ? { member: forMemberId } : {}),
        });
        toast.success(
          forSomeoneElse
            ? `Leave booked for ${forMember?.name ?? "them"}`
            : "Leave request sent for approval"
        );
      }
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiError(err, editing ? "Could not update that leave" : "Could not submit your request"));
    }
    setSubmitting(false);
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-edge bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors duration-150 focus:border-primary";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit leave" : "Request leave"}
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-2xl border border-edge bg-surface-raised p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15.5px] font-bold text-ink">
            {editing ? "Edit time off" : forSomeoneElse ? "Book time off" : "Request time off"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          {editing
            ? `Amend ${subjectName ?? "this member"}'s booked leave — they'll be notified of the change.`
            : forSomeoneElse
              ? `Booked on ${forMember?.name ?? "their"} behalf — approved right away.`
              : "Your request goes to a workspace admin for approval."}
        </p>

        {editing && leave && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-edge bg-surface-sunken px-3 py-2.5">
            <Avatar member={leave.member_detail} size={26} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
              {leave.member_detail.name}
            </span>
            <LeaveStatusPill status={leave.status} />
          </div>
        )}

        {!editing && isAdmin && members.length > 1 && (
          <div className="mt-4">
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">Time off for</span>
            <Dropdown
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              matchTriggerSize
              trigger={
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={pickerOpen}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 text-left",
                    inputClass,
                    pickerOpen && "border-primary"
                  )}
                >
                  {pickerMember && <Avatar member={pickerMember} size={22} />}
                  <span className="min-w-0 flex-1 truncate">
                    {forSomeoneElse ? forMember?.name : "Myself"}
                  </span>
                  <ChevronDown
                    size={15}
                    className={cn(
                      "shrink-0 text-ink-faint transition-transform duration-150",
                      pickerOpen && "rotate-180"
                    )}
                  />
                </button>
              }
            >
              {(close) => (
                <div className="nice-scroll max-h-[240px] overflow-y-auto" role="listbox">
                  {pickerOptions.map((m) => (
                    <DropdownItem
                      key={m.id}
                      active={m.id === forMemberId}
                      onClick={() => {
                        setForMemberId(m.id);
                        close();
                      }}
                    >
                      <Avatar member={m} size={22} />
                      <span className="min-w-0 flex-1 truncate">
                        {m.id === myId ? "Myself" : m.name}
                      </span>
                      {m.id === forMemberId && <Check size={14} className="shrink-0 text-primary" />}
                    </DropdownItem>
                  ))}
                </div>
              )}
            </Dropdown>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(LEAVE_META) as LeaveType[]).map((t) => {
            const meta = LEAVE_META[t];
            const Icon = meta.icon;
            const active = leaveType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setLeaveType(t)}
                aria-pressed={active}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border py-2.5 text-[11.5px] font-semibold transition-colors duration-150",
                  active
                    ? "text-ink"
                    : "border-edge text-ink-muted hover:bg-surface-sunken hover:text-ink"
                )}
                style={
                  active
                    ? { borderColor: meta.color, backgroundColor: `${meta.color}14`, color: meta.color }
                    : undefined
                }
              >
                <Icon size={17} />
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">First day</span>
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (e.target.value > end) setEnd(e.target.value);
              }}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">Last day</span>
            <input
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {days >= 1 && (
          <p className="mt-2 text-[12px] font-medium text-ink-faint">
            {days > 90 ? (
              <span className="text-[#E2445C]">A single request can cover at most 90 days.</span>
            ) : (
              <>
                {editing || forSomeoneElse
                  ? `${subjectName?.split(" ")[0] ?? "They"} will be off for `
                  : "You're requesting "}
                <span className="font-semibold text-primary">
                  {days} day{days === 1 ? "" : "s"}
                </span>
                {editing || forSomeoneElse ? "" : " off"}
              </>
            )}
          </p>
        )}

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
            {editing || forSomeoneElse ? "Note" : "Note for your admin"}{" "}
            <span className="text-ink-faint">(optional)</span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Family trip, back on Monday"
            className="w-full resize-none rounded-lg border border-edge bg-surface-sunken px-3 py-2 text-[13.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-lg px-4 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || submitting}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : editing ? (
              <Check size={14} />
            ) : (
              <Send size={14} />
            )}
            {editing ? "Save changes" : forSomeoneElse ? "Book leave" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------- admin approvals

function PendingApprovalRow({ leave, onDone }: { leave: LeaveRequest; onDone: () => void }) {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (verdict: "approve" | "reject") => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/leaves/${leave.id}/${verdict}/`, verdict === "reject" ? { note: note.trim() } : {});
      toast.success(verdict === "approve" ? `${leave.member_detail.name}'s leave approved` : "Request declined");
      onDone();
    } catch (err) {
      toast.error(apiError(err, "Could not update that request"));
      setBusy(false);
    }
  };

  return (
    <li className="rounded-lg border border-edge px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Avatar member={leave.member_detail} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-ink">
            <span className="font-semibold">{leave.member_detail.name}</span>
            <span className="text-ink-muted"> · {LEAVE_META[leave.leave_type].label}</span>
          </p>
          <p className="truncate text-[12px] text-ink-faint">
            {leaveRangeText(leave)} · {leave.days} day{leave.days === 1 ? "" : "s"}
            {leave.reason && <span> — “{leave.reason}”</span>}
          </p>
        </div>
        {!declining && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => decide("approve")}
              disabled={busy}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#10B981] px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#00B268] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Approve
            </button>
            <button
              type="button"
              onClick={() => setDeclining(true)}
              disabled={busy}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E2445C]/50 px-3 text-[12.5px] font-semibold text-[#E2445C] transition-colors duration-150 hover:bg-[#E2445C]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={13} /> Decline
            </button>
          </div>
        )}
      </div>

      {declining && (
        <div className="mt-2.5 flex items-center gap-2 border-t border-edge pt-2.5">
          <input
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && decide("reject")}
            maxLength={300}
            placeholder="Reason (optional) — they'll see this"
            className="h-9 min-w-0 flex-1 rounded-lg border border-edge bg-surface-sunken px-3 text-[12.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
          />
          <button
            type="button"
            onClick={() => decide("reject")}
            disabled={busy}
            className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[#E2445C] px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#C93A4F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setDeclining(false)}
            disabled={busy}
            className="h-9 shrink-0 cursor-pointer rounded-lg px-2.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

// ----------------------------------------------------------------- main view

export function LeavesView() {
  const currentMember = useBoardStore((s) => s.currentMember);
  const members = useBoardStore((s) => s.members);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  // Admin-only: amend or delete someone else's already-approved leave.
  const [editTarget, setEditTarget] = useState<LeaveRequest | null>(null);
  const [removeTarget, setRemoveTarget] = useState<LeaveRequest | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<LeaveRequest[]>("/leaves/");
      setLeaves(data);
      if (useBoardStore.getState().currentMember?.role === "admin") {
        useLeaveStore
          .getState()
          .setPendingCount(data.filter((l) => l.status === "pending").length);
      }
    } catch {
      toast.error("Failed to load leave requests");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = currentMember?.role === "admin";
  const t = todayIso();

  const mine = useMemo(
    () => leaves.filter((l) => l.member === currentMember?.id),
    [leaves, currentMember?.id]
  );
  const pendingApprovals = useMemo(
    () => (isAdmin ? leaves.filter((l) => l.status === "pending") : []),
    [leaves, isAdmin]
  );
  const outToday = useMemo(() => leaves.filter(isOnLeaveToday), [leaves]);
  // Everything already signed off, newest first — the admin's editing surface.
  const approved = useMemo(
    () =>
      isAdmin
        ? leaves
            .filter((l) => l.status === "approved")
            .sort((a, b) => b.start_date.localeCompare(a.start_date))
        : [],
    [leaves, isAdmin]
  );
  const upcoming = useMemo(
    () =>
      leaves
        .filter((l) => l.status === "approved" && l.end_date >= t)
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [leaves, t]
  );
  // Working days (Mon–Fri) inside a leave's range, weekends excluded.
  const workingDays = (startIso: string, endIso: string) =>
    eachDayOfInterval({ start: parseISO(startIso), end: parseISO(endIso) }).filter(
      (d) => !isWeekend(d)
    ).length;
  const myDaysThisYear = useMemo(
    () =>
      mine
        .filter((l) => l.status === "approved" && l.start_date.slice(0, 4) === t.slice(0, 4))
        .reduce((sum, l) => sum + workingDays(l.start_date, l.end_date), 0),
    [mine, t]
  );
  const myPending = mine.filter((l) => l.status === "pending").length;

  const cancelRequest = async () => {
    const target = cancelTarget;
    setCancelTarget(null);
    if (!target) return;
    try {
      await api.delete(`/leaves/${target.id}/`);
      toast.success("Request cancelled");
      load(true);
    } catch (err) {
      toast.error(apiError(err, "Could not cancel that request"));
    }
  };

  const removeApproved = async () => {
    const target = removeTarget;
    setRemoveTarget(null);
    if (!target) return;
    try {
      await api.delete(`/leaves/${target.id}/`);
      toast.success(`${target.member_detail.name}'s time off removed`);
      load(true);
    } catch (err) {
      toast.error(apiError(err, "Could not remove that leave"));
    }
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-4" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[92px] animate-pulse rounded-2xl border border-edge bg-surface-raised" />
            ))}
          </div>
          <div className="h-[300px] animate-pulse rounded-2xl border border-edge bg-surface-raised" />
        </div>
      </main>
    );
  }

  return (
    <main className="nice-scroll flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Time off</h2>
            <p className="text-[12px] text-ink-faint">
              Request leave, track approvals and see who&apos;s away.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover"
          >
            <Plus size={15} /> Request leave
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-edge bg-surface-raised p-4 shadow-card">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">
              Out today
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[24px] font-bold leading-none text-ink">{outToday.length}</span>
              <div className="flex -space-x-1.5">
                {outToday.slice(0, 5).map((l) => (
                  <span key={l.id} className="rounded-full ring-2 ring-surface-raised">
                    <Avatar member={l.member_detail} size={24} />
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[12px] text-ink-faint">
              {outToday.length === 0
                ? "Everyone's in — full house"
                : outToday.map((l) => l.member_detail.name.split(" ")[0]).slice(0, 3).join(", ") +
                  (outToday.length > 3 ? ` +${outToday.length - 3} more` : "") +
                  (outToday.length === 1 ? " is away" : " are away")}
            </p>
          </div>

          <div className="rounded-2xl border border-edge bg-surface-raised p-4 shadow-card">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">
              My days off this year
            </p>
            <p className="mt-2 text-[24px] font-bold leading-none text-ink">{myDaysThisYear}</p>
            <p className="mt-1.5 text-[12px] text-ink-faint">Approved working days in {t.slice(0, 4)}</p>
          </div>

          <div className="rounded-2xl border border-edge bg-surface-raised p-4 shadow-card">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">
              {isAdmin ? "Awaiting your approval" : "My pending requests"}
            </p>
            <p
              className="mt-2 text-[24px] font-bold leading-none"
              style={{ color: (isAdmin ? pendingApprovals.length : myPending) > 0 ? "#F59E0B" : undefined }}
            >
              <span className={cn((isAdmin ? pendingApprovals.length : myPending) === 0 && "text-ink")}>
                {isAdmin ? pendingApprovals.length : myPending}
              </span>
            </p>
            <p className="mt-1.5 text-[12px] text-ink-faint">
              {isAdmin ? "Requests from your team" : "Waiting on an admin"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            {/* Admin: pending approvals */}
            {isAdmin && (
              <section className="rounded-2xl border border-edge bg-surface-raised p-4 shadow-card">
                <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                  <Hourglass size={15} className="text-[#F59E0B]" /> Pending approvals
                  {pendingApprovals.length > 0 && (
                    <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#F59E0B] px-1.5 text-[11px] font-bold text-white">
                      {pendingApprovals.length}
                    </span>
                  )}
                </h3>
                {pendingApprovals.length === 0 ? (
                  <p className="mt-2 text-[12.5px] text-ink-faint">
                    Nothing waiting — new requests from your team will show up here.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {pendingApprovals.map((l) => (
                      <PendingApprovalRow key={l.id} leave={l} onDone={() => load(true)} />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Admin: amend or remove leave that's already been approved */}
            {isAdmin && (
              <section className="rounded-2xl border border-edge bg-surface-raised p-4 shadow-card">
                <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                  <CalendarCheck size={15} className="text-[#10B981]" /> Approved time off
                </h3>
                {approved.length === 0 ? (
                  <p className="mt-2 text-[12.5px] text-ink-faint">
                    Nothing approved yet — once you sign a request off you can edit or remove it here.
                  </p>
                ) : (
                  <ul className="nice-scroll mt-3 max-h-[360px] space-y-2 overflow-y-auto">
                    {approved.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 rounded-lg border border-edge px-3 py-2.5"
                      >
                        <Avatar member={l.member_detail} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink">
                            <span className="font-semibold">{l.member_detail.name}</span>
                            <span className="text-ink-muted"> · {LEAVE_META[l.leave_type].label}</span>
                          </p>
                          <p className="truncate text-[12px] text-ink-faint">
                            {leaveRangeText(l)} · {l.days} day{l.days === 1 ? "" : "s"}
                            {l.end_date < t && <span> · past</span>}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditTarget(l)}
                          aria-label={`Edit ${l.member_detail.name}'s leave`}
                          title="Edit leave"
                          className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-primary"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(l)}
                          aria-label={`Remove ${l.member_detail.name}'s leave`}
                          title="Remove leave"
                          className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-[#E2445C]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* My requests */}
            <section className="rounded-2xl border border-edge bg-surface-raised p-4 shadow-card">
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                <Inbox size={15} className="text-ink-faint" /> My requests
              </h3>
              {mine.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
                    <Palmtree size={20} />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold text-ink">No requests yet</p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">
                    Planning a break? Hit “Request leave” to get it approved.
                  </p>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {mine.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 rounded-lg border border-edge px-3 py-2.5">
                      <TypeBubble type={l.leave_type} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">
                          {LEAVE_META[l.leave_type].label}
                          <span className="font-normal text-ink-muted">
                            {" "}
                            · {leaveRangeText(l)} · {l.days} day{l.days === 1 ? "" : "s"}
                          </span>
                        </p>
                        <p className="truncate text-[12px] text-ink-faint">
                          {l.status === "rejected" && l.decision_note
                            ? `Declined: “${l.decision_note}”`
                            : l.status !== "pending" && l.decided_by_detail
                              ? `${STATUS_META[l.status].label} by ${l.decided_by_detail.name}`
                              : l.reason || `Requested ${format(parseISO(l.created_at), "MMM d")}`}
                        </p>
                      </div>
                      <LeaveStatusPill status={l.status} />
                      {l.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(l)}
                          aria-label="Cancel request"
                          title="Cancel request"
                          className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-[#E2445C]"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Who's out */}
          <aside className="rounded-2xl border border-edge bg-surface-raised p-4 shadow-card lg:w-[320px] lg:shrink-0 lg:self-start">
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <CalendarDays size={15} className="text-ink-faint" /> Who&apos;s out
            </h3>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-ink-faint">
                No approved leave coming up. The team is fully aboard.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcoming.slice(0, 8).map((l) => {
                  const now = isOnLeaveToday(l);
                  return (
                    <li key={l.id} className="flex items-center gap-2.5">
                      <Avatar member={l.member_detail} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-ink">
                          {l.member_detail.name}
                        </p>
                        <p className="truncate text-[11.5px] text-ink-faint">
                          {LEAVE_META[l.leave_type].label} · {leaveRangeText(l)}
                        </p>
                      </div>
                      {now && (
                        <span
                          className="shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: `${LEAVE_ACCENT}1A`, color: LEAVE_ACCENT }}
                        >
                          Now
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      </div>

      <RequestLeaveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => load(true)}
        isAdmin={isAdmin}
        members={members}
        myId={currentMember?.id}
      />
      <RequestLeaveModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onCreated={() => load(true)}
        isAdmin={isAdmin}
        members={members}
        myId={currentMember?.id}
        leave={editTarget}
      />
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove this time off?"
        message={
          removeTarget
            ? `${removeTarget.member_detail.name}'s ${LEAVE_META[removeTarget.leave_type].label.toLowerCase()} for ${leaveRangeText(removeTarget)} will be deleted and they'll be back on the calendar.`
            : ""
        }
        confirmLabel="Remove leave"
        onConfirm={removeApproved}
        onCancel={() => setRemoveTarget(null)}
      />
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel this request?"
        message={
          cancelTarget
            ? `Your ${LEAVE_META[cancelTarget.leave_type].label.toLowerCase()} request for ${leaveRangeText(cancelTarget)} will be withdrawn.`
            : ""
        }
        confirmLabel="Withdraw request"
        onConfirm={cancelRequest}
        onCancel={() => setCancelTarget(null)}
      />
    </main>
  );
}
