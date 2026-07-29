import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { membersForBoard } from "@/lib/utils";
import { applyThemeColor } from "@/lib/theme";
import type {
  Activity,
  Attachment,
  BoardColumn,
  BoardDetail,
  BoardListItem,
  BoardVisibility,
  CellValue,
  ChecklistItem,
  ColumnKind,
  Comment,
  Filters,
  Folder,
  Group,
  Label,
  LinkItem,
  Member,
  StatusOption,
  Subitem,
  TaskCard,
  TaskDetail,
  Workspace,
} from "@/lib/types";

/** Starter labels for a new status column — same set the backend seeds. */
const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { label: "Not Started", color: "#797E93" },
  { label: "Working on it", color: "#FDAB3D" },
  { label: "Done", color: "#00C875" },
];

const DEFAULT_FILTERS: Filters = {
  search: "",
  assignees: [],
  statuses: [],
  priorities: [],
  labels: [],
  sort: "manual",
};

export type BoardViewMode = "table" | "kanban";

interface BoardState {
  view: BoardViewMode;
  setView: (v: BoardViewMode) => void;
  workspaces: Workspace[];
  members: Member[];
  currentMember: Member | null;
  board: BoardDetail | null;
  boardLoading: boolean;
  filters: Filters;
  activeTask: TaskDetail | null;
  activeTaskLoading: boolean;
  boardActivity: Activity[];

  setCurrentMember: (member: Member) => void;
  init: () => Promise<void>;
  loadBoard: (id: number) => Promise<void>;
  refreshBoard: () => Promise<void>;

  /** Patch a single card in place from a realtime `task_changed` event. */
  applyRemoteCard: (boardId: number, card: TaskCard) => void;
  /** React to a realtime `membership_changed` event (role change / removal). */
  handleMembershipChange: (workspace: number, removed: boolean) => Promise<void>;

  setFilters: (patch: Partial<Filters>) => void;
  clearFilters: () => void;

  addBoard: (
    name: string,
    visibility?: BoardVisibility,
    memberIds?: number[],
    folderId?: number | null,
    isPersonal?: boolean
  ) => Promise<BoardListItem | null>;
  addFolder: (name: string, personal?: boolean) => Promise<void>;

  /** Custom columns on the loaded (personal/generic) board. */
  addColumn: (name: string, kind: ColumnKind) => Promise<void>;
  renameColumn: (id: number, name: string) => Promise<void>;
  /** Replace a status column's label set. */
  setColumnOptions: (id: number, options: StatusOption[]) => Promise<void>;
  deleteColumn: (id: number) => Promise<void>;
  /** Save a text/number/date cell. Empty value clears the cell. */
  setCell: (taskId: number, columnId: number, value: string) => Promise<void>;
  /** Upload (or clear, with null) a file cell. */
  setCellFile: (taskId: number, columnId: number, file: File | null) => Promise<void>;
  /** Save the acting user's personal ordering of a group of boards, keyed by
   * folder id or a synthetic bucket key (e.g. loose personal boards). */
  setFolderBoardOrder: (folderId: number | string, boardIds: number[]) => Promise<void>;
  /** Save the shared top-level sidebar order (folders + loose boards,
   * interleaved). Changes the default order for every member. */
  reorderSidebar: (items: {type: "folder" | "board"; id: number}[]) => Promise<void>;
  renameFolder: (id: number, name: string) => Promise<void>;
  /** Delete a folder. Its boards survive and return to the top level. */
  deleteFolder: (id: number) => Promise<void>;
  renameBoard: (id: number, name: string) => Promise<void>;
  /** Save board settings (name / visibility / invited members) from the
   * Manage board modal. Returns the updated board, or null on failure. */
  updateBoard: (
    id: number,
    patch: Partial<Pick<BoardListItem, "name" | "visibility" | "member_ids">>
  ) => Promise<BoardListItem | null>;
  /** Upload a board logo, or pass null to clear it. Returns false on failure. */
  setBoardLogo: (id: number, file: File | null) => Promise<boolean>;
  /** Hand a board to another member (owner-only). Returns the updated board. */
  transferBoardOwnership: (id: number, memberId: number) => Promise<BoardListItem | null>;
  /** Remove yourself from a board's members. Returns false on failure. */
  leaveBoard: (id: number) => Promise<boolean>;
  /** Clone a board's structure (groups, custom columns and their status labels)
   * into a fresh board owned by the current user — optionally renamed and with
   * members invited. Task rows are not copied. Returns the new board, or null. */
  cloneBoard: (
    id: number,
    opts: {name?: string; memberIds?: number[]}
  ) => Promise<BoardListItem | null>;
  /** Admin-only: save the company logo and/or accent colour for the workspace.
   * `logo` undefined leaves the mark alone, null clears it. Returns false on
   * failure. */
  saveBranding: (patch: {
    logo?: File | null;
    themeColor?: string;
    brandName?: string;
  }) => Promise<boolean>;
  deleteBoard: (id: number) => Promise<void>;

  addGroup: (title: string) => Promise<void>;
  updateGroup: (id: number, patch: Partial<Pick<Group, "title" | "color">>) => Promise<void>;
  deleteGroup: (id: number) => Promise<void>;
  moveGroupLocal: (activeId: number, overId: number) => void;
  persistGroupOrder: () => Promise<void>;

  addTask: (groupId: number, title: string) => Promise<void>;
  updateTask: (taskId: number, patch: Record<string, unknown>) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  /** Archive a top-level task: removes it from the board, kept in the Archived view. */
  archiveTask: (taskId: number) => Promise<void>;
  /** Restore an archived task back onto the board (refetches to bring it back). */
  unarchiveTask: (taskId: number) => Promise<void>;
  addSubitem: (parentId: number, groupId: number, title: string) => Promise<void>;
  updateSubitem: (parentId: number, subId: number, patch: Record<string, unknown>) => Promise<void>;
  deleteSubitem: (parentId: number, subId: number) => Promise<void>;
  moveTaskLocal: (taskId: number, toGroupId: number, toIndex: number) => void;
  persistTaskOrder: (groupIds: number[], movedTaskId: number) => Promise<void>;

  openTask: (taskId: number) => Promise<void>;
  closeTask: () => void;

  addComment: (text: string, mentionIds?: number[]) => Promise<void>;
  deleteComment: (id: number) => Promise<void>;
  addChecklistItem: (text: string) => Promise<void>;
  toggleChecklistItem: (id: number, done: boolean) => Promise<void>;
  deleteChecklistItem: (id: number) => Promise<void>;
  uploadAttachment: (file: File) => Promise<void>;
  deleteAttachment: (id: number) => Promise<void>;
  addLink: (title: string, url: string) => Promise<void>;
  deleteLink: (id: number) => Promise<void>;
  addLabelToBoard: (name: string, color: string) => Promise<Label | null>;
  loadBoardActivity: () => Promise<void>;
}

function patchSubitems(
  board: BoardDetail,
  parentId: number,
  fn: (subs: Subitem[]) => Subitem[]
): BoardDetail {
  return {
    ...board,
    groups: board.groups.map((g) => ({
      ...g,
      tasks: g.tasks.map((t) => {
        if (t.id !== parentId) return t;
        const subitems = fn(t.subitems ?? []);
        return {
          ...t,
          subitems,
          subitem_count: subitems.length,
          subitem_done: subitems.filter((s) => s.status === "done").length,
        };
      }),
    })),
  };
}

function patchCard(board: BoardDetail, taskId: number, patch: Partial<TaskCard>): BoardDetail {
  return {
    ...board,
    groups: board.groups.map((g) => ({
      ...g,
      tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    })),
  };
}

function findCard(board: BoardDetail | null, taskId: number): TaskCard | undefined {
  if (!board) return undefined;
  for (const g of board.groups) {
    const t = g.tasks.find((x) => x.id === taskId);
    if (t) return t;
  }
  return undefined;
}

/** Members who may be assigned/mentioned on a board. Defaults to the loaded
 * board; pass a board id (e.g. a task's board) to resolve another one from the
 * sidebar list. Private boards narrow the list to creator + invited people. */
export function useBoardMembers(boardId?: number | null): Member[] {
  const board = useBoardStore((s) => s.board);
  const workspaces = useBoardStore((s) => s.workspaces);
  const members = useBoardStore((s) => s.members);
  return useMemo(() => {
    const target =
      boardId == null || board?.id === boardId
        ? board
        : workspaces.flatMap((w) => w.boards).find((b) => b.id === boardId) ?? null;
    return membersForBoard(target, members);
  }, [boardId, board, workspaces, members]);
}

export const useBoardStore = create<BoardState>((set, get) => ({
  view: "table",
  setView: (v) => {
    set({ view: v });
    try {
      localStorage.setItem("workboard_view", v);
    } catch {
      /* ignore */
    }
  },
  workspaces: [],
  members: [],
  currentMember: null,
  board: null,
  boardLoading: true,
  filters: { ...DEFAULT_FILTERS },
  activeTask: null,
  activeTaskLoading: false,
  boardActivity: [],

  setCurrentMember: (member) =>
    set((s) => ({
      currentMember: member,
      // Keep the member list in step so avatars update everywhere at once.
      members: s.members.map((m) => (m.id === member.id ? { ...m, ...member } : m)),
    })),

  init: async () => {
    try {
      const [workspaces, members, currentMember] = await Promise.all([
        api.get<Workspace[]>("/workspaces/"),
        api.get<Member[]>("/members/"),
        api.get<Member>("/auth/me/"),
      ]);
      set({ workspaces, members, currentMember });
      // The company's accent colour reaches every member, so paint it as soon
      // as we know which workspace they're in.
      applyThemeColor(workspaces[0]?.theme_color);
    } catch (err) {
      if (!(err instanceof Error && err.message === "Session expired")) {
        toast.error("Could not reach the server. Is the Django backend running?");
      }
    }
  },

  loadBoard: async (id) => {
    set({ boardLoading: true, filters: { ...DEFAULT_FILTERS }, activeTask: null });
    try {
      const board = await api.get<BoardDetail>(`/boards/${id}/`);
      set({ board, boardLoading: false });
    } catch {
      set({ boardLoading: false });
      toast.error("Failed to load board");
    }
  },

  refreshBoard: async () => {
    const board = get().board;
    if (!board) return;
    try {
      const fresh = await api.get<BoardDetail>(`/boards/${board.id}/`);
      set({ board: fresh });
    } catch {
      /* keep stale state */
    }
  },

  applyRemoteCard: (boardId, card) => {
    const board = get().board;
    if (!board || board.id !== boardId) return;

    const existingGroup = board.groups.find((g) => g.tasks.some((t) => t.id === card.id));

    if (existingGroup) {
      if (existingGroup.id === card.group) {
        // Same group — replace the card wholesale (counts come from the server).
        set({ board: patchCard(board, card.id, card) });
      } else {
        // Status automation moved it: pull it out of the old group, drop into the new.
        set({
          board: {
            ...board,
            groups: board.groups.map((g) => {
              if (g.id === existingGroup.id)
                return { ...g, tasks: g.tasks.filter((t) => t.id !== card.id) };
              if (g.id === card.group) return { ...g, tasks: [...g.tasks, card] };
              return g;
            }),
          },
        });
      }
    } else {
      // A top-level card we don't have yet — insert if its group is loaded.
      // (Structural changes also arrive via `board_changed`, which reconciles.)
      const target = board.groups.find((g) => g.id === card.group);
      if (target) {
        set({
          board: {
            ...board,
            groups: board.groups.map((g) =>
              g.id === card.group ? { ...g, tasks: [...g.tasks, card] } : g
            ),
          },
        });
      }
    }

    // Keep an open detail panel's card-level fields in sync without a refetch.
    const active = get().activeTask;
    if (active && active.id === card.id) {
      set({
        activeTask: {
          ...active,
          group: card.group,
          title: card.title,
          status: card.status,
          priority: card.priority,
          due_date: card.due_date,
          order: card.order,
          assignees: card.assignees,
          labels: card.labels,
          updated_at: card.updated_at,
        },
      });
    }
  },

  handleMembershipChange: async (workspace, removed) => {
    if (removed) {
      // Drop the workspace immediately; the socket already stopped delivering
      // its board updates. Close any board/task we were viewing from it.
      const board = get().board;
      set({
        workspaces: get().workspaces.filter((w) => w.id !== workspace),
        board: board?.workspace === workspace ? null : board,
        activeTask:
          board?.workspace === workspace ? null : get().activeTask,
      });
    }
    // Resync profile + role + remaining boards/members from the server.
    await get().init();
  },

  setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),
  clearFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  addBoard: async (name, visibility = "public", memberIds = [], folderId = null, isPersonal = false) => {
    const ws = get().workspaces[0];
    if (!ws) return null;
    try {
      const board = await api.post<BoardListItem>("/boards/", {
        workspace: ws.id,
        name,
        order: ws.boards.length,
        visibility: isPersonal ? "private" : visibility,
        ...(isPersonal ? { is_personal: true } : {}),
        ...(folderId ? { folder: folderId } : {}),
        ...(visibility === "private" || isPersonal ? { member_ids: memberIds } : {}),
      });
      set({
        workspaces: get().workspaces.map((w) =>
          w.id === ws.id ? { ...w, boards: [...w.boards, board] } : w
        ),
      });
      toast.success(`Board "${name}" created`);
      return board;
    } catch {
      toast.error("Failed to create board");
      return null;
    }
  },

  addFolder: async (name, personal = false) => {
    const ws = get().workspaces[0];
    if (!ws) return;
    try {
      const folder = await api.post<Folder>("/folders/", {
        workspace: ws.id,
        name,
        order: ws.folders.length,
        ...(personal ? { personal: true } : {}),
      });
      set({
        workspaces: get().workspaces.map((w) =>
          w.id === ws.id ? { ...w, folders: [...w.folders, folder] } : w
        ),
      });
      toast.success(`Folder "${name}" created`);
    } catch {
      toast.error("Failed to create folder");
    }
  },

  reorderSidebar: async (items) => {
    const ws = get().workspaces[0];
    if (!ws) return;
    const prev = get().workspaces;
    const folderOrder = new Map<number, number>();
    const boardOrder = new Map<number, number>();
    items.forEach((it, index) =>
      (it.type === "folder" ? folderOrder : boardOrder).set(it.id, index)
    );
    set({
      workspaces: prev.map((w) =>
        w.id !== ws.id
          ? w
          : {
              ...w,
              folders: w.folders.map((f) =>
                folderOrder.has(f.id) ? { ...f, order: folderOrder.get(f.id)! } : f
              ),
              boards: w.boards.map((b) =>
                boardOrder.has(b.id) ? { ...b, order: boardOrder.get(b.id)! } : b
              ),
            }
      ),
    });
    try {
      await api.post(`/workspaces/${ws.id}/reorder_sidebar/`, { items });
    } catch {
      set({ workspaces: prev });
      toast.error("Failed to save sidebar order");
    }
  },

  setFolderBoardOrder: async (folderId, boardIds) => {
    const me = get().currentMember;
    if (!me) return;
    const prev = me.board_order ?? {};
    const next = { ...prev, [String(folderId)]: boardIds };
    set({ currentMember: { ...me, board_order: next } });
    try {
      await api.patch("/auth/me/", { board_order: next });
    } catch {
      const current = get().currentMember;
      if (current) set({ currentMember: { ...current, board_order: prev } });
      toast.error("Failed to save board order");
    }
  },

  renameFolder: async (id, name) => {
    const prev = get().workspaces;
    set({
      workspaces: prev.map((w) => ({
        ...w,
        folders: w.folders.map((f) => (f.id === id ? { ...f, name } : f)),
      })),
    });
    try {
      await api.patch(`/folders/${id}/`, { name });
    } catch {
      set({ workspaces: prev });
      toast.error("Failed to rename folder");
    }
  },

  deleteFolder: async (id) => {
    try {
      await api.delete(`/folders/${id}/`);
      // Boards inside the folder are kept server-side — mirror that locally.
      set({
        workspaces: get().workspaces.map((w) => ({
          ...w,
          folders: w.folders.filter((f) => f.id !== id),
          boards: w.boards.map((b) => (b.folder === id ? { ...b, folder: null } : b)),
        })),
      });
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  },

  renameBoard: async (id, name) => {
    const prev = get().workspaces;
    set({
      workspaces: prev.map((w) => ({
        ...w,
        boards: w.boards.map((b) => (b.id === id ? { ...b, name } : b)),
      })),
      board: get().board?.id === id ? { ...get().board!, name } : get().board,
    });
    try {
      await api.patch(`/boards/${id}/`, { name });
    } catch {
      set({ workspaces: prev });
      toast.error("Failed to rename board");
    }
  },

  updateBoard: async (id, patch) => {
    try {
      const updated = await api.patch<BoardListItem>(`/boards/${id}/`, patch);
      const board = get().board;
      set({
        workspaces: get().workspaces.map((w) => ({
          ...w,
          boards: w.boards.map((b) => (b.id === id ? { ...b, ...updated } : b)),
        })),
        board:
          board?.id === id
            ? {
                ...board,
                name: updated.name,
                visibility: updated.visibility,
                member_ids: updated.member_ids,
              }
            : board,
      });
      toast.success("Board updated");
      return updated;
    } catch (err) {
      // Sharing changes are restricted server-side to the creator / an admin —
      // surface that message instead of a generic failure.
      const denied = err instanceof Error && err.message.includes("403");
      toast.error(
        denied
          ? "Only the board's creator or a workspace admin can change sharing settings"
          : "Failed to update board"
      );
      return null;
    }
  },

  setBoardLogo: async (id, file) => {
    try {
      const updated = file
        ? await (() => {
            const form = new FormData();
            form.append("logo", file);
            return api.postForm<BoardListItem>(`/boards/${id}/logo/`, form);
          })()
        : await api.delete(`/boards/${id}/logo/`).then(() => null);
      set({
        workspaces: get().workspaces.map((w) => ({
          ...w,
          boards: w.boards.map((b) =>
            b.id === id ? { ...b, logo: updated ? updated.logo : null } : b
          ),
        })),
      });
      return true;
    } catch (err) {
      const denied = err instanceof Error && err.message.includes("403");
      toast.error(
        denied
          ? "Only the board's creator or a workspace admin can change its logo"
          : "Failed to save the board logo"
      );
      return false;
    }
  },

  transferBoardOwnership: async (id, memberId) => {
    try {
      const updated = await api.post<BoardListItem>(`/boards/${id}/transfer-ownership/`, {
        member: memberId,
      });
      const board = get().board;
      set({
        workspaces: get().workspaces.map((w) => ({
          ...w,
          boards: w.boards.map((b) => (b.id === id ? { ...b, ...updated } : b)),
        })),
        board:
          board?.id === id
            ? { ...board, created_by: updated.created_by, member_ids: updated.member_ids }
            : board,
      });
      toast.success("Ownership transferred");
      return updated;
    } catch (err) {
      const denied = err instanceof Error && err.message.includes("403");
      toast.error(denied ? "Only the board's owner can transfer ownership" : "Failed to transfer ownership");
      return null;
    }
  },

  leaveBoard: async (id) => {
    try {
      await api.post(`/boards/${id}/leave/`, {});
      // We can no longer see the board — drop it from local state.
      set({
        workspaces: get().workspaces.map((w) => ({
          ...w,
          boards: w.boards.filter((b) => b.id !== id),
        })),
        board: get().board?.id === id ? null : get().board,
      });
      toast.success("You left the board");
      return true;
    } catch (err) {
      // The owner must transfer/delete first — surface the server's reason.
      const msg = err instanceof Error && err.message.includes("400")
        ? "Transfer ownership before leaving the board"
        : "Failed to leave the board";
      toast.error(msg);
      return false;
    }
  },

  cloneBoard: async (id, { name, memberIds }) => {
    try {
      const board = await api.post<BoardListItem>(`/boards/${id}/clone/`, {
        ...(name ? { name } : {}),
        ...(memberIds ? { member_ids: memberIds } : {}),
      });
      set({
        workspaces: get().workspaces.map((w) =>
          w.id === board.workspace ? { ...w, boards: [...w.boards, board] } : w
        ),
      });
      toast.success(`Board "${board.name}" created`);
      return board;
    } catch {
      toast.error("Failed to clone board");
      return null;
    }
  },

  saveBranding: async ({ logo, themeColor, brandName }) => {
    const ws = get().workspaces[0];
    if (!ws) return false;
    try {
      const form = new FormData();
      if (logo instanceof File) form.append("logo", logo);
      else if (logo === null) form.append("remove_logo", "true");
      if (themeColor !== undefined) form.append("theme_color", themeColor);
      if (brandName !== undefined) form.append("brand_name", brandName);
      const updated = await api.postForm<Workspace>(`/workspaces/${ws.id}/branding/`, form);
      set({
        workspaces: get().workspaces.map((w) =>
          w.id === ws.id
            ? {
                ...w,
                logo: updated.logo,
                theme_color: updated.theme_color,
                brand_name: updated.brand_name,
              }
            : w
        ),
      });
      applyThemeColor(updated.theme_color);
      toast.success("Branding updated");
      return true;
    } catch (err) {
      const denied = err instanceof Error && err.message.includes("403");
      toast.error(
        denied ? "Only a workspace admin can change the branding" : "Failed to save the branding"
      );
      return false;
    }
  },

  deleteBoard: async (id) => {
    try {
      await api.delete(`/boards/${id}/`);
      set({
        workspaces: get().workspaces.map((w) => ({
          ...w,
          boards: w.boards.filter((b) => b.id !== id),
        })),
      });
      toast.success("Board deleted");
    } catch {
      toast.error("Failed to delete board");
    }
  },

  addGroup: async (title) => {
    const board = get().board;
    if (!board) return;
    try {
      const group = await api.post<Group>("/groups/", {
        board: board.id,
        title,
        color: ["#4B91F7", "#10B981", "#F59E0B", "#9D99FF", "#E2445C"][board.groups.length % 5],
        order: board.groups.length,
      });
      set({ board: { ...board, groups: [...board.groups, { ...group, tasks: [] }] } });
      toast.success(`Group "${title}" added`);
    } catch {
      toast.error("Failed to add group");
    }
  },

  updateGroup: async (id, patch) => {
    const board = get().board;
    if (!board) return;
    const prev = board;
    set({
      board: {
        ...board,
        groups: board.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      },
    });
    try {
      await api.patch(`/groups/${id}/`, patch);
    } catch {
      set({ board: prev });
      toast.error("Failed to update group");
    }
  },

  deleteGroup: async (id) => {
    const board = get().board;
    if (!board) return;
    const prev = board;
    set({ board: { ...board, groups: board.groups.filter((g) => g.id !== id) } });
    try {
      await api.delete(`/groups/${id}/`);
      toast.success("Group deleted");
    } catch {
      set({ board: prev });
      toast.error("Failed to delete group");
    }
  },

  moveGroupLocal: (activeId, overId) => {
    const board = get().board;
    if (!board) return;
    const groups = [...board.groups];
    const from = groups.findIndex((g) => g.id === activeId);
    const to = groups.findIndex((g) => g.id === overId);
    if (from === -1 || to === -1 || from === to) return;
    const [moved] = groups.splice(from, 1);
    groups.splice(to, 0, moved);
    set({ board: { ...board, groups } });
  },

  persistGroupOrder: async () => {
    const board = get().board;
    if (!board) return;
    try {
      await api.post(`/boards/${board.id}/reorder_groups/`, {
        group_ids: board.groups.map((g) => g.id),
      });
    } catch {
      toast.error("Failed to save group order");
      get().refreshBoard();
    }
  },

  addTask: async (groupId, title) => {
    const board = get().board;
    if (!board) return;
    const group = board.groups.find((g) => g.id === groupId);
    if (!group) return;
    try {
      const task = await api.post<TaskDetail>("/tasks/", {
        group: groupId,
        title,
        order: group.tasks.length,
      });
      const card: TaskCard = {
        id: task.id,
        group: groupId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        order: task.order,
        assignees: [],
        labels: [],
        has_description: false,
        comment_count: 0,
        attachment_count: 0,
        checklist_total: 0,
        checklist_done: 0,
        subitem_count: 0,
        subitem_done: 0,
        subitems: [],
        created_at: task.created_at,
        updated_at: task.updated_at,
      };
      set({
        board: {
          ...get().board!,
          groups: get().board!.groups.map((g) =>
            g.id === groupId ? { ...g, tasks: [...g.tasks, card] } : g
          ),
        },
      });
    } catch {
      toast.error("Failed to add task");
    }
  },

  updateTask: async (taskId, patch) => {
    const board = get().board;
    if (!board) return;
    const prevBoard = board;
    const prevActive = get().activeTask;

    // Optimistic card patch (only fields the card knows about)
    const cardPatch: Partial<TaskCard> = {};
    const members = get().members;
    const labels = board.labels;
    if ("title" in patch) cardPatch.title = patch.title as string;
    if ("description" in patch) cardPatch.has_description = !!(patch.description as string)?.trim();
    if ("status" in patch) cardPatch.status = patch.status as TaskCard["status"];
    if ("priority" in patch) cardPatch.priority = patch.priority as TaskCard["priority"];
    if ("due_date" in patch) cardPatch.due_date = patch.due_date as string | null;
    if ("assignee_ids" in patch)
      cardPatch.assignees = members.filter((m) => (patch.assignee_ids as number[]).includes(m.id));
    if ("label_ids" in patch)
      cardPatch.labels = labels.filter((l) => (patch.label_ids as number[]).includes(l.id));

    set({
      board: patchCard(board, taskId, cardPatch),
      activeTask:
        prevActive?.id === taskId
          ? {
              ...prevActive,
              ...("title" in patch ? { title: patch.title as string } : {}),
              ...("description" in patch ? { description: patch.description as string } : {}),
              ...("status" in patch ? { status: patch.status as TaskDetail["status"] } : {}),
              ...("priority" in patch ? { priority: patch.priority as TaskDetail["priority"] } : {}),
              ...("due_date" in patch ? { due_date: patch.due_date as string | null } : {}),
              ...(cardPatch.assignees ? { assignees: cardPatch.assignees } : {}),
              ...(cardPatch.labels ? { labels: cardPatch.labels } : {}),
            }
          : prevActive,
    });

    try {
      const fresh = await api.patch<TaskDetail>(`/tasks/${taskId}/`, patch);
      // Status automation may have moved the task to another group — reflect it.
      const current = get().board;
      if (current) {
        const containing = current.groups.find((g) => g.tasks.some((t) => t.id === taskId));
        if (containing && containing.id !== fresh.group) {
          const card = containing.tasks.find((t) => t.id === taskId)!;
          const movedCard: TaskCard = {
            ...card,
            group: fresh.group,
            title: fresh.title,
            status: fresh.status,
            priority: fresh.priority,
            due_date: fresh.due_date,
            order: fresh.order,
            assignees: fresh.assignees,
            labels: fresh.labels,
            updated_at: fresh.updated_at,
          };
          set({
            board: {
              ...current,
              groups: current.groups.map((g) => {
                if (g.id === containing.id)
                  return { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) };
                if (g.id === fresh.group) return { ...g, tasks: [...g.tasks, movedCard] };
                return g;
              }),
            },
          });
        }
      }
      if (get().activeTask?.id === taskId) {
        set({ activeTask: { ...fresh } });
      }
    } catch {
      set({ board: prevBoard, activeTask: prevActive });
      toast.error("Failed to save changes");
    }
  },

  deleteTask: async (taskId) => {
    const board = get().board;
    if (!board) return;
    const prev = board;
    set({
      board: {
        ...board,
        groups: board.groups.map((g) => ({
          ...g,
          tasks: g.tasks.filter((t) => t.id !== taskId),
        })),
      },
      activeTask: get().activeTask?.id === taskId ? null : get().activeTask,
    });
    try {
      await api.delete(`/tasks/${taskId}/`);
      toast.success("Task deleted");
    } catch {
      set({ board: prev });
      toast.error("Failed to delete task");
    }
  },

  archiveTask: async (taskId) => {
    const board = get().board;
    if (!board) return;
    const prev = board;
    // Optimistically pull the card off the board and close the panel if open.
    set({
      board: {
        ...board,
        groups: board.groups.map((g) => ({
          ...g,
          tasks: g.tasks.filter((t) => t.id !== taskId),
        })),
      },
      activeTask: get().activeTask?.id === taskId ? null : get().activeTask,
    });
    try {
      await api.post(`/tasks/${taskId}/archive/`, {});
      toast.success("Ticket archived");
    } catch {
      set({ board: prev });
      toast.error("Failed to archive ticket");
    }
  },

  unarchiveTask: async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/unarchive/`, {});
      // The card rejoins the board — refetch so it reappears in its group.
      await get().refreshBoard();
      toast.success("Ticket restored");
    } catch {
      toast.error("Failed to restore ticket");
    }
  },

  addSubitem: async (parentId, groupId, title) => {
    try {
      const task = await api.post<TaskDetail>("/tasks/", {
        group: groupId,
        parent: parentId,
        title,
        order: 0,
      });
      const sub: Subitem = {
        id: task.id,
        group: groupId,
        parent: parentId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        order: task.order,
        assignees: [],
      };
      const board = get().board;
      if (board) set({ board: patchSubitems(board, parentId, (subs) => [...subs, sub]) });
      const active = get().activeTask;
      if (active?.id === parentId)
        set({ activeTask: { ...active, subitems: [...active.subitems, sub] } });
    } catch {
      toast.error("Failed to add subitem");
    }
  },

  updateSubitem: async (parentId, subId, patch) => {
    const prevBoard = get().board;
    const prevActive = get().activeTask;
    const members = get().members;

    const apply = (s: Subitem): Subitem => ({
      ...s,
      ...("title" in patch ? { title: patch.title as string } : {}),
      ...("status" in patch ? { status: patch.status as Subitem["status"] } : {}),
      ...("priority" in patch ? { priority: patch.priority as Subitem["priority"] } : {}),
      ...("due_date" in patch ? { due_date: patch.due_date as string | null } : {}),
      ...("assignee_ids" in patch
        ? { assignees: members.filter((m) => (patch.assignee_ids as number[]).includes(m.id)) }
        : {}),
    });

    if (prevBoard)
      set({
        board: patchSubitems(prevBoard, parentId, (subs) =>
          subs.map((s) => (s.id === subId ? apply(s) : s))
        ),
      });
    if (prevActive?.id === parentId)
      set({
        activeTask: {
          ...prevActive,
          subitems: prevActive.subitems.map((s) => (s.id === subId ? apply(s) : s)),
        },
      });
    try {
      await api.patch(`/tasks/${subId}/`, patch);
    } catch {
      set({ board: prevBoard, activeTask: prevActive });
      toast.error("Failed to save changes");
    }
  },

  deleteSubitem: async (parentId, subId) => {
    const prevBoard = get().board;
    const prevActive = get().activeTask;
    if (prevBoard)
      set({
        board: patchSubitems(prevBoard, parentId, (subs) => subs.filter((s) => s.id !== subId)),
      });
    if (prevActive?.id === parentId)
      set({
        activeTask: { ...prevActive, subitems: prevActive.subitems.filter((s) => s.id !== subId) },
      });
    try {
      await api.delete(`/tasks/${subId}/`);
    } catch {
      set({ board: prevBoard, activeTask: prevActive });
      toast.error("Failed to delete subitem");
    }
  },

  moveTaskLocal: (taskId, toGroupId, toIndex) => {
    const board = get().board;
    if (!board) return;
    let moved: TaskCard | undefined;
    const groups = board.groups.map((g) => {
      const idx = g.tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        moved = g.tasks[idx];
        return { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) };
      }
      return g;
    });
    if (!moved) return;
    const updated = groups.map((g) => {
      if (g.id !== toGroupId) return g;
      const tasks = [...g.tasks];
      const clamped = Math.max(0, Math.min(toIndex, tasks.length));
      tasks.splice(clamped, 0, { ...moved!, group: toGroupId });
      return { ...g, tasks };
    });
    set({ board: { ...board, groups: updated } });
  },

  persistTaskOrder: async (groupIds, movedTaskId) => {
    const board = get().board;
    if (!board) return;
    try {
      await Promise.all(
        groupIds.map((gid) => {
          const group = board.groups.find((g) => g.id === gid);
          if (!group) return Promise.resolve();
          return api.post(`/groups/${gid}/reorder_tasks/`, {
            task_ids: group.tasks.map((t) => t.id),
            moved_task_id: movedTaskId,
          });
        })
      );
    } catch {
      toast.error("Failed to save new order");
      get().refreshBoard();
    }
  },

  openTask: async (taskId) => {
    set({ activeTaskLoading: true, activeTask: null });
    try {
      const task = await api.get<TaskDetail>(`/tasks/${taskId}/`);
      set({ activeTask: task, activeTaskLoading: false });
    } catch {
      set({ activeTaskLoading: false });
      toast.error("Failed to load task");
    }
  },

  closeTask: () => set({ activeTask: null, activeTaskLoading: false }),

  addComment: async (text, mentionIds) => {
    const task = get().activeTask;
    if (!task) return;
    try {
      const comment = await api.post<Comment>("/comments/", {
        task: task.id,
        text,
        // Send the explicit ids the user picked from the @-menu; the server only
        // falls back to ambiguous fuzzy @name matching when this is absent.
        ...(mentionIds && mentionIds.length ? { mention_ids: mentionIds } : {}),
      });
      set({ activeTask: { ...task, comments: [comment, ...task.comments] } });
      const card = findCard(get().board, task.id);
      if (card && get().board)
        set({ board: patchCard(get().board!, task.id, { comment_count: card.comment_count + 1 }) });
    } catch {
      toast.error("Failed to post update");
    }
  },

  deleteComment: async (id) => {
    const task = get().activeTask;
    if (!task) return;
    const prev = task;
    set({ activeTask: { ...task, comments: task.comments.filter((c) => c.id !== id) } });
    try {
      await api.delete(`/comments/${id}/`);
      const card = findCard(get().board, task.id);
      if (card && get().board)
        set({ board: patchCard(get().board!, task.id, { comment_count: Math.max(0, card.comment_count - 1) }) });
    } catch {
      set({ activeTask: prev });
      toast.error("Failed to delete update");
    }
  },

  addChecklistItem: async (text) => {
    const task = get().activeTask;
    if (!task) return;
    try {
      const item = await api.post<ChecklistItem>("/checklist/", {
        task: task.id,
        text,
        order: task.checklist.length,
      });
      set({ activeTask: { ...task, checklist: [...task.checklist, item] } });
      const card = findCard(get().board, task.id);
      if (card && get().board)
        set({ board: patchCard(get().board!, task.id, { checklist_total: card.checklist_total + 1 }) });
    } catch {
      toast.error("Failed to add item");
    }
  },

  toggleChecklistItem: async (id, done) => {
    const task = get().activeTask;
    if (!task) return;
    const prev = task;
    set({
      activeTask: {
        ...task,
        checklist: task.checklist.map((c) => (c.id === id ? { ...c, done } : c)),
      },
    });
    const card = findCard(get().board, task.id);
    if (card && get().board)
      set({
        board: patchCard(get().board!, task.id, {
          checklist_done: card.checklist_done + (done ? 1 : -1),
        }),
      });
    try {
      await api.patch(`/checklist/${id}/`, { done });
    } catch {
      set({ activeTask: prev });
      toast.error("Failed to update item");
    }
  },

  deleteChecklistItem: async (id) => {
    const task = get().activeTask;
    if (!task) return;
    const item = task.checklist.find((c) => c.id === id);
    const prev = task;
    set({ activeTask: { ...task, checklist: task.checklist.filter((c) => c.id !== id) } });
    try {
      await api.delete(`/checklist/${id}/`);
      const card = findCard(get().board, task.id);
      if (card && get().board && item)
        set({
          board: patchCard(get().board!, task.id, {
            checklist_total: Math.max(0, card.checklist_total - 1),
            checklist_done: Math.max(0, card.checklist_done - (item.done ? 1 : 0)),
          }),
        });
    } catch {
      set({ activeTask: prev });
      toast.error("Failed to delete item");
    }
  },

  uploadAttachment: async (file) => {
    const task = get().activeTask;
    if (!task) return;
    const form = new FormData();
    form.append("task", String(task.id));
    form.append("file", file);
    form.append("name", file.name);
    try {
      const attachment = await api.postForm<Attachment>("/attachments/", form);
      set({ activeTask: { ...get().activeTask!, attachments: [attachment, ...get().activeTask!.attachments] } });
      const card = findCard(get().board, task.id);
      if (card && get().board)
        set({ board: patchCard(get().board!, task.id, { attachment_count: card.attachment_count + 1 }) });
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    }
  },

  deleteAttachment: async (id) => {
    const task = get().activeTask;
    if (!task) return;
    const prev = task;
    set({ activeTask: { ...task, attachments: task.attachments.filter((a) => a.id !== id) } });
    try {
      await api.delete(`/attachments/${id}/`);
      const card = findCard(get().board, task.id);
      if (card && get().board)
        set({ board: patchCard(get().board!, task.id, { attachment_count: Math.max(0, card.attachment_count - 1) }) });
    } catch {
      set({ activeTask: prev });
      toast.error("Failed to delete file");
    }
  },

  addLink: async (title, url) => {
    const task = get().activeTask;
    if (!task) return;
    try {
      const link = await api.post<LinkItem>("/links/", { task: task.id, title, url });
      set({ activeTask: { ...task, links: [link, ...task.links] } });
    } catch {
      toast.error("Failed to add link");
    }
  },

  deleteLink: async (id) => {
    const task = get().activeTask;
    if (!task) return;
    const prev = task;
    set({ activeTask: { ...task, links: task.links.filter((l) => l.id !== id) } });
    try {
      await api.delete(`/links/${id}/`);
    } catch {
      set({ activeTask: prev });
      toast.error("Failed to delete link");
    }
  },

  addLabelToBoard: async (name, color) => {
    const board = get().board;
    if (!board) return null;
    try {
      const label = await api.post<Label>("/labels/", { board: board.id, name, color });
      set({ board: { ...board, labels: [...board.labels, label] } });
      return label;
    } catch {
      toast.error("Failed to create label");
      return null;
    }
  },

  addColumn: async (name, kind) => {
    const board = get().board;
    if (!board) return;
    try {
      const column = await api.post<BoardColumn>("/columns/", {
        board: board.id,
        name,
        kind,
        order: board.columns?.length ?? 0,
        ...(kind === "status" ? { options: DEFAULT_STATUS_OPTIONS } : {}),
      });
      set({ board: { ...board, columns: [...(board.columns ?? []), column] } });
      toast.success(`Column "${name}" added`);
    } catch {
      toast.error("Failed to add column");
    }
  },

  renameColumn: async (id, name) => {
    const board = get().board;
    if (!board) return;
    const prev = board;
    set({
      board: {
        ...board,
        columns: (board.columns ?? []).map((c) => (c.id === id ? { ...c, name } : c)),
      },
    });
    try {
      await api.patch(`/columns/${id}/`, { name });
    } catch {
      set({ board: prev });
      toast.error("Failed to rename column");
    }
  },

  setColumnOptions: async (id, options) => {
    const board = get().board;
    if (!board) return;
    const prev = board;
    set({
      board: {
        ...board,
        columns: (board.columns ?? []).map((c) => (c.id === id ? { ...c, options } : c)),
      },
    });
    try {
      // The server sanitizes (trims, dedupes) — keep its version.
      const saved = await api.patch<BoardColumn>(`/columns/${id}/`, { options });
      const current = get().board;
      if (current)
        set({
          board: {
            ...current,
            columns: (current.columns ?? []).map((c) => (c.id === id ? saved : c)),
          },
        });
    } catch {
      set({ board: prev });
      toast.error("Failed to save labels");
    }
  },

  deleteColumn: async (id) => {
    const board = get().board;
    if (!board) return;
    const prev = board;
    // Drop the column and every task's value in it in one pass.
    set({
      board: {
        ...board,
        columns: (board.columns ?? []).filter((c) => c.id !== id),
        groups: board.groups.map((g) => ({
          ...g,
          tasks: g.tasks.map((t) => {
            if (!t.cells?.[id]) return t;
            const cells = { ...t.cells };
            delete cells[id];
            return { ...t, cells };
          }),
        })),
      },
    });
    try {
      await api.delete(`/columns/${id}/`);
      toast.success("Column deleted");
    } catch {
      set({ board: prev });
      toast.error("Failed to delete column");
    }
  },

  setCell: async (taskId, columnId, value) => {
    const board = get().board;
    if (!board) return;
    const prev = board;
    const card = findCard(board, taskId);
    const cells: Record<number, CellValue> = { ...(card?.cells ?? {}) };
    if (value) cells[columnId] = { column: columnId, value, file_url: null, file_name: "" };
    else delete cells[columnId];
    set({ board: patchCard(board, taskId, { cells }) });
    try {
      await api.post<{ cells: Record<number, CellValue> }>(`/tasks/${taskId}/cell/`, {
        column: columnId,
        value,
      });
    } catch {
      set({ board: prev });
      toast.error("Failed to save the value");
    }
  },

  setCellFile: async (taskId, columnId, file) => {
    const board = get().board;
    if (!board) return;
    try {
      const form = new FormData();
      form.append("column", String(columnId));
      if (file) form.append("file", file);
      else form.append("clear", "true");
      const { cells } = await api.postForm<{ cells: Record<number, CellValue> }>(
        `/tasks/${taskId}/cell/`,
        form
      );
      const current = get().board;
      if (current) set({ board: patchCard(current, taskId, { cells }) });
      if (file) toast.success("File uploaded");
    } catch {
      toast.error(file ? "Upload failed" : "Failed to remove the file");
    }
  },

  loadBoardActivity: async () => {
    const board = get().board;
    if (!board) return;
    try {
      const activity = await api.get<Activity[]>(`/boards/${board.id}/activity/`);
      set({ boardActivity: activity });
    } catch {
      /* non-critical */
    }
  },
}));
