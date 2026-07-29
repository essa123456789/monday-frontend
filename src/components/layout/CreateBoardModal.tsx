'use client';

import {Avatar} from '@/components/ui/Avatar';
import type {BoardListItem, BoardVisibility} from '@/lib/types';
import {cn} from '@/lib/utils';
import {useBoardStore} from '@/store/boardStore';
import {Check, Globe2, ImagePlus, Loader2, Lock, Plus, Search, Trash2, X} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useEffect, useMemo, useRef, useState} from 'react';

const VISIBILITY_OPTIONS: {
  value: BoardVisibility;
  label: string;
  hint: string;
  icon: typeof Globe2;
}[] = [
  {
    value: 'public',
    label: 'Public',
    hint: 'Everyone in the workspace can find and open this board.',
    icon: Globe2,
  },
  {
    value: 'private',
    label: 'Private',
    hint: 'Only you and the people you invite can see it.',
    icon: Lock,
  },
];

export function CreateBoardModal({
  open,
  onClose,
  board = null,
  onDelete,
  folderId = null,
  personal = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Pass an existing board to manage it (rename / sharing) instead of creating. */
  board?: BoardListItem | null;
  /** Shown as a "Delete board" action when managing an existing board. */
  onDelete?: () => void;
  /** When creating, the sidebar folder the new board should land in. */
  folderId?: number | null;
  /** Create a personal board: always private, lives under Personal Boards. */
  personal?: boolean;
}) {
  const router = useRouter();
  const members = useBoardStore((s) => s.members);
  const currentMember = useBoardStore((s) => s.currentMember);
  const addBoard = useBoardStore((s) => s.addBoard);
  const updateBoard = useBoardStore((s) => s.updateBoard);
  const setBoardLogo = useBoardStore((s) => s.setBoardLogo);

  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<BoardVisibility>('public');
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Logo state: `logoFile` is a newly picked file (uploaded on save),
  // `logoUrl` is what the preview shows, `logoCleared` marks a pending removal.
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Personal boards are private by definition — both when creating one and
  // when managing an existing one.
  const isPersonal = personal || !!board?.is_personal;

  useEffect(() => {
    if (open) {
      setName(board?.name ?? '');
      setVisibility(personal || board?.is_personal ? 'private' : board?.visibility ?? 'public');
      setSelected(board?.member_ids ?? []);
      setQuery('');
      setSubmitting(false);
      setLogoFile(null);
      setLogoUrl(board?.logo ?? null);
      setLogoCleared(false);
    }
  }, [open, board, personal]);

  // Free the object URL created for a locally picked file.
  useEffect(() => {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // The board's owner is always included and never listed in the picker. When
  // creating, the acting user is the owner-to-be.
  const ownerId = board ? board.created_by : currentMember?.id ?? null;
  const others = useMemo(
    () => members.filter((m) => m.id !== ownerId),
    [members, ownerId]
  );
  // Sharing settings (visibility + invitees) are owner/admin territory —
  // matches the server-side rule, so nobody hits a surprise 403.
  const canManageSharing =
    !board ||
    (currentMember != null &&
      (board.created_by === currentMember.id || currentMember.role === 'admin'));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return others;
    return others.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [others, query]);

  if (!open) return null;

  const valid = name.trim().length > 0;

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    if (board) {
      const patch: Partial<Pick<BoardListItem, 'name' | 'visibility' | 'member_ids'>> = {
        name: name.trim(),
      };
      if (canManageSharing) {
        patch.visibility = visibility;
        patch.member_ids = visibility === 'private' ? selected : [];
      }
      const updated = await updateBoard(board.id, patch);
      if (updated && (logoFile || logoCleared)) {
        await setBoardLogo(board.id, logoFile);
      }
      setSubmitting(false);
      if (updated) onClose();
    } else {
      const created = await addBoard(
        name.trim(),
        isPersonal ? 'private' : visibility,
        visibility === 'private' || isPersonal ? selected : [],
        folderId,
        isPersonal
      );
      // The board has to exist before its logo can be attached to it.
      if (created && logoFile) await setBoardLogo(created.id, logoFile);
      setSubmitting(false);
      if (created) {
        onClose();
        router.push(`/board/${created.id}`);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create board">
      <div
        className="w-full max-w-md animate-pop-in rounded-xl border border-edge bg-surface-raised p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[15.5px] font-bold text-ink">
            {board ? 'Manage board' : isPersonal ? 'Create a personal board' : 'Create a board'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          {board
            ? 'Rename the board or change who can see it.'
            : isPersonal
              ? 'Personal boards are private — only you and the people you invite can see them.'
              : 'Boards hold your groups and tasks. Pick who can see this one.'}
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
            Board name
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            maxLength={200}
            placeholder="e.g. Marketing Q3"
            className="h-10 w-full rounded-lg border border-edge bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
          />
        </label>

        <div className="mt-4">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
            Logo <span className="text-ink-faint">(optional)</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-edge bg-surface-sunken text-ink-faint">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logos come from the API host, not the Next image loader
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus size={18} />
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="h-8 cursor-pointer rounded-lg border border-edge px-3 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken">
                {logoUrl ? 'Replace' : 'Upload'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoUrl(null);
                    setLogoCleared(true);
                    if (logoInputRef.current) logoInputRef.current.value = '';
                  }}
                  className="h-8 cursor-pointer rounded-lg px-2.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken">
                  Remove
                </button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLogoFile(file);
                setLogoCleared(false);
              }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-faint">
            Shown next to the board in the Overview project list. Images up to 5MB.
          </p>
        </div>

        {!isPersonal && (
        <div className="mt-4">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
            Who can see it
          </span>
          {!canManageSharing && (
            <p className="mb-1.5 text-[11.5px] text-ink-faint">
              Only the board&apos;s creator or a workspace admin can change
              sharing settings — you can still rename the board.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => canManageSharing && setVisibility(opt.value)}
                  disabled={!canManageSharing}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors duration-150',
                    canManageSharing
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-60',
                    active
                      ? 'border-primary bg-primary-soft dark:bg-primary/15'
                      : cn('border-edge', canManageSharing && 'hover:bg-surface-sunken')
                  )}>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 text-[13px] font-semibold',
                      active ? 'text-primary' : 'text-ink'
                    )}>
                    <Icon size={14} /> {opt.label}
                  </span>
                  <span className="text-[11.5px] leading-snug text-ink-faint">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {(visibility === 'private' || isPersonal) && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-ink-muted">
                {board ? 'People with access' : 'Invite people'}{' '}
                <span className="text-ink-faint">(optional)</span>
              </span>
              {selected.length > 0 && (
                <span className="text-[11.5px] font-semibold text-primary">
                  {selected.length} selected
                </span>
              )}
            </div>

            {others.length === 0 ? (
              <p className="rounded-lg border border-edge bg-surface-sunken px-3 py-2.5 text-[12.5px] text-ink-faint">
                No other members in the workspace yet — the board is visible
                only to {board ? 'its creator' : 'you'}.
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
                            onClick={() => canManageSharing && toggle(m.id)}
                            disabled={!canManageSharing}
                            aria-pressed={active}
                            className={cn(
                              'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150',
                              canManageSharing
                                ? 'cursor-pointer hover:bg-surface-sunken'
                                : 'cursor-not-allowed opacity-60'
                            )}>
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
              {board
                ? "The board's creator is always included. Newly invited people get a notification."
                : "You're always included. Invited people get a notification."}
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          {board && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[#E2445C] transition-colors duration-150 hover:bg-[#E2445C]/10">
              <Trash2 size={14} /> Delete board
            </button>
          )}
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
            ) : board ? (
              <Check size={14} />
            ) : (
              <Plus size={14} />
            )}
            {board ? 'Save changes' : 'Create board'}
          </button>
        </div>
      </div>
    </div>
  );
}
