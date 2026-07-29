"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useBoardMembers, useBoardStore } from "@/store/boardStore";
import { AvatarStack, Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { logout } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";
import { InviteButton } from "./InviteButton";
import { NotificationsBell } from "./NotificationsBell";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="h-9 w-9" />;
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function TopBar() {
  const router = useRouter();
  const board = useBoardStore((s) => s.board);
  const members = useBoardMembers();
  const currentMember = useBoardStore((s) => s.currentMember);
  const renameBoard = useBoardStore((s) => s.renameBoard);
  const boardActivity = useBoardStore((s) => s.boardActivity);
  const loadBoardActivity = useBoardStore((s) => s.loadBoardActivity);

  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    if (!board) return;
    setNameValue(board.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const submit = () => {
    setEditing(false);
    const name = nameValue.trim();
    if (board && name && name !== board.name) renameBoard(board.id, name);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-surface px-4 md:px-6 rounded-t-2xl border-[1px] border-b-[0px] border-[#E7E9EB] dark:border-[#1E2128]">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full max-w-md rounded-lg border border-primary bg-surface-raised px-2 py-1 text-[17px] font-bold text-ink outline-none"
            aria-label="Board name"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="max-w-full cursor-pointer truncate rounded-lg px-2 py-1 text-left text-[17px] font-bold text-ink transition-colors duration-150 hover:bg-surface-sunken"
            title="Click to rename"
          >
            {board?.name ?? "…"}
          </button>
        )}
        {board?.description && (
          <p className="hidden truncate px-2 text-[12px] text-ink-faint md:block">{board.description}</p>
        )}
      </div>

      <InviteButton />
      <NotificationsBell />

      <Dropdown
        align="right"
        width={340}
        onOpenChange={(open) => open && loadBoardActivity()}
        trigger={
          <button
            type="button"
            aria-label="Board activity"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <Clock size={18} />
          </button>
        }
      >
        <div className="max-h-[380px] overflow-y-auto nice-scroll">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Board activity
          </p>
          {boardActivity.length === 0 && (
            <p className="px-2.5 py-3 text-[13px] text-ink-muted">No activity yet.</p>
          )}
          {boardActivity.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5 rounded-md px-2.5 py-2 hover:bg-surface-sunken">
              {a.member_detail ? (
                <Avatar member={a.member_detail} size={24} />
              ) : (
                <span className="h-6 w-6 shrink-0 rounded-full bg-ink-faint/20" />
              )}
              <div className="min-w-0">
                <p className="text-[12.5px] leading-snug text-ink">
                  <span className="font-semibold">{a.member_detail?.name ?? "Someone"}</span> {a.text}
                  {a.task_title && a.task && !a.text.includes(a.task_title) && (
                    <span className="text-ink-muted"> · {a.task_title}</span>
                  )}
                </p>
                <p className="text-[11px] text-ink-faint">{formatRelativeTime(a.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </Dropdown>

      <ThemeToggle />

      <Dropdown
        align="right"
        width={230}
        trigger={
          <button type="button" className="flex cursor-pointer items-center gap-2 rounded-lg p-1 transition-colors duration-150 hover:bg-surface-sunken" aria-label="Account menu">
            {currentMember ? <Avatar member={currentMember} size={30} /> : <span className="h-[30px] w-[30px] rounded-full bg-ink-faint/20" />}
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

      {/* <div className="hidden md:block">
        <AvatarStack members={members} size={28} max={4} />
      </div> */}
    </header>
  );
}
