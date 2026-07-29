"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Slack } from "lucide-react";
import { toast } from "sonner";
import { getSession } from "@/lib/auth";
import { useBoardStore } from "@/store/boardStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { TopBar } from "@/components/layout/TopBar";
import { RealtimeClient } from "@/components/layout/RealtimeClient";
import { FilterBar } from "@/components/board/FilterBar";
import { BoardView } from "@/components/board/BoardView";
import { PersonalTableView } from "@/components/board/PersonalTableView";
import { TableView } from "@/components/board/TableView";
import { ViewTabs } from "@/components/board/ViewTabs";
import { SlackModal } from "@/components/board/SlackModal";
import { TaskPanel } from "@/components/task/TaskPanel";

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const boardId = Number(params.id);
  const init = useBoardStore((s) => s.init);
  const loadBoard = useBoardStore((s) => s.loadBoard);
  const workspaces = useBoardStore((s) => s.workspaces);
  const board = useBoardStore((s) => s.board);
  const view = useBoardStore((s) => s.view);
  const [authed, setAuthed] = useState(false);
  const [slackOpen, setSlackOpen] = useState(false);

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

  useEffect(() => {
    if (authed && !Number.isNaN(boardId)) loadBoard(boardId);
  }, [authed, boardId, loadBoard]);

  // Handle the return trip from Slack's OAuth consent screen. Read straight
  // from the URL (not useSearchParams) so the page needs no Suspense boundary.
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
    // Strip the query flag so a refresh doesn't re-toast.
    router.replace(`/board/${boardId}`);
  }, [router, boardId]);

  if (!authed) return null;

  return (
    <div className="flex h-screen overflow-hidden p-3 pb-20 gap-3 md:p-6 md:gap-6">
      <RealtimeClient />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {/* Personal (generic) boards have their own table with custom columns —
            the status-workflow filter bar and Slack channel config don't apply. */}
        {board?.is_personal ? (
          <PersonalTableView />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2  bg-surface px-4 py-2 pb-6 md:px-6 rounded-b-2xl border-[1px] border-t-[0px] border-[#E7E9EB] dark:border-[#1E2128]">
              <FilterBar />
              <button
                type="button"
                onClick={() => setSlackOpen(true)}
                title="Slack notifications"
                className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-3 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
              >
                <Slack size={15} />
                <span className="hidden sm:inline">Slack</span>
              </button>
              {/* <ViewTabs /> */}
            </div>
            {view === "table" ? <TableView /> : <BoardView />}
          </>
        )}
      </div>
      <TaskPanel />
      <BottomTabBar />
      {board && (
        <SlackModal
          open={slackOpen}
          onClose={() => setSlackOpen(false)}
          boardId={boardId}
          workspaceId={board.workspace}
          boardName={board.name}
        />
      )}
    </div>
  );
}
