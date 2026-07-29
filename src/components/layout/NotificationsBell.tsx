"use client";

import { AtSign, Bell, CheckCheck, LayoutGrid, MessageCircle, Palmtree, UserPlus } from "lucide-react";
import { useBoardStore } from "@/store/boardStore";
import { useNotificationStore, type AppNotification } from "@/store/notificationStore";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { cn, formatRelativeTime } from "@/lib/utils";

const KIND_ICON = {
  assign: <UserPlus size={12} />,
  comment: <MessageCircle size={12} />,
  mention: <AtSign size={12} />,
  leave: <Palmtree size={12} />,
  board: <LayoutGrid size={12} />,
} as const;

const KIND_COLOR = { assign: "#579BFC", comment: "#9D99FF", mention: "#FDBC64", leave: "#14B8A6", board: "#6C6CFF" } as const;

function NotificationRow({ n, close }: { n: AppNotification; close: () => void }) {
  const markRead = useNotificationStore((s) => s.markRead);
  const openTask = useBoardStore((s) => s.openTask);

  return (
    <button
      type="button"
      onClick={() => {
        markRead(n.id);
        if (n.task) {
          openTask(n.task);
          close();
        }
      }}
      className={cn(
        "flex w-full cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-sunken",
        !n.read && "bg-primary-soft/60 dark:bg-primary/10"
      )}
    >
      <span className="relative mt-0.5 shrink-0">
        {n.actor_detail ? (
          <Avatar member={n.actor_detail} size={28} />
        ) : (
          <span className="block h-7 w-7 rounded-full bg-ink-faint/20" />
        )}
        <span
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white ring-2 ring-surface-raised"
          style={{ backgroundColor: KIND_COLOR[n.kind] }}
        >
          {KIND_ICON[n.kind]}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-snug text-ink">
          <span className="font-semibold">{n.actor_detail?.name ?? "Someone"}</span> {n.text}
        </span>
        <span className="text-[11px] text-ink-faint">{formatRelativeTime(n.created_at)}</span>
      </span>
      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}

export function NotificationsBell() {
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const load = useNotificationStore((s) => s.load);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  return (
    <Dropdown
      align="right"
      width={360}
      onOpenChange={(open) => open && load()}
      trigger={
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] animate-pop-in items-center justify-center rounded-full bg-[#E2445C] px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      }
    >
      {(close) => (
        <>
          <div className="flex items-center justify-between px-2.5 pb-1 pt-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-primary transition-colors duration-150 hover:bg-primary-soft dark:hover:bg-primary/15"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] space-y-0.5 overflow-y-auto nice-scroll">
            {items.length === 0 && (
              <p className="px-2.5 py-6 text-center text-[13px] text-ink-faint">
                Nothing yet — you&apos;ll see assignments, comments and @mentions here.
              </p>
            )}
            {items.map((n) => (
              <NotificationRow key={n.id} n={n} close={close} />
            ))}
          </div>
        </>
      )}
    </Dropdown>
  );
}
