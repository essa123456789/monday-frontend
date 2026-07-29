"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getSession } from "@/lib/auth";
import { useBoardStore } from "@/store/boardStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { ThemeToggle } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { RealtimeClient } from "@/components/layout/RealtimeClient";
import { CalendarView } from "@/components/calendar/CalendarView";
import { TaskPanel } from "@/components/task/TaskPanel";

export default function CalendarPage() {
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

  if (!authed) return null;

  return (
    <div className="flex h-screen overflow-hidden p-3 pb-20 gap-3 md:p-6 md:gap-6">
      <RealtimeClient />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center gap-3 border-b border-edge bg-surface px-4 md:px-6 rounded-2xl border-[1px] border-[#E7E9EB] dark:border-[#1E2128]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/20">
            <CalendarDays size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold text-ink">Calendar</h1>
            <p className="hidden truncate text-[12px] text-ink-faint md:block">
              Due dates and birthdays across your workspace
            </p>
          </div>
          <NotificationsBell />
          <ThemeToggle />
        </header>

        <CalendarView />
      </div>
      <TaskPanel />
      <BottomTabBar />
    </div>
  );
}
