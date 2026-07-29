"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ensureRealtime, onRealtimeEvent, clientId } from "@/lib/realtime";
import { useBoardStore } from "@/store/boardStore";
import { useOverviewStore } from "@/store/overviewStore";
import { useNotificationStore, type AppNotification } from "@/store/notificationStore";
import { useLeaveStore } from "@/store/leaveStore";

/** Invisible component: keeps the websocket alive and routes events to stores. */
export function RealtimeClient() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ensureRealtime();
    useNotificationStore.getState().load();

    const off = onRealtimeEvent((e) => {
      if (e.event === "task_changed") {
        if (e.origin && e.origin === clientId) return; // our own change
        // Preferred path: patch that single card in place, no refetch.
        if (e.board != null && e.task) {
          useBoardStore.getState().applyRemoteCard(e.board, e.task);
        }
        // Overview keeps its own copy of cards; refresh it coarsely when shown.
        if (pathnameRef.current?.startsWith("/overview")) {
          useOverviewStore.getState().load(true);
        }
      } else if (e.event === "board_changed") {
        if (e.origin && e.origin === clientId) return; // our own change
        // Coalesce bursts of events into one silent refresh
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => {
          refreshTimer.current = null;
          const board = useBoardStore.getState().board;
          if (board && board.id === e.board) {
            useBoardStore.getState().refreshBoard();
          }
          if (pathnameRef.current?.startsWith("/overview")) {
            useOverviewStore.getState().load(true);
          }
        }, 300);
      } else if (e.event === "membership_changed" && e.workspace != null) {
        const board = useBoardStore.getState().board;
        const wasViewingBoard = board?.workspace === e.workspace;
        useBoardStore.getState().handleMembershipChange(e.workspace, e.removed ?? false);
        if (e.removed) {
          toast.error("You were removed from a workspace.");
          if (wasViewingBoard) router.replace("/overview");
        } else {
          toast("Your workspace access changed.");
        }
      } else if (e.event === "notification" && e.notification) {
        const n = e.notification as AppNotification;
        useNotificationStore.getState().push(n);
        // Leave requests/decisions change the pending queue — keep the
        // sidebar badge for admins in sync.
        if (n.kind === "leave" && useBoardStore.getState().currentMember?.role === "admin") {
          useLeaveStore.getState().refresh();
        }
        toast(`${n.actor_detail?.name ?? "Someone"} ${n.text}`, {
          action: n.task
            ? { label: "Open", onClick: () => useBoardStore.getState().openTask(n.task!) }
            : undefined,
        });
      }
    });

    return () => {
      off();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  return null;
}
