'use client';

import {Avatar} from '@/components/ui/Avatar';
import type {BoardListItem} from '@/lib/types';
import {cn} from '@/lib/utils';
import {useBoardStore} from '@/store/boardStore';
import {Check, Copy, Loader2, Search, X} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';

/**
 * Duplicate a board: pick a name for the copy and who to invite onto it, then
 * clone the board's *structure* (groups, custom columns and their status
 * labels) into a fresh board you own. Task rows aren't copied — you get an
 * empty board set up the same way, ready for a new team.
 */
export function CloneBoardModal({
  open,
  onClose,
  board,
}: {
  open: boolean;
  onClose: () => void;
  board: BoardListItem | null;
}) {
  const router = useRouter();
  const members = useBoardStore((s) => s.members);
  const currentMember = useBoardStore((s) => s.currentMember);
  const cloneBoard = useBoardStore((s) => s.cloneBoard);

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && board) {
      setName(`${board.name} (copy)`);
      setSelected([]);
      setQuery('');
      setSubmitting(false);
    }
  }, [open, board]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // You become the owner of the copy, so you're always included and never
  // listed in the picker.
  const others = useMemo(
    () => members.filter((m) => m.id !== currentMember?.id),
    [members, currentMember]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return others;
    return others.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [others, query]);

  if (!open || !board) return null;

  const valid = name.trim().length > 0;

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const created = await cloneBoard(board.id, {
      name: name.trim(),
      memberIds: selected,
    });
    setSubmitting(false);
    if (created) {
      onClose();
      router.push(`/board/${created.id}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Duplicate board">
      <div
        className="w-full max-w-md animate-pop-in rounded-xl border border-edge bg-surface-raised p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[15.5px] font-bold text-ink">Duplicate board</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          Copies the columns, groups and status labels of{' '}
          <span className="font-semibold text-ink">{board.name}</span> into a new
          board. Tasks aren&apos;t copied — you start with an empty table.
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
            New board name
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            maxLength={200}
            placeholder="e.g. Marketing Q3 (copy)"
            className="h-10 w-full rounded-lg border border-edge bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
          />
        </label>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-ink-muted">
              Invite people <span className="text-ink-faint">(optional)</span>
            </span>
            {selected.length > 0 && (
              <span className="text-[11.5px] font-semibold text-primary">
                {selected.length} selected
              </span>
            )}
          </div>

          {others.length === 0 ? (
            <p className="rounded-lg border border-edge bg-surface-sunken px-3 py-2.5 text-[12.5px] text-ink-faint">
              No other members in the workspace yet — the copy is visible only to
              you.
            </p>
          ) : (
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
              <ul className="nice-scroll max-h-[168px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-[12.5px] text-ink-faint">
                    No members match “{query.trim()}”.
                  </li>
                ) : (
                  filtered.map((m) => {
                    const active = selected.includes(m.id);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => toggle(m.id)}
                          aria-pressed={active}
                          className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-sunken">
                          <Avatar member={m} size={26} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-semibold text-ink">
                              {m.name}
                            </span>
                            <span className="block truncate text-[11px] text-ink-faint">
                              {m.email}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
                              active
                                ? 'border-primary bg-primary text-white'
                                : 'border-edge text-transparent'
                            )}>
                            <Check size={12} />
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
          <p className="mt-1.5 text-[11.5px] text-ink-faint">
            You own the copy and are always included. Invited people get a
            notification.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-lg px-4 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || submitting}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Copy size={14} />
            )}
            Duplicate board
          </button>
        </div>
      </div>
    </div>
  );
}
