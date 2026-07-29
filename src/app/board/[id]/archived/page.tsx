"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { useBoardStore } from "@/store/boardStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { RealtimeClient } from "@/components/layout/RealtimeClient";
import { ArchivedTasksView } from "@/components/board/ArchivedTasksView";

export default function ArchivedTasksPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const boardId = Number(params.id);
  const init = useBoardStore((s) => s.init);
  const loadBoard = useBoardStore((s) => s.loadBoard);
  const workspaces = useBoardStore((s) => s.workspaces);
  const [authed, setAuthed] = useState(false);

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

  // Load the board so Restore/Delete (which reconcile the board state) work.
  useEffect(() => {
    if (authed && !Number.isNaN(boardId)) loadBoard(boardId);
  }, [authed, boardId, loadBoard]);

  if (!authed) return null;

  return (
    <div className="flex h-screen overflow-hidden p-3 pb-20 gap-3 md:p-6 md:gap-6">
      <RealtimeClient />
      <Sidebar />
      <ArchivedTasksView boardId={boardId} />
      <BottomTabBar />
    </div>
  );
}
