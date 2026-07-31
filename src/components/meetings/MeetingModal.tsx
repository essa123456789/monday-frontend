"use client";

import { useState } from "react";
import { Loader2, Video, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import type { Meeting, Member } from "@/lib/types";

/** Round up to the next quarter hour — a sensible default start for "later". */
function nextQuarterHour(): Date {
  const d = new Date();
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15, 0, 0);
  return d;
}

/** <input type="datetime-local"> wants local wall-clock time, not an ISO/UTC
 *  string — toISOString() would silently shift the value by the UTC offset. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetingModal({
  members,
  currentMemberId,
  googleConnected,
  defaultDate,
  onClose,
  onCreated,
}: {
  members: Member[];
  currentMemberId: number | undefined;
  googleConnected: boolean;
  /** Day the user had selected on the calendar, if they opened it from there. */
  defaultDate?: Date;
  onClose: () => void;
  onCreated: (meeting: Meeting) => void;
}) {
  const [mode, setMode] = useState<"now" | "later">("now");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [startsAt, setStartsAt] = useState(() => {
    const base = nextQuarterHour();
    if (defaultDate) {
      const d = new Date(defaultDate);
      // Keep the picked day but a sane time of day.
      d.setHours(base.getHours(), base.getMinutes(), 0, 0);
      return toLocalInput(d);
    }
    return toLocalInput(base);
  });
  const [picked, setPicked] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const invitable = members.filter((m) => m.id !== currentMemberId);

  const toggle = (id: number) =>
    setPicked((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let meeting: Meeting;
      if (mode === "now") {
        meeting = await api.post<Meeting>("/meetings/instant/", {
          title: title.trim(),
          attendees: picked,
          minutes,
        });
      } else {
        const start = new Date(startsAt);
        if (Number.isNaN(start.getTime())) {
          toast.error("Pick a valid start time");
          setSubmitting(false);
          return;
        }
        meeting = await api.post<Meeting>("/meetings/", {
          title: title.trim() || "Meeting",
          description: "",
          // The server stores UTC; send an absolute instant, not wall-clock.
          start_at: start.toISOString(),
          end_at: new Date(start.getTime() + minutes * 60_000).toISOString(),
          attendees: picked,
        });
      }

      if (meeting.warning) toast.warning(meeting.warning);
      else if (!meeting.meet_url)
        toast.warning("Meeting created, but without a Meet link — connect Google on your profile.");
      else toast.success(mode === "now" ? "Meeting started" : "Meeting scheduled");

      onCreated(meeting);
      // Take the organiser straight into their own instant call.
      if (mode === "now" && meeting.meet_url) window.open(meeting.meet_url, "_blank", "noopener");
      onClose();
    } catch {
      toast.error("Could not create the meeting");
      setSubmitting(false);
    }
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-edge bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors duration-150 focus:border-primary";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="New meeting"
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-2xl border border-edge bg-surface-raised p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15.5px] font-bold text-ink">New meeting</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {!googleConnected && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
            Connect Google on your profile to get a Meet link. Without it the meeting still appears
            on everyone&apos;s calendar, but there&apos;s nothing to join.
          </p>
        )}

        {/* Now vs later */}
        <div className="mt-4 flex gap-1 rounded-lg border border-edge bg-surface-sunken p-1">
          {(
            [
              ["now", "Meet now", Zap],
              ["later", "Schedule", Video],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-[12.5px] font-semibold transition-colors duration-150",
                mode === value
                  ? "bg-surface-raised text-ink shadow-card"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-muted" htmlFor="meeting-title">
            Title
          </label>
          <input
            id="meeting-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={mode === "now" ? "Quick sync" : "Weekly planning"}
            className={inputClass}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {mode === "later" && (
            <div className="col-span-2">
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-muted" htmlFor="meeting-start">
                Starts
              </label>
              <input
                id="meeting-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <div className={mode === "later" ? "col-span-2" : "col-span-2"}>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-muted" htmlFor="meeting-length">
              Length
            </label>
            <select
              id="meeting-length"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className={cn(inputClass, "cursor-pointer")}
            >
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
            Invite {picked.length > 0 && `(${picked.length})`}
          </span>
          {invitable.length === 0 ? (
            <p className="text-[12.5px] text-ink-faint">
              No one else in your workspace yet — invite teammates first.
            </p>
          ) : (
            <div className="nice-scroll max-h-44 space-y-1 overflow-y-auto rounded-lg border border-edge bg-surface-sunken p-1.5">
              {invitable.map((m) => {
                const on = picked.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
                      on ? "bg-primary-soft dark:bg-primary/20" : "hover:bg-surface-raised"
                    )}
                  >
                    <Avatar member={m} size={24} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{m.name}</span>
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold",
                        on ? "border-primary bg-primary text-white" : "border-edge text-transparent"
                      )}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 cursor-pointer items-center rounded-lg border border-edge px-4 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
            {mode === "now" ? "Start meeting" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
