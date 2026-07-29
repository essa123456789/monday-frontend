"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, LogOut, MoreHorizontal, Search, Shield, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useBoardStore } from "@/store/boardStore";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";

/**
 * Member management for a personal board: owner + workspace admins see every
 * member and can add / remove; the owner can also hand ownership to someone
 * else, after which they can leave. Reads the live board from the store by id
 * so it stays fresh across a transfer or removal.
 */
export function BoardMembersModal({
  open,
  onClose,
  boardId,
}: {
  open: boolean;
  onClose: () => void;
  boardId: number;
}) {
  const router = useRouter();
  const workspaces = useBoardStore((s) => s.workspaces);
  const allMembers = useBoardStore((s) => s.members);
  const currentMember = useBoardStore((s) => s.currentMember);
  const updateBoard = useBoardStore((s) => s.updateBoard);
  const transferBoardOwnership = useBoardStore((s) => s.transferBoardOwnership);
  const leaveBoard = useBoardStore((s) => s.leaveBoard);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const board = useMemo(
    () => workspaces.flatMap((w) => w.boards).find((b) => b.id === boardId) ?? null,
    [workspaces, boardId]
  );

  const memberById = useMemo(() => new Map(allMembers.map((m) => [m.id, m])), [allMembers]);

  const owner = board?.created_by != null ? memberById.get(board.created_by) ?? null : null;
  // The people on the board = owner + invited member_ids (owner has implicit
  // access and usually has no members row, so include them explicitly).
  const memberList = useMemo(() => {
    if (!board) return [];
    const ids = new Set(board.member_ids);
    if (board.created_by != null) ids.add(board.created_by);
    return Array.from(ids)
      .map((id) => memberById.get(id))
      .filter((m): m is Member => !!m)
      .sort((a, b) =>
        a.id === board.created_by ? -1 : b.id === board.created_by ? 1 : a.name.localeCompare(b.name)
      );
  }, [board, memberById]);

  const amOwner = !!(board && currentMember && board.created_by === currentMember.id);
  const amAdmin = currentMember?.role === "admin";
  const canManage = amOwner || amAdmin;
  const amMember = !!(currentMember && memberList.some((m) => m.id === currentMember.id));

  // Workspace members not already on the board (for the add picker).
  const addable = useMemo(() => {
    const onBoard = new Set(memberList.map((m) => m.id));
    const q = query.trim().toLowerCase();
    return allMembers
      .filter((m) => !onBoard.has(m.id))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [allMembers, memberList, query]);

  if (!open || !board) return null;

  const setMembers = async (ids: number[]) => {
    setBusy(true);
    await updateBoard(board.id, { member_ids: ids });
    setBusy(false);
  };

  const addMember = (id: number) => {
    setMembers([...board.member_ids.filter((x) => x !== board.created_by), id]);
    setQuery("");
  };

  const removeMember = (id: number) => {
    setMembers(board.member_ids.filter((x) => x !== id));
  };

  const doTransfer = async () => {
    const target = transferTarget!;
    setTransferTarget(null);
    setBusy(true);
    await transferBoardOwnership(board.id, target.id);
    setBusy(false);
  };

  const doLeave = async () => {
    setConfirmLeave(false);
    const ok = await leaveBoard(board.id);
    if (ok) {
      onClose();
      router.push("/overview");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Board members"
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-xl border border-edge bg-surface-raised p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15.5px] font-bold text-ink">Board members</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          Who can see <span className="font-semibold text-ink">{board.name}</span>.
          {canManage
            ? " Add or remove people, or hand over ownership."
            : " Only the owner or a workspace admin can change this."}
        </p>

        {/* Current members */}
        <ul className="mt-4 max-h-[260px] space-y-0.5 overflow-y-auto nice-scroll">
          {memberList.map((m) => {
            const isBoardOwner = m.id === board.created_by;
            const isMe = m.id === currentMember?.id;
            // A per-row menu only appears when there's an action to offer.
            const canRemove = canManage && !isBoardOwner;
            const canMakeOwner = amOwner && !isBoardOwner;
            const hasMenu = canRemove || canMakeOwner;
            return (
              <li
                key={m.id}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-surface-sunken"
              >
                <Avatar member={m} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-ink">
                      {m.name}
                      {isMe && <span className="text-ink-faint"> (you)</span>}
                    </span>
                    {isBoardOwner && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FDAB3D]/15 px-1.5 py-0.5 text-[10.5px] font-bold text-[#B97B1E] dark:text-[#FDAB3D]">
                        <Crown size={10} /> Owner
                      </span>
                    )}
                    {!isBoardOwner && m.role === "admin" && (
                      <span
                        title="Workspace admin"
                        className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-bold text-primary dark:bg-primary/20"
                      >
                        <Shield size={10} /> Admin
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-ink-faint">{m.email}</span>
                </span>
                {hasMenu && (
                  <Dropdown
                    align="right"
                    width={180}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Options for ${m.name}`}
                        className="cursor-pointer rounded-md p-1 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover:opacity-100"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    }
                  >
                    {(close) => (
                      <>
                        {canMakeOwner && (
                          <DropdownItem
                            onClick={() => {
                              setTransferTarget(m);
                              close();
                            }}
                          >
                            <Crown size={14} /> Make owner
                          </DropdownItem>
                        )}
                        {canRemove && (
                          <DropdownItem
                            danger
                            onClick={() => {
                              removeMember(m.id);
                              close();
                            }}
                          >
                            <X size={14} /> Remove
                          </DropdownItem>
                        )}
                      </>
                    )}
                  </Dropdown>
                )}
              </li>
            );
          })}
        </ul>

        {/* Add people */}
        {canManage && (
          <div className="mt-3">
            <span className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted">
              <UserPlus size={13} /> Add people
            </span>
            <div className="overflow-hidden rounded-lg border border-edge">
              <div className="flex items-center gap-2 border-b border-edge bg-surface-sunken px-3">
                <Search size={13} className="shrink-0 text-ink-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members…"
                  className="h-9 w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
              <ul className="nice-scroll max-h-[150px] overflow-y-auto">
                {addable.length === 0 ? (
                  <li className="px-3 py-3 text-[12.5px] text-ink-faint">
                    {query.trim() ? `No members match “${query.trim()}”.` : "Everyone's already on the board."}
                  </li>
                ) : (
                  addable.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addMember(m.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-sunken",
                          busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        )}
                      >
                        <Avatar member={m} size={26} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-ink">
                            {m.name}
                          </span>
                          <span className="block truncate text-[11px] text-ink-faint">{m.email}</span>
                        </span>
                        <Check size={14} className="text-ink-faint opacity-0" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Footer: leave */}
        <div className="mt-5 flex items-center">
          {amMember && !amOwner && (
            <button
              type="button"
              onClick={() => setConfirmLeave(true)}
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[#E2445C] transition-colors duration-150 hover:bg-[#E2445C]/10"
            >
              <LogOut size={14} /> Leave board
            </button>
          )}
          {amOwner && (
            <span className="text-[11.5px] text-ink-faint">
              Transfer ownership to leave this board.
            </span>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-lg px-4 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
          >
            Done
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!transferTarget}
        title="Transfer ownership?"
        message={`${transferTarget?.name} will become the owner of "${board.name}". You'll stay on as a member and can leave afterwards. This can't be undone by you once they're the owner.`}
        confirmLabel="Make owner"
        onCancel={() => setTransferTarget(null)}
        onConfirm={doTransfer}
      />

      <ConfirmDialog
        open={confirmLeave}
        title="Leave board?"
        message={`You'll lose access to "${board.name}" and it will disappear from your sidebar. The owner can invite you back.`}
        confirmLabel="Leave"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={doLeave}
      />
    </div>
  );
}
