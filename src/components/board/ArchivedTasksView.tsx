"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, ArrowLeft, Loader2, PackageOpen, Search, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { api } from "@/lib/api";
import { useBoardStore } from "@/store/boardStore";
import { StatusPill } from "@/components/ui/Badges";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { TaskCard } from "@/lib/types";

/** A task from /tasks/archived/ — a board card plus its section context. */
interface ArchivedTask extends TaskCard {
  group_title: string;
  group_color: string;
  archived_at: string;
}

export function ArchivedTasksView({ boardId }: { boardId: number }) {
  const router = useRouter();
  const board = useBoardStore((s) => s.board);
  const unarchiveTask = useBoardStore((s) => s.unarchiveTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const [tasks, setTasks] = useState<ArchivedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArchivedTask | null>(null);

  useEffect(() => {
    if (Number.isNaN(boardId)) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<ArchivedTask[]>(`/tasks/archived/?board=${boardId}`)
      .then((data) => !cancelled && setTasks(data))
      .catch(() => !cancelled && setTasks([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.group_title.toLowerCase().includes(q)
    );
  }, [tasks, query]);

  const restore = async (task: ArchivedTask) => {
    setBusy(task.id);
    await unarchiveTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setBusy(null);
  };

  const remove = async () => {
    const task = deleteTarget;
    setDeleteTarget(null);
    if (!task) return;
    setBusy(task.id);
    await deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setBusy(null);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface p-5 md:p-5 rounded-2xl border-[1px] border-[#E7E9EB] dark:border-[#1E2128]">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-edge px-1">
        <button
          type="button"
          onClick={() => router.push(`/board/${boardId}`)}
          aria-label="Back to board"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
          <PackageOpen size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold text-ink">Archived tickets</h1>
          <p className="hidden truncate text-[12px] text-ink-faint md:block">
            {board?.name ? `From ${board.name}` : "Restore a ticket to send it back to the board"}
          </p>
        </div>
      </header>

      {/* Search */}
      <div className="mt-4 flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search archived tickets…"
            className="h-9 w-full rounded-lg border border-edge bg-surface-sunken pl-8 pr-3 text-[13px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
          />
        </div>
        <span className="shrink-0 text-[12.5px] text-ink-faint">
          {loading ? "Loading…" : `${filtered.length} of ${tasks.length}`}
        </span>
      </div>

      {/* List */}
      <div className="nice-scroll mt-4 min-h-0 flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-faint">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
              <PackageOpen size={22} />
            </span>
            <p className="mt-3 text-[13.5px] font-semibold text-ink">
              {tasks.length === 0 ? "Nothing archived" : "No matches"}
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-faint">
              {tasks.length === 0
                ? "Archived tickets from this board will show up here."
                : "Try a different search."}
            </p>
          </div>
        ) : (
          <ul className="mx-auto max-w-3xl space-y-2">
            {filtered.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-xl border border-edge bg-surface-raised px-3 py-2.5 shadow-card"
              >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: task.group_color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{task.title}</p>
                  <p className="truncate text-[11.5px] text-ink-faint">
                    {task.group_title} · archived {formatRelativeTime(task.archived_at)}
                  </p>
                </div>
                <StatusPill status={task.status} />
                <button
                  type="button"
                  onClick={() => restore(task)}
                  disabled={busy === task.id}
                  className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-2.5 text-[12.5px] font-semibold text-ink transition-colors duration-150 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === task.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ArchiveRestore size={13} />
                  )}
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(task)}
                  disabled={busy === task.id}
                  aria-label={`Delete ${task.title} permanently`}
                  title="Delete permanently"
                  className="shrink-0 cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-[#E2445C]/10 hover:text-[#E2445C] disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete permanently?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" and all of its updates, files and checklists will be permanently deleted. This can't be undone.`
            : ""
        }
        confirmLabel="Delete forever"
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
