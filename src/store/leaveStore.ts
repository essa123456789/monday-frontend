import { create } from "zustand";
import { api } from "@/lib/api";
import type { LeaveRequest } from "@/lib/types";

interface LeaveState {
  /** Pending requests awaiting an admin decision — drives the sidebar badge. */
  pendingCount: number;
  refresh: () => Promise<void>;
  setPendingCount: (n: number) => void;
}

export const useLeaveStore = create<LeaveState>((set) => ({
  pendingCount: 0,

  refresh: async () => {
    try {
      const leaves = await api.get<LeaveRequest[]>("/leaves/");
      set({ pendingCount: leaves.filter((l) => l.status === "pending").length });
    } catch {
      /* non-critical */
    }
  },

  setPendingCount: (n) => set({ pendingCount: n }),
}));
