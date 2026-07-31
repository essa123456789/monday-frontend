"use client";

import { format, isPast, parseISO } from "date-fns";
import { Link2, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn, copyText } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import type { Meeting } from "@/lib/types";

/** Joining opens a few minutes early — nobody wants to watch the clock, and
 *  Meet itself lets you in before the hour. */
const EARLY_JOIN_MS = 10 * 60_000;

export function meetingJoinable(meeting: Meeting, now: number = Date.now()): boolean {
  if (!meeting.meet_url) return false;
  const start = parseISO(meeting.start_at).getTime();
  const end = parseISO(meeting.end_at).getTime();
  return now >= start - EARLY_JOIN_MS && now <= end;
}

export function MeetingRow({
  meeting,
  currentMemberId,
  onCancelled,
}: {
  meeting: Meeting;
  currentMemberId: number | undefined;
  onCancelled: (id: number) => void;
}) {
  const start = parseISO(meeting.start_at);
  const end = parseISO(meeting.end_at);
  const joinable = meetingJoinable(meeting);
  const over = isPast(end);
  const isOrganizer = meeting.organizer === currentMemberId;

  const cancel = async () => {
    try {
      await api.delete(`/meetings/${meeting.id}/`);
      onCancelled(meeting.id);
      toast.success("Meeting cancelled");
    } catch {
      toast.error("Could not cancel the meeting");
    }
  };

  const copyLink = async () => {
    if (!meeting.meet_url) return;
    if (await copyText(meeting.meet_url)) toast.success("Link copied");
    else toast.error("Could not copy — " + meeting.meet_url);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-edge bg-surface-sunken px-3 py-2.5",
        over && "opacity-60"
      )}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/15"
        aria-hidden="true"
      >
        <Video size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{meeting.title}</p>
        <p className="truncate text-[11.5px] text-ink-faint">
          {format(start, "HH:mm")}–{format(end, "HH:mm")} · {meeting.organizer_detail?.name}
          {meeting.attendee_details.length > 1 && ` +${meeting.attendee_details.length - 1}`}
        </p>
      </div>

      <div className="flex -space-x-1.5">
        {meeting.attendee_details.slice(0, 3).map((m) => (
          <Avatar key={m.id} member={m} size={22} />
        ))}
      </div>

      {meeting.meet_url && (
        <button
          type="button"
          onClick={copyLink}
          aria-label="Copy meeting link"
          className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-surface-raised hover:text-ink"
        >
          <Link2 size={14} />
        </button>
      )}

      {isOrganizer && !over && (
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel meeting"
          className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-[#E2445C]/10 hover:text-[#E2445C]"
        >
          <Trash2 size={14} />
        </button>
      )}

      {meeting.meet_url ? (
        <a
          href={meeting.meet_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!joinable}
          onClick={(e) => {
            if (!joinable) e.preventDefault();
          }}
          className={cn(
            "flex h-8 shrink-0 items-center rounded-lg px-3 text-[12.5px] font-semibold transition-colors duration-150",
            joinable
              ? "cursor-pointer bg-primary text-white hover:bg-primary-hover"
              : "cursor-not-allowed border border-edge text-ink-faint"
          )}
        >
          {over ? "Ended" : joinable ? "Join" : format(start, "MMM d")}
        </a>
      ) : (
        <span className="shrink-0 text-[11.5px] text-ink-faint">No link</span>
      )}
    </div>
  );
}
