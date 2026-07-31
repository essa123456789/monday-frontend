import { create } from "zustand";
import { api } from "@/lib/api";
import type { Member } from "@/lib/types";

export interface AppNotification {
  id: number;
  kind: "assign" | "comment" | "mention" | "leave" | "board" | "meeting";
  text: string;
  read: boolean;
  actor_detail: Member | null;
  task: number | null;
  task_title: string | null;
  board: number | null;
  /** Set only for meeting invites, which belong to no task or board. */
  meeting: number | null;
  created_at: string;
}

interface NotificationState {
  items: AppNotification[];
  unread: number;
  loaded: boolean;
  load: () => Promise<void>;
  push: (n: AppNotification) => void;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unread: 0,
  loaded: false,

  load: async () => {
    try {
      const items = await api.get<AppNotification[]>("/notifications/");
      set({ items, unread: items.filter((n) => !n.read).length, loaded: true });
    } catch {
      /* non-critical */
    }
  },

  push: (n) => {
    const items = [n, ...get().items.filter((x) => x.id !== n.id)].slice(0, 50);
    set({ items, unread: get().unread + (n.read ? 0 : 1) });
  },

  markRead: async (id) => {
    const item = get().items.find((n) => n.id === id);
    if (!item || item.read) return;
    set({
      items: get().items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unread: Math.max(0, get().unread - 1),
    });
    try {
      await api.post(`/notifications/${id}/mark_read/`, {});
    } catch {
      /* keep optimistic state */
    }
  },

  markAllRead: async () => {
    set({ items: get().items.map((n) => ({ ...n, read: true })), unread: 0 });
    try {
      await api.post("/notifications/mark_all_read/", {});
    } catch {
      /* keep optimistic state */
    }
  },
}));
