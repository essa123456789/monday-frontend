"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Palmtree, Slack } from "lucide-react";
import { toast } from "sonner";
import { getSession } from "@/lib/auth";
import { useBoardStore } from "@/store/boardStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { ThemeToggle } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { RealtimeClient } from "@/components/layout/RealtimeClient";
import { LeavesView } from "@/components/leave/LeavesView";
import { WorkspaceSlackModal } from "@/components/leave/WorkspaceSlackModal";

export default function LeavesPage() {
  const router = useRouter();
  const init = useBoardStore((s) => s.init);
  const workspaces = useBoardStore((s) => s.workspaces);
  const [authed, setAuthed] = useState(false);
  const [slackOpen, setSlackOpen] = useState(false);
  const workspaceId = workspaces[0]?.id ?? null;

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    setAuthed(true);
  }, [router]);

  useEffect(() => {
    if (authed && workspaces.length === 0) init();
  }, [authed, init, workspaces.length]);

  // Handle the return trip from Slack's OAuth consent screen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const result = new URLSearchParams(window.location.search).get("slack");
    if (!result) return;
    const messages: Record<string, () => void> = {
      connected: () => {
        toast.success("Slack workspace connected");
        setSlackOpen(true);
      },
      denied: () => toast.error("Slack connection was cancelled"),
      forbidden: () => toast.error("Only a workspace admin can connect Slack"),
      error: () => toast.error("Slack connection failed — please try again"),
    };
    (messages[result] ?? (() => {}))();
    router.replace("/leaves");
  }, [router]);

  if (!authed) return null;

  return (
    <div className="flex h-screen overflow-hidden p-3 pb-20 gap-3 md:p-6 md:gap-6">
      <RealtimeClient />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center gap-3 border-b border-edge bg-surface px-4 md:px-6 rounded-2xl border-[1px] border-[#E7E9EB] dark:border-[#1E2128]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/20">
            <Palmtree size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold text-ink">Leave</h1>
            <p className="hidden truncate text-[12px] text-ink-faint md:block">
              Time-off requests, approvals and team availability
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSlackOpen(true)}
            title="Slack notifications"
            className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-3 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
          >
            <Slack size={15} />
            <span className="hidden sm:inline">Slack</span>
          </button>
          <NotificationsBell />
          <ThemeToggle />
        </header>

        <LeavesView />
      </div>
      <BottomTabBar />
      {workspaceId != null && (
        <WorkspaceSlackModal
          open={slackOpen}
          onClose={() => setSlackOpen(false)}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
