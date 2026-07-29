"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { getSession } from "@/lib/auth";
import { useBoardStore } from "@/store/boardStore";
import { WorkspaceBoardList } from "@/components/layout/WorkspaceBoardList";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { RealtimeClient } from "@/components/layout/RealtimeClient";

/** Mobile-only view of the sidebar's board/folder list, reached from the
 * "Boards" tab in the BottomTabBar. On md+ screens the same list already
 * lives in the always-visible Sidebar, so this page just bounces there. */
export default function BoardsPage() {
  const router = useRouter();
  const init = useBoardStore((s) => s.init);
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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    if (mq.matches) {
      router.replace("/overview");
      return;
    }
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) router.replace("/overview");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [router]);

  if (!authed) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface p-3 pb-20 md:hidden">
      <RealtimeClient />
      <header className="flex h-14 shrink-0 items-center gap-2.5 px-1 pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <LayoutGrid size={17} />
        </span>
        <h1 className="text-[17px] font-bold text-ink">Boards</h1>
      </header>
      <div className="flex-1 overflow-y-auto nice-scroll">
        <WorkspaceBoardList />
      </div>
      <BottomTabBar />
    </div>
  );
}
