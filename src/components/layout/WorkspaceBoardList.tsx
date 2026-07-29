'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {CreateBoardModal} from '@/components/layout/CreateBoardModal';
import {CloneBoardModal} from '@/components/layout/CloneBoardModal';
import {BoardMembersModal} from '@/components/board/BoardMembersModal';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Dropdown, DropdownItem} from '@/components/ui/Dropdown';
import type {BoardListItem, Folder} from '@/lib/types';
import {cn} from '@/lib/utils';
import {useBoardStore} from '@/store/boardStore';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Folder as FolderClosed,
  FolderOpen,
  FolderPlus,
  Globe,
  LayoutGrid,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';
import {useParams, useRouter} from 'next/navigation';
import {useState, type ReactNode} from 'react';

/** Draggable list item for a board row (inside a folder or at the top level).
 * The whole row is the drag handle. */
function SortableBoardLi({id, children}: {id: string; children: ReactNode}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({id});
  return (
    <li
      ref={setNodeRef}
      style={{transform: CSS.Transform.toString(transform), transition}}
      className={cn('group relative', isDragging && 'z-10 opacity-70')}
      {...attributes}
      {...listeners}>
      {children}
    </li>
  );
}

/** Draggable list item for a folder. Only the header is the drag handle (the
 * render prop receives the drag props to spread on it), so dragging a board
 * inside the folder doesn't move the folder itself. */
function SortableFolderLi({
  id,
  children,
}: {
  id: string;
  children: (drag: Record<string, unknown>) => ReactNode;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({id});
  return (
    <li
      ref={setNodeRef}
      style={{transform: CSS.Transform.toString(transform), transition}}
      className={cn(isDragging && 'z-10 opacity-70')}>
      {children({...attributes, ...listeners})}
    </li>
  );
}

/** Full workspace board/folder tree with drag-and-drop reordering, add/rename/
 * delete, and the create/manage modals — the expanded-sidebar content shared
 * by the desktop Sidebar and the mobile Boards page. */
export function WorkspaceBoardList() {
  const router = useRouter();
  const params = useParams<{id?: string}>();
  const activeBoardId = params?.id ? Number(params.id) : null;

  const workspaces = useBoardStore((s) => s.workspaces);
  const currentMember = useBoardStore((s) => s.currentMember);
  const deleteBoard = useBoardStore((s) => s.deleteBoard);
  const addFolder = useBoardStore((s) => s.addFolder);
  const renameFolder = useBoardStore((s) => s.renameFolder);
  const deleteFolder = useBoardStore((s) => s.deleteFolder);
  const setFolderBoardOrder = useBoardStore((s) => s.setFolderBoardOrder);
  const reorderSidebar = useBoardStore((s) => s.reorderSidebar);

  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 6}})
  );

  const [creating, setCreating] = useState(false);
  const [createInFolder, setCreateInFolder] = useState<number | null>(null);
  // Personal-board creation: the personal subfolder the new board lands in.
  const [createPersonalInFolder, setCreatePersonalInFolder] = useState<number | null>(null);
  const [manageTarget, setManageTarget] = useState<BoardListItem | null>(null);
  const [membersTarget, setMembersTarget] = useState<BoardListItem | null>(null);
  const [cloneTarget, setCloneTarget] = useState<BoardListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardListItem | null>(null);
  const [closedFolders, setClosedFolders] = useState<Set<number>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingPersonalFolder, setCreatingPersonalFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [folderDraft, setFolderDraft] = useState('');
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);

  const ws = workspaces[0];
  // Personal subfolders (only ever the current user's own — the server never
  // sends anyone else's) live in their own section below the workspace tree.
  const folders = (ws?.folders ?? []).filter((f) => f.owner == null);
  const personalFolders = (ws?.folders ?? [])
    .filter((f) => f.owner != null)
    .sort((a, b) => a.order - b.order || a.id - b.id);
  const looseBoards =
    ws?.boards.filter((b) => b.folder == null && !b.is_personal) ?? [];
  // Every personal board I can see (owner or member) lives in this section.
  // Those inside one of my visible subfolders render under that folder; the
  // rest — folderless boards, or ones shared from a folder I can't see — sit at
  // the section root. `ws.boards` is already access-filtered by the server, so
  // there's no "shared with me" split: if it's here, I'm on it.
  const loosePersonalBoards =
    ws?.boards.filter(
      (b) => b.is_personal && !personalFolders.some((f) => f.id === b.folder)
    ) ?? [];
  // Apply this user's personal ordering (stored under `key`) to a list of
  // boards; boards it doesn't know about (new ones) keep their default position
  // at the end. `key` is a folder id or a synthetic bucket ("personal-loose").
  const applyOrder = (boards: BoardListItem[], key: string) => {
    const pref = currentMember?.board_order?.[key];
    if (!pref?.length) return boards;
    const rank = new Map(pref.map((id, i) => [id, i]));
    return boards
      .map((b, i) => ({b, sortKey: rank.get(b.id) ?? pref.length + i}))
      .sort((x, y) => x.sortKey - y.sortKey)
      .map((x) => x.b);
  };
  const boardsInFolder = (folderId: number) =>
    applyOrder(
      ws?.boards.filter((b) => b.folder === folderId) ?? [],
      String(folderId)
    );
  // Personal boards that sit at the section root (no visible subfolder) are
  // their own draggable bucket.
  const orderedLoosePersonal = applyOrder(loosePersonalBoards, 'personal-loose');

  // The workspace's top level is one shared, draggable sequence of folders and
  // loose boards. Both carry a server-side `order`; ties (pre-existing data)
  // fall back to folders-first, then id.
  type TopItem =
    | {kind: 'folder'; folder: Folder}
    | {kind: 'board'; board: BoardListItem};
  const topItems: TopItem[] = [
    ...folders.map((folder) => ({kind: 'folder' as const, folder})),
    ...looseBoards.map((board) => ({kind: 'board' as const, board})),
  ].sort((a, b) => {
    const ao = a.kind === 'folder' ? a.folder.order : a.board.order;
    const bo = b.kind === 'folder' ? b.folder.order : b.board.order;
    if (ao !== bo) return ao - bo;
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    const aid = a.kind === 'folder' ? a.folder.id : a.board.id;
    const bid = b.kind === 'folder' ? b.folder.id : b.board.id;
    return aid - bid;
  });
  const topKey = (it: TopItem) =>
    it.kind === 'folder' ? `top-folder-${it.folder.id}` : `top-board-${it.board.id}`;

  const handleTopDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const keys = topItems.map(topKey);
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    reorderSidebar(
      arrayMove(topItems, from, to).map((it) =>
        it.kind === 'folder'
          ? {type: 'folder' as const, id: it.folder.id}
          : {type: 'board' as const, id: it.board.id}
      )
    );
  };

  // Reorder a group of boards (a folder, or a synthetic personal bucket) and
  // persist it under `key`. `ordered` is the currently-shown board sequence.
  const handleBucketDragEnd = (
    key: number | string,
    ordered: BoardListItem[],
    event: DragEndEvent
  ) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const ids = ordered.map((b) => b.id);
    const from = ids.indexOf(Number(String(active.id).slice('board-'.length)));
    const to = ids.indexOf(Number(String(over.id).slice('board-'.length)));
    if (from === -1 || to === -1) return;
    setFolderBoardOrder(key, arrayMove(ids, from, to));
  };

  const handleFolderDragEnd = (folderId: number, event: DragEndEvent) =>
    handleBucketDragEnd(folderId, boardsInFolder(folderId), event);

  // Reorder the personal subfolders. These are owner-scoped, so persisting via
  // reorder_sidebar only affects this user's view even though it's the shared
  // `order` field (nobody else can see them).
  const handlePersonalFolderDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const keys = personalFolders.map((f) => `pfolder-${f.id}`);
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    reorderSidebar(
      arrayMove(personalFolders, from, to).map((f) => ({
        type: 'folder' as const,
        id: f.id,
      }))
    );
  };

  const toggleFolder = (id: number) =>
    setClosedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const commitCreateFolder = () => {
    const name = folderDraft.trim();
    setCreatingFolder(false);
    setFolderDraft('');
    if (name) addFolder(name);
  };

  const commitCreatePersonalFolder = () => {
    const name = folderDraft.trim();
    setCreatingPersonalFolder(false);
    setFolderDraft('');
    if (name) addFolder(name, true);
  };

  const commitRenameFolder = () => {
    const target = renamingFolder;
    const name = folderDraft.trim();
    setRenamingFolder(null);
    setFolderDraft('');
    if (target && name && name !== target.name) renameFolder(target.id, name);
  };

  const boardRowContent = (board: BoardListItem, indented = false) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/board/${board.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/board/${board.id}`)}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150',
        indented && 'pl-8',
        activeBoardId === board.id
          ? 'bg-primary-soft font-semibold text-primary dark:bg-primary/20'
          : 'font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink'
      )}
      title={board.name}>
      {board.visibility === 'private' ? (
        <Lock size={17} className="shrink-0" aria-label="Private board" />
      ) : (
        <Globe size={17} className="shrink-0" aria-label="Public board" />
      )}
      <span className="flex-1 truncate">{board.name}</span>
      <span onClick={(e) => e.stopPropagation()}>
        <Dropdown
          align="right"
          width={170}
          trigger={
            <button
              type="button"
              aria-label={`Board options for ${board.name}`}
              className="cursor-pointer rounded-md p-0.5 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover:opacity-100">
              <MoreHorizontal size={15} />
            </button>
          }>
          {(close) => (
            <>
              <DropdownItem
                onClick={() => {
                  setManageTarget(board);
                  close();
                }}>
                <Settings2 size={14} /> Manage Board
              </DropdownItem>
              {board.is_personal && (
                <DropdownItem
                  onClick={() => {
                    setMembersTarget(board);
                    close();
                  }}>
                  <Users size={14} /> Members
                </DropdownItem>
              )}
              {board.is_personal && (
                <DropdownItem
                  onClick={() => {
                    setCloneTarget(board);
                    close();
                  }}>
                  <Copy size={14} /> Duplicate
                </DropdownItem>
              )}
            </>
          )}
        </Dropdown>
      </span>
    </div>
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-2.5 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {ws?.name ?? 'Workspace'}
        </span>
        <Dropdown
          align="right"
          width={160}
          trigger={
            <button
              type="button"
              aria-label="Add board or folder"
              className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-primary">
              <Plus size={15} />
            </button>
          }>
          {(close) => (
            <>
              <DropdownItem
                onClick={() => {
                  setCreating(true);
                  close();
                }}>
                <LayoutGrid size={14} /> New board
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setCreatingFolder(true);
                  setFolderDraft('');
                  close();
                }}>
                <FolderPlus size={14} /> New folder
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>

      <ul className="space-y-0.5">
        {creatingFolder && (
          <li>
            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
              <FolderClosed size={17} className="shrink-0 text-ink-muted" />
              <input
                autoFocus
                value={folderDraft}
                onChange={(e) => setFolderDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCreateFolder();
                  if (e.key === 'Escape') {
                    setCreatingFolder(false);
                    setFolderDraft('');
                  }
                }}
                onBlur={commitCreateFolder}
                placeholder="Folder name…"
                className="w-full min-w-0 flex-1 rounded-md border border-primary bg-surface px-1.5 py-0.5 text-[13px] text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          </li>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTopDragEnd}>
          <SortableContext
            items={topItems.map(topKey)}
            strategy={verticalListSortingStrategy}>
            {topItems.map((item) => {
              if (item.kind === 'board') {
                return (
                  <SortableBoardLi key={topKey(item)} id={topKey(item)}>
                    {boardRowContent(item.board)}
                  </SortableBoardLi>
                );
              }
              const folder = item.folder;
              const open = !closedFolders.has(folder.id);
              const folderBoards = boardsInFolder(folder.id);
              return (
                <SortableFolderLi key={topKey(item)} id={topKey(item)}>
                  {(drag) => (
                    <>
                      <div
                        {...drag}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleFolder(folder.id)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleFolder(folder.id)}
                        className="group relative flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
                        title={folder.name}>
                        {open ? (
                          <ChevronDown size={13} className="shrink-0 text-ink-faint" />
                        ) : (
                          <ChevronRight size={13} className="shrink-0 text-ink-faint" />
                        )}
                        {open ? (
                          <FolderOpen size={17} className="shrink-0" />
                        ) : (
                          <FolderClosed size={17} className="shrink-0" />
                        )}
                        {renamingFolder?.id === folder.id ? (
                          <input
                            autoFocus
                            value={folderDraft}
                            onChange={(e) => setFolderDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') commitRenameFolder();
                              if (e.key === 'Escape') {
                                setRenamingFolder(null);
                                setFolderDraft('');
                              }
                            }}
                            onBlur={commitRenameFolder}
                            className="w-full min-w-0 flex-1 rounded-md border border-primary bg-surface px-1.5 py-0.5 text-[13px] text-ink outline-none"
                          />
                        ) : (
                          <span className="flex-1 truncate">{folder.name}</span>
                        )}
                        <span onClick={(e) => e.stopPropagation()}>
                          <Dropdown
                            align="right"
                            width={170}
                            trigger={
                              <button
                                type="button"
                                aria-label={`Folder options for ${folder.name}`}
                                className="cursor-pointer rounded-md p-0.5 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover:opacity-100">
                                <MoreHorizontal size={15} />
                              </button>
                            }>
                            {(close) => (
                              <>
                                <DropdownItem
                                  onClick={() => {
                                    setCreateInFolder(folder.id);
                                    close();
                                  }}>
                                  <Plus size={14} /> Add board
                                </DropdownItem>
                                <DropdownItem
                                  onClick={() => {
                                    setRenamingFolder(folder);
                                    setFolderDraft(folder.name);
                                    close();
                                  }}>
                                  <Pencil size={14} /> Rename
                                </DropdownItem>
                                <DropdownItem
                                  danger
                                  onClick={() => {
                                    setDeleteFolderTarget(folder);
                                    close();
                                  }}>
                                  <Trash2 size={14} /> Delete
                                </DropdownItem>
                              </>
                            )}
                          </Dropdown>
                        </span>
                      </div>
                      {open && folderBoards.length > 0 && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleFolderDragEnd(folder.id, e)}>
                          <SortableContext
                            items={folderBoards.map((b) => `board-${b.id}`)}
                            strategy={verticalListSortingStrategy}>
                            <ul className="space-y-0.5">
                              {folderBoards.map((board) => (
                                <SortableBoardLi key={board.id} id={`board-${board.id}`}>
                                  {boardRowContent(board, true)}
                                </SortableBoardLi>
                              ))}
                            </ul>
                          </SortableContext>
                        </DndContext>
                      )}
                      {open && folderBoards.length === 0 && (
                        <p className="py-1 pl-10 text-[11.5px] text-ink-faint">
                          No boards yet
                        </p>
                      )}
                    </>
                  )}
                </SortableFolderLi>
              );
            })}
          </SortableContext>
        </DndContext>
      </ul>

      {/* ——— Personal Boards: private boards in the user's own subfolders ——— */}
      <div className="mt-5">
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Personal Boards
          </span>
          <button
            type="button"
            aria-label="New personal folder"
            title="New folder"
            onClick={() => {
              setCreatingPersonalFolder(true);
              setFolderDraft('');
            }}
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-primary">
            <FolderPlus size={15} />
          </button>
        </div>

        <ul className="space-y-0.5">
          {creatingPersonalFolder && (
            <li>
              <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
                <FolderClosed size={17} className="shrink-0 text-ink-muted" />
                <input
                  autoFocus
                  value={folderDraft}
                  onChange={(e) => setFolderDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitCreatePersonalFolder();
                    if (e.key === 'Escape') {
                      setCreatingPersonalFolder(false);
                      setFolderDraft('');
                    }
                  }}
                  onBlur={commitCreatePersonalFolder}
                  placeholder="Folder name…"
                  className="w-full min-w-0 flex-1 rounded-md border border-primary bg-surface px-1.5 py-0.5 text-[13px] text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
            </li>
          )}

          {personalFolders.length === 0 &&
            loosePersonalBoards.length === 0 &&
            !creatingPersonalFolder && (
              <li>
                <p className="px-2.5 py-1 text-[11.5px] text-ink-faint">
                  Create a folder to start your own private boards.
                </p>
              </li>
            )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handlePersonalFolderDragEnd}>
            <SortableContext
              items={personalFolders.map((f) => `pfolder-${f.id}`)}
              strategy={verticalListSortingStrategy}>
              {personalFolders.map((folder) => {
                const open = !closedFolders.has(folder.id);
                const folderBoards = boardsInFolder(folder.id);
                return (
                  <SortableFolderLi
                    key={`pfolder-${folder.id}`}
                    id={`pfolder-${folder.id}`}>
                    {(drag) => (
                      <>
                        <div
                          {...drag}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleFolder(folder.id)}
                          onKeyDown={(e) => e.key === 'Enter' && toggleFolder(folder.id)}
                          className="group relative flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
                          title={folder.name}>
                  {open ? (
                    <ChevronDown size={13} className="shrink-0 text-ink-faint" />
                  ) : (
                    <ChevronRight size={13} className="shrink-0 text-ink-faint" />
                  )}
                  {open ? (
                    <FolderOpen size={17} className="shrink-0" />
                  ) : (
                    <FolderClosed size={17} className="shrink-0" />
                  )}
                  {renamingFolder?.id === folder.id ? (
                    <input
                      autoFocus
                      value={folderDraft}
                      onChange={(e) => setFolderDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commitRenameFolder();
                        if (e.key === 'Escape') {
                          setRenamingFolder(null);
                          setFolderDraft('');
                        }
                      }}
                      onBlur={commitRenameFolder}
                      className="w-full min-w-0 flex-1 rounded-md border border-primary bg-surface px-1.5 py-0.5 text-[13px] text-ink outline-none"
                    />
                  ) : (
                    <span className="flex-1 truncate">{folder.name}</span>
                  )}
                  <span onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      align="right"
                      width={170}
                      trigger={
                        <button
                          type="button"
                          aria-label={`Folder options for ${folder.name}`}
                          className="cursor-pointer rounded-md p-0.5 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover:opacity-100">
                          <MoreHorizontal size={15} />
                        </button>
                      }>
                      {(close) => (
                        <>
                          <DropdownItem
                            onClick={() => {
                              setCreatePersonalInFolder(folder.id);
                              close();
                            }}>
                            <Plus size={14} /> Add board
                          </DropdownItem>
                          <DropdownItem
                            onClick={() => {
                              setRenamingFolder(folder);
                              setFolderDraft(folder.name);
                              close();
                            }}>
                            <Pencil size={14} /> Rename
                          </DropdownItem>
                          <DropdownItem
                            danger
                            onClick={() => {
                              setDeleteFolderTarget(folder);
                              close();
                            }}>
                            <Trash2 size={14} /> Delete
                          </DropdownItem>
                        </>
                      )}
                    </Dropdown>
                  </span>
                </div>
                {open && folderBoards.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleFolderDragEnd(folder.id, e)}>
                    <SortableContext
                      items={folderBoards.map((b) => `board-${b.id}`)}
                      strategy={verticalListSortingStrategy}>
                      <ul className="space-y-0.5">
                        {folderBoards.map((board) => (
                          <SortableBoardLi key={board.id} id={`board-${board.id}`}>
                            {boardRowContent(board, true)}
                          </SortableBoardLi>
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
                        {open && folderBoards.length === 0 && (
                          <p className="py-1 pl-10 text-[11.5px] text-ink-faint">
                            No boards yet
                          </p>
                        )}
                      </>
                    )}
                  </SortableFolderLi>
                );
              })}
            </SortableContext>
          </DndContext>

          {orderedLoosePersonal.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) =>
                handleBucketDragEnd('personal-loose', orderedLoosePersonal, e)
              }>
              <SortableContext
                items={orderedLoosePersonal.map((b) => `board-${b.id}`)}
                strategy={verticalListSortingStrategy}>
                {orderedLoosePersonal.map((board) => (
                  <SortableBoardLi key={board.id} id={`board-${board.id}`}>
                    {boardRowContent(board)}
                  </SortableBoardLi>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </ul>
      </div>

      <CreateBoardModal
        open={creating || createInFolder != null}
        folderId={createInFolder}
        onClose={() => {
          setCreating(false);
          setCreateInFolder(null);
        }}
      />
      <CreateBoardModal
        open={createPersonalInFolder != null}
        folderId={createPersonalInFolder}
        personal
        onClose={() => setCreatePersonalInFolder(null)}
      />
      {membersTarget && (
        <BoardMembersModal
          open={!!membersTarget}
          boardId={membersTarget.id}
          onClose={() => setMembersTarget(null)}
        />
      )}
      <CloneBoardModal
        open={!!cloneTarget}
        board={cloneTarget}
        onClose={() => setCloneTarget(null)}
      />
      <CreateBoardModal
        open={!!manageTarget}
        board={manageTarget}
        onClose={() => setManageTarget(null)}
        onDelete={() => {
          setDeleteTarget(manageTarget);
          setManageTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteFolderTarget}
        title="Delete folder?"
        message={`"${deleteFolderTarget?.name}" will be deleted. Boards inside it are kept and move back to the top level.`}
        onCancel={() => setDeleteFolderTarget(null)}
        onConfirm={async () => {
          const target = deleteFolderTarget!;
          setDeleteFolderTarget(null);
          await deleteFolder(target.id);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete board?"
        message={`"${deleteTarget?.name}" and all of its groups and tasks will be permanently deleted.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const target = deleteTarget!;
          setDeleteTarget(null);
          await deleteBoard(target.id);
          if (activeBoardId === target.id) {
            const remaining = ws?.boards.filter((b) => b.id !== target.id);
            router.push(remaining?.[0] ? `/board/${remaining[0].id}` : '/');
          }
        }}
      />
    </div>
  );
}
