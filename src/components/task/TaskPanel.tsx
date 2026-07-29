'use client';

import {Avatar, AvatarStack} from '@/components/ui/Avatar';
import {LabelChip, PriorityBadge, StatusPill} from '@/components/ui/Badges';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Dropdown, DropdownItem} from '@/components/ui/Dropdown';
import {Skeleton} from '@/components/ui/Skeleton';
import {api} from '@/lib/api';
import type {Attachment, Label, Member, Subitem, TaskDetail} from '@/lib/types';
import {
  cn,
  formatFileSize,
  formatRelativeTime,
  LABEL_COLORS,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from '@/lib/utils';
import {useBoardMembers, useBoardStore} from '@/store/boardStore';
import {
  AlignLeft,
  Archive,
  CalendarDays,
  Check,
  CheckSquare,
  Clock,
  CornerDownRight,
  Download,
  ExternalLink,
  File,
  Link2,
  ListTree,
  Loader2,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  Tag,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {toast} from 'sonner';

type Tab = 'updates' | 'files' | 'activity';

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex w-28 shrink-0 items-center gap-2 text-[12.5px] font-medium text-ink-faint">
        {icon} {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Bare URLs and www.-prefixed hosts; trailing punctuation is left out of the match. */
const URL_PATTERN = /(https?:\/\/|www\.)[^\s<]+/gi;

/** Fill `el` with `text`, wrapping every URL it contains in a live anchor.
 *
 * Writes real DOM nodes (never innerHTML) so the description text can't inject
 * markup. Newlines survive via the field's `whitespace-pre-wrap`. */
function renderLinkified(el: HTMLElement, text: string) {
  el.textContent = '';
  if (!text) return;
  const frag = document.createDocumentFragment();
  let last = 0;
  let match: RegExpExecArray | null;
  URL_PATTERN.lastIndex = 0;
  while ((match = URL_PATTERN.exec(text))) {
    // Sentence punctuation right after a link belongs to the sentence, not the URL.
    const raw = match[0].replace(/[.,:;!?"')\]]+$/, '');
    if (!raw) continue;
    if (match.index > last)
      frag.appendChild(document.createTextNode(text.slice(last, match.index)));
    const a = document.createElement('a');
    a.href = raw.startsWith('http') ? raw : `https://${raw}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className =
      'cursor-pointer break-all text-primary underline underline-offset-2 hover:opacity-80';
    a.textContent = raw;
    frag.appendChild(a);
    last = match.index + raw.length;
    URL_PATTERN.lastIndex = last;
  }
  if (last < text.length)
    frag.appendChild(document.createTextNode(text.slice(last)));
  el.appendChild(frag);
}

/** Free-text description field that keeps URLs clickable while staying editable.
 *
 * A contenteditable rather than a textarea, because a textarea can only hold
 * plain text â€” anchors need real elements. Links are re-detected on blur, so
 * the caret never jumps mid-word while typing. */
function DescriptionEditor({task}: {task: TaskDetail}) {
  const updateTask = useBoardStore((s) => s.updateTask);
  const saved = useRef(task.description);
  const boxRef = useRef<HTMLDivElement>(null);

  // Repaint only when the task itself changes â€” re-running this on every
  // keystroke would blow away the caret.
  useEffect(() => {
    saved.current = task.description;
    if (boxRef.current) renderLinkified(boxRef.current, task.description);
  }, [task.id, task.description]);

  const save = () => {
    const el = boxRef.current;
    if (!el) return;
    // contenteditable pads with non-breaking spaces; normalise them back.
    const next = el.innerText.replace(/ /g, ' ').replace(/\n$/, '');
    // Re-link whatever was typed, now that the caret is leaving.
    renderLinkified(el, next);
    if (next !== saved.current) {
      saved.current = next;
      updateTask(task.id, {description: next});
    }
  };

  return (
    <div
      ref={boxRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Description"
      data-placeholder="Add a more detailed description"
      onBlur={save}
      onClick={(e) => {
        // Inside a contenteditable a click on an anchor only moves the caret,
        // so open the link ourselves.
        const a = (e.target as HTMLElement).closest('a');
        if (a) {
          e.preventDefault();
          window.open(
            a.getAttribute('href') ?? '',
            '_blank',
            'noopener,noreferrer'
          );
        }
      }}
      className="min-h-[92px] w-full cursor-text overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-edge bg-surface-sunken p-3 text-[13.5px] leading-relaxed text-ink outline-none transition-colors duration-150 empty:before:text-ink-faint empty:before:content-[attr(data-placeholder)] focus:border-primary focus:bg-surface-raised"
    />
  );
}

function Checklist({task}: {task: TaskDetail}) {
  const addChecklistItem = useBoardStore((s) => s.addChecklistItem);
  const toggleChecklistItem = useBoardStore((s) => s.toggleChecklistItem);
  const deleteChecklistItem = useBoardStore((s) => s.deleteChecklistItem);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  const done = task.checklist.filter((c) => c.done).length;
  const total = task.checklist.length;

  const submit = async () => {
    const t = text.trim();
    setText('');
    if (!t) {
      setAdding(false);
      return;
    }
    await addChecklistItem(t);
  };

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <CheckSquare size={15} className="text-ink-faint" /> Checklist
          {total > 0 && (
            <span className="text-[12px] font-medium text-ink-faint">
              {done}/{total}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-primary transition-colors duration-150 hover:bg-primary-soft dark:hover:bg-primary/15">
          <Plus size={13} /> Add item
        </button>
      </div>

      {total > 0 && (
        <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-[#10B981] transition-[width] duration-300"
            style={{width: total ? `${(done / total) * 100}%` : 0}}
          />
        </div>
      )}

      <ul className="space-y-1">
        {task.checklist.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-surface-sunken">
            <input
              type="checkbox"
              id={`check-${item.id}`}
              checked={item.done}
              onChange={(e) => toggleChecklistItem(item.id, e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[#10B981]"
            />
            <label
              htmlFor={`check-${item.id}`}
              className={cn(
                'flex-1 cursor-pointer text-[13px] transition-colors duration-150',
                item.done ? 'text-ink-faint line-through' : 'text-ink'
              )}>
              {item.text}
            </label>
            <button
              type="button"
              onClick={() => deleteChecklistItem(item.id)}
              aria-label={`Delete checklist item ${item.text}`}
              className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:text-[#E2445C] group-hover:opacity-100">
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            submit();
            setAdding(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') {
              setAdding(false);
              setText('');
            }
          }}
          placeholder="Checklist item, press Enterâ€¦"
          className="mt-1.5 w-full rounded-lg border border-primary bg-surface-raised px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
      )}
    </section>
  );
}

function SubitemRow({sub, parentId}: {sub: Subitem; parentId: number}) {
  const updateSubitem = useBoardStore((s) => s.updateSubitem);
  const deleteSubitem = useBoardStore((s) => s.deleteSubitem);
  const openTask = useBoardStore((s) => s.openTask);
  const boardId = useBoardStore((s) => s.activeTask?.board);
  const boardMembers = useBoardMembers(boardId);
  const members = [
    ...boardMembers,
    ...sub.assignees.filter((a) => !boardMembers.some((m) => m.id === a.id)),
  ];

  const onUpdate = (patch: Record<string, unknown>) =>
    updateSubitem(parentId, sub.id, patch);

  const toggleAssignee = (memberId: number) => {
    const ids = sub.assignees.map((a) => a.id);
    const next = ids.includes(memberId)
      ? ids.filter((i) => i !== memberId)
      : [...ids, memberId];
    onUpdate({assignee_ids: next});
  };

  return (
    <li className="group flex items-center gap-2 rounded-lg border border-edge px-2.5 py-1.5 transition-colors duration-150 hover:bg-surface-sunken">
      <CornerDownRight size={13} className="shrink-0 text-ink-faint" />
      <button
        type="button"
        onClick={() => openTask(sub.id)}
        className={cn(
          'min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] transition-colors duration-150 hover:text-primary',
          sub.status === 'done' ? 'text-ink-faint line-through' : 'text-ink'
        )}
        title={sub.title}>
        {sub.title}
      </button>

      <Dropdown
        align="right"
        width={170}
        trigger={
          <button
            type="button"
            aria-label="Change subitem status"
            className="cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-semibold transition-opacity duration-150 hover:opacity-90"
            style={{
              backgroundColor: STATUS_META[sub.status].color,
              color: STATUS_META[sub.status].text,
            }}>
            {STATUS_META[sub.status].label}
          </button>
        }>
        {(close) => (
          <>
            {STATUS_ORDER.map((s) => (
              <DropdownItem
                key={s}
                active={sub.status === s}
                onClick={() => {
                  onUpdate({status: s});
                  close();
                }}>
                <StatusPill status={s} />
              </DropdownItem>
            ))}
          </>
        )}
      </Dropdown>

      <Dropdown
        align="right"
        width={220}
        trigger={
          <button
            type="button"
            className="flex cursor-pointer items-center"
            aria-label="Edit subitem owners">
            {sub.assignees.length > 0 ? (
              <AvatarStack members={sub.assignees} size={22} max={2} />
            ) : (
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-ink-faint/50 text-ink-faint transition-colors duration-150 hover:border-primary hover:text-primary">
                <Plus size={11} />
              </span>
            )}
          </button>
        }>
        {members.map((m) => (
          <DropdownItem key={m.id} onClick={() => toggleAssignee(m.id)}>
            <Avatar member={m} size={22} />
            <span className="flex-1">{m.name}</span>
            {sub.assignees.some((a) => a.id === m.id) && (
              <Check size={15} className="text-primary" />
            )}
          </DropdownItem>
        ))}
      </Dropdown>

      <button
        type="button"
        onClick={() => deleteSubitem(parentId, sub.id)}
        aria-label={`Delete subitem ${sub.title}`}
        className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:text-[#E2445C] group-hover:opacity-100">
        <Trash2 size={13} />
      </button>
    </li>
  );
}

function SubitemsSection({task}: {task: TaskDetail}) {
  const addSubitem = useBoardStore((s) => s.addSubitem);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  const done = task.subitems.filter((s) => s.status === 'done').length;
  const total = task.subitems.length;

  const submit = async () => {
    const t = text.trim();
    setText('');
    if (!t) {
      setAdding(false);
      return;
    }
    await addSubitem(task.id, task.group, t);
  };

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <ListTree size={15} className="text-ink-faint" /> Subitems
          {total > 0 && (
            <span className="text-[12px] font-medium text-ink-faint">
              {done}/{total}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-primary transition-colors duration-150 hover:bg-primary-soft dark:hover:bg-primary/15">
          <Plus size={13} /> Add subitem
        </button>
      </div>

      {total > 0 && (
        <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${(done / total) * 100}%`,
              backgroundColor: '#B0DC51',
            }}
          />
        </div>
      )}

      <ul className="space-y-1.5">
        {task.subitems.map((sub) => (
          <SubitemRow key={sub.id} sub={sub} parentId={task.id} />
        ))}
      </ul>

      {adding && (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            submit();
            setAdding(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') {
              setAdding(false);
              setText('');
            }
          }}
          placeholder="Subitem title, press Enterâ€¦"
          className="mt-1.5 w-full rounded-lg border border-primary bg-surface-raised px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
      )}
    </section>
  );
}

function UpdatesTab({task}: {task: TaskDetail}) {
  const addComment = useBoardStore((s) => s.addComment);
  const deleteComment = useBoardStore((s) => s.deleteComment);
  const currentMember = useBoardStore((s) => s.currentMember);
  const members = useBoardMembers(task.board);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // Members the user explicitly picked from the @-menu, so we can send their
  // ids (the server prefers `mention_ids` over fuzzy @name matching).
  const [mentioned, setMentioned] = useState<Member[]>([]);

  // @mention autocomplete on the trailing "@word"
  const mentionMatch = /(?:^|\s)@(\w*)$/.exec(text);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const suggestions =
    mentionQuery !== null
      ? members
          .filter(
            (m) =>
              m.id !== currentMember?.id &&
              (m.name.toLowerCase().startsWith(mentionQuery) ||
                m.name.split(' ')[0].toLowerCase().startsWith(mentionQuery))
          )
          .slice(0, 5)
      : [];

  const insertMention = (member: Member) => {
    const first = member.name.split(' ')[0];
    setText((prev) => prev.replace(/@\w*$/, `@${first} `));
    setMentioned((prev) =>
      prev.some((m) => m.id === member.id) ? prev : [...prev, member]
    );
  };

  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    // Only keep picks whose @firstname token still survives in the text.
    const mentionIds = mentioned
      .filter((m) => new RegExp(`@${m.name.split(' ')[0]}\\b`, 'i').test(t))
      .map((m) => m.id);
    setSending(true);
    await addComment(t, mentionIds);
    setText('');
    setMentioned([]);
    setSending(false);
  };

  return (
    <div>
      <div className="flex items-start gap-2.5">
        {currentMember && <Avatar member={currentMember} size={30} />}
        <div className="relative flex-1">
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 z-10 mb-1 w-56 animate-pop-in rounded-lg border border-edge bg-surface-raised p-1 shadow-pop">
              <p className="px-2 pb-0.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
                Mention
              </p>
              {suggestions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(m);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-ink transition-colors duration-150 hover:bg-surface-sunken">
                  <Avatar member={m} size={20} /> {m.name}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && suggestions.length > 0) {
                e.preventDefault();
                insertMention(suggestions[0]);
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (suggestions.length > 0) insertMention(suggestions[0]);
                else submit();
              }
            }}
            rows={2}
            placeholder="Write an updateâ€¦ use @name to mention (Enter to send)"
            className="w-full resize-none rounded-lg border border-edge bg-surface-sunken p-2.5 pr-10 text-[13px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary focus:bg-surface-raised"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || sending}
            aria-label="Send update"
            className="absolute bottom-2.5 right-2 cursor-pointer rounded-md p-1.5 text-primary transition-colors duration-150 hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-primary/15">
            <Send size={15} />
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {task.comments.length === 0 && (
          <p className="py-4 text-center text-[13px] text-ink-faint">
            No updates yet. Start the conversation!
          </p>
        )}
        {task.comments.map((c) => (
          <li key={c.id} className="group flex items-start gap-2.5">
            <Avatar member={c.author_detail} size={30} />
            <div className="min-w-0 flex-1 rounded-lg rounded-tl-none border border-edge bg-surface-sunken px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-ink">
                  {c.author_detail.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] text-ink-faint">
                    {formatRelativeTime(c.created_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteComment(c.id)}
                    aria-label="Delete update"
                    className="cursor-pointer rounded p-0.5 text-ink-faint opacity-0 transition-all duration-150 hover:text-[#E2445C] group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                {c.text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilesTab({task}: {task: TaskDetail}) {
  const uploadAttachment = useBoardStore((s) => s.uploadAttachment);
  const deleteAttachment = useBoardStore((s) => s.deleteAttachment);
  const addLink = useBoardStore((s) => s.addLink);
  const deleteLink = useBoardStore((s) => s.deleteLink);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const onFile = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    await uploadAttachment(files[0]);
    setUploading(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  // Pulled through the API rather than linked directly: the file lives on the
  // API origin, where a plain `download` attribute is ignored, and this way the
  // request carries the auth token.
  const download = async (attachment: Attachment) => {
    setDownloading(attachment.id);
    try {
      const blob = await api.getBlob(`/attachments/${attachment.id}/download/`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Could not download "${attachment.name}"`);
    }
    setDownloading(null);
  };

  const submitLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;
    await addLink(
      linkTitle.trim() || url,
      url.startsWith('http') ? url : `https://${url}`
    );
    setLinkTitle('');
    setLinkUrl('');
    setAddingLink(false);
  };

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Paperclip size={15} className="text-ink-faint" /> Attachments
          </h3>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-primary transition-colors duration-150 hover:bg-primary-soft disabled:opacity-50 dark:hover:bg-primary/15">
            <UploadCloud size={13} /> {uploading ? 'Uploadingâ€¦' : 'Upload'}
          </button>
          <input
            ref={fileInput}
            type="file"
            hidden
            onChange={(e) => onFile(e.target.files)}
            aria-label="Upload file"
          />
        </div>
        {task.attachments.length === 0 && (
          <p className="rounded-lg border-2 border-dashed border-edge px-3 py-5 text-center text-[12.5px] text-ink-faint">
            No files yet â€” upload documents, images or specs.
          </p>
        )}
        <ul className="space-y-1.5">
          {task.attachments.map((a) => (
            <li
              key={a.id}
              className="group flex items-center gap-2.5 rounded-lg border border-edge px-3 py-2 transition-colors duration-150 hover:bg-surface-sunken">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/15">
                <File size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={a.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-[13px] font-medium text-ink hover:text-primary hover:underline">
                  {a.name}
                </a>
                <p className="text-[11px] text-ink-faint">
                  {formatFileSize(a.size)}
                  {a.uploaded_by_detail &&
                    ` Â· ${a.uploaded_by_detail.name}`}{' '}
                  Â· {formatRelativeTime(a.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => download(a)}
                disabled={downloading === a.id}
                aria-label={`Download file ${a.name}`}
                title="Download"
                className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:text-primary group-hover:opacity-100 disabled:opacity-50">
                {downloading === a.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
              </button>
              <button
                type="button"
                onClick={() => deleteAttachment(a.id)}
                aria-label={`Delete file ${a.name}`}
                className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:text-[#E2445C] group-hover:opacity-100">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Link2 size={15} className="text-ink-faint" /> Links
          </h3>
          <button
            type="button"
            onClick={() => setAddingLink(!addingLink)}
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-primary transition-colors duration-150 hover:bg-primary-soft dark:hover:bg-primary/15">
            <Plus size={13} /> Add link
          </button>
        </div>

        {addingLink && (
          <div className="mb-2 space-y-1.5 rounded-lg border border-edge p-2.5">
            <input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://â€¦"
              className="w-full rounded-md border border-edge bg-surface-sunken px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-primary"
            />
            <input
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitLink()}
              placeholder="Title (optional)"
              className="w-full rounded-md border border-edge bg-surface-sunken px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-primary"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setAddingLink(false)}
                className="cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium text-ink-muted hover:bg-surface-sunken">
                Cancel
              </button>
              <button
                type="button"
                onClick={submitLink}
                disabled={!linkUrl.trim()}
                className="cursor-pointer rounded-md bg-primary px-2.5 py-1 text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:opacity-40">
                Add
              </button>
            </div>
          </div>
        )}

        {task.links.length === 0 && !addingLink && (
          <p className="text-[12.5px] text-ink-faint">No links yet.</p>
        )}
        <ul className="space-y-1.5">
          {task.links.map((l) => (
            <li
              key={l.id}
              className="group flex items-center gap-2.5 rounded-lg border border-edge px-3 py-2 transition-colors duration-150 hover:bg-surface-sunken">
              <ExternalLink size={15} className="shrink-0 text-ink-faint" />
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink hover:text-primary hover:underline">
                {l.title}
              </a>
              <button
                type="button"
                onClick={() => deleteLink(l.id)}
                aria-label={`Delete link ${l.title}`}
                className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:text-[#E2445C] group-hover:opacity-100">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ActivityTab({task}: {task: TaskDetail}) {
  if (task.activity.length === 0) {
    return (
      <p className="py-4 text-center text-[13px] text-ink-faint">
        No activity recorded yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {task.activity.map((a) => (
        <li key={a.id} className="flex items-start gap-2.5">
          {a.member_detail ? (
            <Avatar member={a.member_detail} size={26} />
          ) : (
            <span className="h-[26px] w-[26px] shrink-0 rounded-full bg-ink-faint/20" />
          )}
          <div className="min-w-0">
            <p className="text-[13px] leading-snug text-ink">
              <span className="font-semibold">
                {a.member_detail?.name ?? 'Someone'}
              </span>{' '}
              {a.text}
            </p>
            <p className="text-[11px] text-ink-faint">
              {formatRelativeTime(a.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TaskPanel() {
  const task = useBoardStore((s) => s.activeTask);
  const loading = useBoardStore((s) => s.activeTaskLoading);
  const closeTask = useBoardStore((s) => s.closeTask);
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const archiveTask = useBoardStore((s) => s.archiveTask);
  const boardMembers = useBoardMembers(task?.board);
  const members = task
    ? [
        ...boardMembers,
        ...task.assignees.filter(
          (a) => !boardMembers.some((m) => m.id === a.id)
        ),
      ]
    : boardMembers;
  const board = useBoardStore((s) => s.board);
  const addLabelToBoard = useBoardStore((s) => s.addLabelToBoard);

  const [tab, setTab] = useState<Tab>('updates');
  const [titleValue, setTitleValue] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [externalLabels, setExternalLabels] = useState<Label[] | null>(null);

  useEffect(() => {
    setTab('updates');
    setEditingTitle(false);
  }, [task?.id]);

  // When the task belongs to another board (e.g. opened from the Overview),
  // fetch that board's labels instead of using the currently loaded board.
  const sameBoard = !task || board?.id === task.board;
  useEffect(() => {
    if (!task || sameBoard) {
      setExternalLabels(null);
      return;
    }
    let cancelled = false;
    api
      .get<Label[]>(`/labels/?board=${task.board}`)
      .then((labels) => !cancelled && setExternalLabels(labels))
      .catch(() => !cancelled && setExternalLabels([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.board, sameBoard]);

  const availableLabels = sameBoard
    ? (board?.labels ?? [])
    : (externalLabels ?? []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingTitle) closeTask();
    };
    if (task || loading) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [task, loading, editingTitle, closeTask]);

  if (!task && !loading) return null;

  const submitTitle = () => {
    setEditingTitle(false);
    const t = titleValue.trim();
    if (task && t && t !== task.title) updateTask(task.id, {title: t});
  };

  const toggleAssignee = (memberId: number) => {
    if (!task) return;
    const ids = task.assignees.map((a) => a.id);
    const next = ids.includes(memberId)
      ? ids.filter((i) => i !== memberId)
      : [...ids, memberId];
    updateTask(task.id, {assignee_ids: next});
  };

  const toggleLabel = (labelId: number) => {
    if (!task) return;
    const ids = task.labels.map((l) => l.id);
    const next = ids.includes(labelId)
      ? ids.filter((i) => i !== labelId)
      : [...ids, labelId];
    updateTask(task.id, {label_ids: next});
  };

  const createLabel = async () => {
    const name = newLabelName.trim();
    if (!name || !task) return;
    setNewLabelName('');
    const color = LABEL_COLORS[availableLabels.length % LABEL_COLORS.length];
    let label: Label | null = null;
    if (sameBoard) {
      label = await addLabelToBoard(name, color);
    } else {
      try {
        label = await api.post<Label>('/labels/', {
          board: task.board,
          name,
          color,
        });
        setExternalLabels((prev) => (prev ? [...prev, label!] : [label!]));
      } catch {
        label = null;
      }
    }
    if (label)
      updateTask(task.id, {
        label_ids: [...task.labels.map((l) => l.id), label.id],
      });
  };

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/30 animate-fade-in lg:hidden"
        onClick={closeTask}
      />

      <aside
        className="fixed inset-y-0 right-0 z-50 lg:my-6 lg:mr-6 lg:rounded-xl flex w-full max-w-[540px] animate-slide-in-right flex-col border-l border-edge bg-surface-raised shadow-panel"
        role="dialog"
        aria-label="Task details">
        {loading || !task ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-2 border-b border-edge p-4 pb-3">
              <div className="min-w-0 flex-1">
                {task.parent && (
                  <button
                    type="button"
                    onClick={() =>
                      useBoardStore.getState().openTask(task.parent!)
                    }
                    className="mb-0.5 flex cursor-pointer items-center gap-1 px-2 text-[12px] font-medium text-ink-faint transition-colors duration-150 hover:text-primary"
                    title="Open parent task">
                    <CornerDownRight size={12} /> Subitem of{' '}
                    <span className="truncate font-semibold">
                      {task.parent_title}
                    </span>
                  </button>
                )}
                {editingTitle ? (
                  <input
                    autoFocus
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={submitTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitTitle();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    className="w-full rounded-lg border border-primary bg-surface px-2 py-1 text-[18px] font-bold text-ink outline-none"
                    aria-label="Task title"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleValue(task.title);
                      setEditingTitle(true);
                    }}
                    className="w-full cursor-text rounded-lg px-2 py-1 text-left text-[18px] font-bold leading-snug text-ink transition-colors duration-150 hover:bg-surface-sunken"
                    title="Click to edit title">
                    {task.title}
                  </button>
                )}
                <p className="px-2 text-[11.5px] text-ink-faint">
                  Created {formatRelativeTime(task.created_at)} Â· Updated{' '}
                  {formatRelativeTime(task.updated_at)}
                </p>
              </div>
              {!task.parent && (
                <button
                  type="button"
                  onClick={() => archiveTask(task.id)}
                  aria-label="Archive ticket"
                  title="Archive ticket"
                  className="cursor-pointer rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink">
                  <Archive size={17} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete task"
                className="cursor-pointer rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-[#E2445C]/10 hover:text-[#E2445C]">
                <Trash2 size={17} />
              </button>
              <button
                type="button"
                onClick={closeTask}
                aria-label="Close panel"
                className="cursor-pointer rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto nice-scroll">
              {/* Properties */}
              <div className="border-b border-edge px-4 py-3">
                <PropertyRow icon={<Check size={14} />} label="Status">
                  <Dropdown
                    width={190}
                    trigger={
                      <button
                        type="button"
                        className="cursor-pointer"
                        aria-label="Change status">
                        <StatusPill
                          status={task.status}
                          size="md"
                          className="transition-transform duration-150 hover:opacity-90"
                        />
                      </button>
                    }>
                    {(close) => (
                      <>
                        {STATUS_ORDER.map((s) => (
                          <DropdownItem
                            key={s}
                            active={task.status === s}
                            onClick={() => {
                              updateTask(task.id, {status: s});
                              close();
                            }}>
                            <StatusPill status={s} />
                          </DropdownItem>
                        ))}
                      </>
                    )}
                  </Dropdown>
                </PropertyRow>

                <PropertyRow icon={<AlignLeft size={14} />} label="Priority">
                  <Dropdown
                    width={170}
                    trigger={
                      <button
                        type="button"
                        className="cursor-pointer"
                        aria-label="Change priority">
                        <PriorityBadge priority={task.priority} size="md" />
                      </button>
                    }>
                    {(close) => (
                      <>
                        {PRIORITY_ORDER.map((p) => (
                          <DropdownItem
                            key={p}
                            active={task.priority === p}
                            onClick={() => {
                              updateTask(task.id, {priority: p});
                              close();
                            }}>
                            <PriorityBadge priority={p} />
                          </DropdownItem>
                        ))}
                      </>
                    )}
                  </Dropdown>
                </PropertyRow>

                <PropertyRow icon={<CalendarDays size={14} />} label="Due date">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={task.due_date ?? ''}
                      onChange={(e) =>
                        updateTask(task.id, {due_date: e.target.value || null})
                      }
                      className="cursor-pointer rounded-lg border border-edge bg-surface-sunken px-2.5 py-1.5 text-[13px] text-ink outline-none transition-colors duration-150 focus:border-primary"
                      aria-label="Due date"
                    />
                    {task.due_date && (
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, {due_date: null})}
                        aria-label="Clear due date"
                        className="cursor-pointer rounded p-1 text-ink-faint hover:text-ink">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </PropertyRow>

                <PropertyRow icon={<Users size={14} />} label="Assignees">
                  <Dropdown
                    width={230}
                    trigger={
                      <button
                        type="button"
                        className="flex cursor-pointer flex-wrap items-center gap-1"
                        aria-label="Edit assignees">
                        {task.assignees.length === 0 && (
                          <span className="rounded-lg border border-dashed border-edge px-2.5 py-1 text-[12px] text-ink-faint transition-colors duration-150 hover:border-primary hover:text-primary">
                            + Assign
                          </span>
                        )}
                        {task.assignees.map((m) => (
                          <span
                            key={m.id}
                            className="flex items-center gap-1 rounded-full bg-surface-sunken py-0.5 pl-0.5 pr-2 text-[12px] font-medium text-ink">
                            <Avatar member={m} size={20} />{' '}
                            {m.name.split(' ')[0]}
                          </span>
                        ))}
                      </button>
                    }>
                    {members.map((m) => (
                      <DropdownItem
                        key={m.id}
                        onClick={() => toggleAssignee(m.id)}>
                        <Avatar member={m} size={22} />
                        <span className="flex-1">{m.name}</span>
                        {task.assignees.some((a) => a.id === m.id) && (
                          <Check size={15} className="text-primary" />
                        )}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </PropertyRow>

                <PropertyRow icon={<Tag size={14} />} label="Labels">
                  <Dropdown
                    width={230}
                    trigger={
                      <button
                        type="button"
                        className="flex cursor-pointer flex-wrap items-center gap-1"
                        aria-label="Edit labels">
                        {task.labels.length === 0 && (
                          <span className="rounded-lg border border-dashed border-edge px-2.5 py-1 text-[12px] text-ink-faint transition-colors duration-150 hover:border-primary hover:text-primary">
                            + Label
                          </span>
                        )}
                        {task.labels.map((l) => (
                          <LabelChip key={l.id} label={l} />
                        ))}
                      </button>
                    }>
                    <div className="max-h-56 overflow-y-auto nice-scroll">
                      {availableLabels.map((l) => (
                        <DropdownItem
                          key={l.id}
                          onClick={() => toggleLabel(l.id)}>
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{backgroundColor: l.color}}
                          />
                          <span className="flex-1">{l.name}</span>
                          {task.labels.some((x) => x.id === l.id) && (
                            <Check size={15} className="text-primary" />
                          )}
                        </DropdownItem>
                      ))}
                    </div>
                    <div className="mt-1 border-t border-edge pt-1.5">
                      <input
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createLabel()}
                        placeholder="New label, press Enterâ€¦"
                        className="w-full rounded-md bg-surface-sunken px-2.5 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
                      />
                    </div>
                  </Dropdown>
                </PropertyRow>
              </div>

              {/* Description + checklist */}
              <div className="border-b border-edge px-4 py-4">
                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <AlignLeft size={15} className="text-ink-faint" /> Description
                </h3>
                <DescriptionEditor task={task} />
                {!task.parent && <SubitemsSection task={task} />}
                <Checklist task={task} />
              </div>

              {/* Tabs */}
              <div className="px-4 py-4">
                <div className="mb-4 flex gap-1 rounded-lg bg-surface-sunken p-1">
                  {(
                    [
                      {
                        id: 'updates',
                        label: 'Updates',
                        icon: <MessageCircle size={14} />,
                        count: task.comments.length,
                      },
                      {
                        id: 'files',
                        label: 'Files & Links',
                        icon: <Paperclip size={14} />,
                        count: task.attachments.length + task.links.length,
                      },
                      {
                        id: 'activity',
                        label: 'Activity',
                        icon: <Clock size={14} />,
                        count: null,
                      },
                    ] as {
                      id: Tab;
                      label: string;
                      icon: React.ReactNode;
                      count: number | null;
                    }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={cn(
                        'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-[12.5px] font-medium transition-colors duration-150',
                        tab === t.id
                          ? 'bg-surface-raised text-ink shadow-card'
                          : 'text-ink-muted hover:text-ink'
                      )}>
                      {t.icon} {t.label}
                      {t.count !== null && t.count > 0 && (
                        <span className="rounded-full bg-primary-soft px-1.5 text-[10.5px] font-semibold text-primary dark:bg-primary/20">
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {tab === 'updates' && <UpdatesTab task={task} />}
                {tab === 'files' && <FilesTab task={task} />}
                {tab === 'activity' && <ActivityTab task={task} />}
              </div>
            </div>
          </>
        )}

        <ConfirmDialog
          open={confirmDelete}
          title="Delete task?"
          message={`"${task?.title}" and all of its updates, files and checklist items will be permanently deleted.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            if (task) deleteTask(task.id);
          }}
        />
      </aside>
    </>
  );
}
