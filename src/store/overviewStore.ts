import { create } from "zustand";
import { toast } from "sonner";
import { addWeeks, endOfISOWeek, getISOWeek, parseISO, startOfISOWeek } from "date-fns";
import { api } from "@/lib/api";
import { sidebarBoardOrder } from "@/lib/utils";
import { useBoardStore } from "./boardStore";
import type {
  BoardDetail,
  BoardListItem,
  Group,
  Subitem,
  TaskCard,
  TaskDetail,
} from "@/lib/types";

export const SPRINT_TITLE = "Sprint of this week";
const WEEK_GROUP_COLOR = "#E2445C";

export interface OverviewProject {
  board: BoardListItem;
  groupCount: number;
  weekGroup: Group | null;
  /** The real task backing the "Project | Sprint of this week" row. */
  sprint: TaskCard | null;
  /** The board's real work for the selected week: tasks in the "Week N"
   * group (minus the sprint parent), plus tasks from every other group that
   * are due inside that week, plus — current week only — open tasks with no
   * due date (the live backlog). */
  tasks: TaskCard[];
}

export function weekTitle(anchorIso: string): string {
  return `Week ${getISOWeek(parseISO(anchorIso))}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function cardFromDetail(task: TaskDetail, groupId: number): TaskCard {
  return {
    id: task.id,
    group: groupId,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    order: task.order,
    assignees: task.assignees ?? [],
    labels: task.labels ?? [],
    has_description: !!task.description?.trim(),
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
}

interface OverviewState {
  anchor: string; // ISO date inside the selected week
  loading: boolean;
  projects: OverviewProject[];
  load: (silent?: boolean) => Promise<void>;
  shiftWeek: (delta: number) => void;
  goToday: () => void;
  addTask: (boardId: number, title: string) => Promise<void>;
  updateTask: (taskId: number, patch: Record<string, unknown>) => Promise<void>;
}

export const useOverviewStore = create<OverviewState>((set, get) => ({
  anchor: today(),
  loading: true,
  projects: [],

  load: async (silent = false) => {
    if (!silent) set({ loading: true });
    try {
      const boards = await api.get<BoardListItem[]>("/boards/");
      // The overview is a shared, workspace-wide view — private boards stay out.
      const publicBoards = boards.filter((b) => b.visibility === "public");
      // Match the sidebar's top-to-bottom order so the two views stay in sync.
      // The board store (folders + this member's board_order) drives that order;
      // it loads in parallel with us, so make sure it's populated before ranking.
      if (useBoardStore.getState().workspaces.length === 0) {
        await useBoardStore.getState().init();
      }
      const bs = useBoardStore.getState();
      const rank = new Map(
        sidebarBoardOrder(boards, bs.workspaces[0]?.folders ?? [], bs.currentMember).map(
          (id, i) => [id, i]
        )
      );
      const ordered = [...publicBoards].sort(
        (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity)
      );
      const details = await Promise.all(
        ordered.map((b) => api.get<BoardDetail>(`/boards/${b.id}/`))
      );
      const title = weekTitle(get().anchor).toLowerCase();
      const anchorDate = parseISO(get().anchor);
      const weekStart = startOfISOWeek(anchorDate);
      const weekEnd = endOfISOWeek(anchorDate);
      const viewingCurrentWeek = weekStart.getTime() === startOfISOWeek(new Date()).getTime();
      const projects: OverviewProject[] = details.map((d) => {
        const weekGroup = d.groups.find((g) => g.title.trim().toLowerCase() === title) ?? null;
        const groupTasks = weekGroup?.tasks ?? [];
        const sprint =
          groupTasks.find((t) => t.title.trim().toLowerCase() === SPRINT_TITLE.toLowerCase()) ??
          null;
        // Real work for the week: the week group's tasks, plus tasks from the
        // board's other groups that are due in this week. On the current week
        // undated open tasks count too — they're the live backlog, and boards
        // that don't use "Week N" groups still get honest numbers.
        const tasks: TaskCard[] = groupTasks.filter((t) => t.id !== sprint?.id);
        for (const g of d.groups) {
          if (weekGroup && g.id === weekGroup.id) continue;
          for (const t of g.tasks) {
            if (t.due_date) {
              const due = parseISO(t.due_date);
              if (due >= weekStart && due <= weekEnd) tasks.push(t);
            } else if (t.status === "done") {
              // No due date to pin it to a week — use the last update as the
              // completion date (marking a task done refreshes updated_at).
              const doneAt = parseISO(t.updated_at);
              if (doneAt >= weekStart && doneAt <= weekEnd) tasks.push(t);
            } else if (viewingCurrentWeek) {
              tasks.push(t);
            }
          }
        }
        return {
          board: {
            id: d.id,
            workspace: d.workspace,
            folder: d.folder,
            name: d.name,
            description: d.description,
            logo: d.logo ?? null,
            order: d.order,
            visibility: d.visibility,
            created_by: d.created_by,
            member_ids: d.member_ids,
            created_at: d.created_at,
          },
          groupCount: d.groups.length,
          weekGroup,
          sprint,
          tasks,
        };
      });
      set({ projects, loading: false });
    } catch {
      set({ loading: false });
      if (!silent) toast.error("Failed to load overview");
    }
  },

  shiftWeek: (delta) => {
    const next = addWeeks(parseISO(get().anchor), delta);
    set({ anchor: next.toISOString().slice(0, 10) });
    get().load();
  },

  goToday: () => {
    set({ anchor: today() });
    get().load();
  },

  addTask: async (boardId, title) => {
    const project = get().projects.find((p) => p.board.id === boardId);
    if (!project) return;
    try {
      // Ensure the week group and the sprint parent row exist
      let group = project.weekGroup;
      if (!group) {
        group = await api.post<Group>("/groups/", {
          board: boardId,
          title: weekTitle(get().anchor),
          color: WEEK_GROUP_COLOR,
          order: project.groupCount,
        });
        group = { ...group, tasks: [] };
      }
      let sprint = project.sprint;
      if (!sprint) {
        const createdSprint = await api.post<TaskDetail>("/tasks/", {
          group: group.id,
          title: SPRINT_TITLE,
          order: 0,
        });
        sprint = cardFromDetail(createdSprint, group.id);
      }
      const created = await api.post<TaskDetail>("/tasks/", {
        group: group.id,
        title,
        order: project.tasks.length + 1,
      });
      const card = cardFromDetail(created, group.id);
      set({
        projects: get().projects.map((p) =>
          p.board.id === boardId
            ? {
                ...p,
                weekGroup: group,
                groupCount: p.weekGroup ? p.groupCount : p.groupCount + 1,
                sprint,
                tasks: [...p.tasks, card],
              }
            : p
        ),
      });
    } catch {
      toast.error("Failed to add task");
    }
  },

  updateTask: async (taskId, patch) => {
    const prev = get().projects;
    const members = useBoardStore.getState().members;

    const applyCard = (t: TaskCard): TaskCard => ({
      ...t,
      ...("title" in patch ? { title: patch.title as string } : {}),
      ...("status" in patch ? { status: patch.status as TaskCard["status"] } : {}),
      ...("priority" in patch ? { priority: patch.priority as TaskCard["priority"] } : {}),
      ...("due_date" in patch ? { due_date: patch.due_date as string | null } : {}),
      ...("assignee_ids" in patch
        ? { assignees: members.filter((m) => (patch.assignee_ids as number[]).includes(m.id)) }
        : {}),
    });
    const applySub = (s: Subitem): Subitem => ({
      ...s,
      ...("title" in patch ? { title: patch.title as string } : {}),
      ...("status" in patch ? { status: patch.status as Subitem["status"] } : {}),
      ...("priority" in patch ? { priority: patch.priority as Subitem["priority"] } : {}),
      ...("due_date" in patch ? { due_date: patch.due_date as string | null } : {}),
      ...("assignee_ids" in patch
        ? { assignees: members.filter((m) => (patch.assignee_ids as number[]).includes(m.id)) }
        : {}),
    });

    set({
      projects: prev.map((p) => {
        let sprint = p.sprint;
        if (sprint) {
          if (sprint.id === taskId) {
            sprint = applyCard(sprint);
          } else if (sprint.subitems.some((s) => s.id === taskId)) {
            const subitems = sprint.subitems.map((s) => (s.id === taskId ? applySub(s) : s));
            sprint = {
              ...sprint,
              subitems,
              subitem_done: subitems.filter((s) => s.status === "done").length,
            };
          }
        }
        return {
          ...p,
          sprint,
          tasks: p.tasks.map((t) => (t.id === taskId ? applyCard(t) : t)),
        };
      }),
    });
    try {
      await api.patch(`/tasks/${taskId}/`, patch);
    } catch {
      set({ projects: prev });
      toast.error("Failed to save changes");
    }
  },
}));
