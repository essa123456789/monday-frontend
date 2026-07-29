"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListTodo, LogOut, User } from "lucide-react";
import { getSession, logout } from "@/lib/auth";
import { useBoardStore } from "@/store/boardStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { ThemeToggle } from "@/components/layout/TopBar";
import { InviteButton } from "@/components/layout/InviteButton";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { RealtimeClient } from "@/components/layout/RealtimeClient";
import { MyWorkView } from "@/components/mywork/MyWorkView";
import { TaskPanel } from "@/components/task/TaskPanel";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";

export default function MyWorkPage() {
  const router = useRouter();
  const init = useBoardStore((s) => s.init);
  const workspaces = useBoardStore((s) => s.workspaces);
  const currentMember = useBoardStore((s) => s.currentMember);
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
      <div className="flex min-w-0 flex-1 flex-col bg-surface p-5 md:p-5 rounded-2xl border-[1px] border-[#E7E9EB] dark:border-[#1E2128]">
        <header className="flex h-20 shrink-0 items-center gap-3 border-b border-edge bg-surface px-4 md:px-6 rounded-2xl border-[1px] border-[#E7E9EB] dark:border-[#1E2128]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/20">
            <ListTodo size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold text-ink">My Work</h1>
            <p className="hidden truncate text-[12px] text-ink-faint md:block">
              Every task assigned to you, across all boards
            </p>
          </div>
          <InviteButton />
          <NotificationsBell />
          <ThemeToggle />
          <Dropdown
            align="right"
            width={230}
            trigger={
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-lg p-1 transition-colors duration-150 hover:bg-surface-sunken"
                aria-label="Account menu"
              >
                {currentMember ? (
                  <Avatar member={currentMember} size={30} />
                ) : (
                  <span className="h-[30px] w-[30px] rounded-full bg-ink-faint/20" />
                )}
              </button>
            }
          >
            {(close) => (
              <>
                {currentMember && (
                  <div className="flex items-center gap-2.5 border-b border-edge px-2.5 pb-2.5 pt-1.5">
                    <Avatar member={currentMember} size={34} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{currentMember.name}</p>
                      <p className="truncate text-[11.5px] text-ink-faint">{currentMember.email}</p>
                    </div>
                  </div>
                )}
                <div className="pt-1">
                  <DropdownItem
                    onClick={() => {
                      close();
                      router.push("/profile");
                    }}
                  >
                    <User size={14} /> Profile
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      close();
                      logout();
                    }}
                  >
                    <LogOut size={14} /> Log out
                  </DropdownItem>
                </div>
              </>
            )}
          </Dropdown>
        </header>

        <MyWorkView />
      </div>
      <TaskPanel />
      <BottomTabBar />
    </div>
  );
}
