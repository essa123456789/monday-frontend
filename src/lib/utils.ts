import { clsx, type ClassValue } from "clsx";
import { differenceInCalendarDays, format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import type { BoardListItem, Folder, Member, TaskPriority, TaskStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Board ids in the exact top-to-bottom order the sidebar renders them, so
 * other views (e.g. the Overview list) can line up with it. Mirrors the
 * sidebar's own ordering: folders and loose boards interleave by their shared
 * `order` (folders win ties, then id), and boards inside a folder follow this
 * member's personal `board_order` preference, with unknown boards kept last. */
export function sidebarBoardOrder(
  boards: BoardListItem[],
  folders: Folder[],
  member: Pick<Member, "board_order"> | null | undefined
): number[] {
  const boardsInFolder = (folderId: number) => {
    const inFolder = boards.filter((b) => b.folder === folderId);
    const pref = member?.board_order?.[String(folderId)];
    if (!pref?.length) return inFolder;
    const rank = new Map(pref.map((id, i) => [id, i]));
    return inFolder
      .map((b, i) => ({ b, key: rank.get(b.id) ?? pref.length + i }))
      .sort((x, y) => x.key - y.key)
      .map((x) => x.b);
  };

  type TopItem =
    | { kind: "folder"; folder: Folder }
    | { kind: "board"; board: BoardListItem };
  const topItems: TopItem[] = [
    ...folders.map((folder) => ({ kind: "folder" as const, folder })),
    ...boards.filter((b) => b.folder == null).map((board) => ({ kind: "board" as const, board })),
  ].sort((a, b) => {
    const ao = a.kind === "folder" ? a.folder.order : a.board.order;
    const bo = b.kind === "folder" ? b.folder.order : b.board.order;
    if (ao !== bo) return ao - bo;
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    const aid = a.kind === "folder" ? a.folder.id : a.board.id;
    const bid = b.kind === "folder" ? b.folder.id : b.board.id;
    return aid - bid;
  });

  const ids: number[] = [];
  for (const item of topItems) {
    if (item.kind === "folder") {
      for (const b of boardsInFolder(item.folder.id)) ids.push(b.id);
    } else {
      ids.push(item.board.id);
    }
  }
  return ids;
}

/** Members who may be assigned/mentioned on a board. Public boards (or no
 * board context) expose the whole workspace directory; private boards narrow
 * it to the creator plus the invited members. */
export function membersForBoard(
  board: Pick<BoardListItem, "visibility" | "created_by" | "member_ids"> | null | undefined,
  members: Member[]
): Member[] {
  if (!board || board.visibility !== "private") return members;
  const allowed = new Set(board.member_ids);
  if (board.created_by != null) allowed.add(board.created_by);
  return members.filter((m) => allowed.has(m.id));
}

// `color` is the vivid fill used by the summary segment bars.
// `tint` is a single readable accent used for the soft status labels: the chip
// background is this color at low opacity and the text is this color, so the
// same value works over both light and dark surfaces.
export const STATUS_META: Record<TaskStatus, { label: string; color: string; text: string; tint: string }> = {
  not_started: { label: "Not Started", color: "#797E93", text: "#FFFFFF", tint: "#7A8194" },
  working: { label: "Working on it", color: "#5AC6FC", text: "#0B3A54", tint: "#2BA7E0" },
  review: { label: "In Review", color: "#FDBC64", text: "#4A2E05", tint: "#F59E0B" },
  stuck: { label: "Stuck", color: "#E2445C", text: "#FFFFFF", tint: "#E2445C" },
  done: { label: "Done", color: "#B0DC51", text: "#2A3D07", tint: "#10B981" },
};

export const STATUS_ORDER: TaskStatus[] = ["not_started", "working", "review", "stuck", "done"];

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; weight: number; tint: string }> = {
  urgent: { label: "Urgent", color: "#E2445C", weight: 3, tint: "#E2445C" },
  high: { label: "High", color: "#F59E0B", weight: 2, tint: "#F59E0B" },
  low: { label: "Low", color: "#4B91F7", weight: 1, tint: "#4A8FE0" },
  no_priority: { label: "No priority", color: "#C4C7D0", weight: 0, tint: "#7A8194" },
};

// Highest → lowest, used for filter/dropdown display order (sort uses `weight`).
export const PRIORITY_ORDER: TaskPriority[] = ["urgent", "high", "low", "no_priority"];

export const GROUP_COLORS = [
  "#4B91F7", "#10B981", "#F59E0B", "#E2445C", "#9D99FF",
  "#66CCFF", "#FF7AB3", "#78D0BD", "#C48ADB", "#FFCB00",
];

export const LABEL_COLORS = [
  "#9D99FF", "#4B91F7", "#10B981", "#E2445C", "#F59E0B",
  "#66CCFF", "#FF7AB3", "#C48ADB", "#FFCB00", "#78D0BD",
];

export function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export function dueDateTone(iso: string | null, status: TaskStatus): "overdue" | "soon" | "normal" {
  if (!iso || status === "done") return "normal";
  const days = differenceInCalendarDays(parseISO(iso), new Date());
  if (days < 0) return "overdue";
  if (days <= 1) return "soon";
  return "normal";
}

export function formatRelativeTime(iso: string): string {
  const d = parseISO(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return format(d, "MMM d, yyyy");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Copy text to the clipboard, falling back to a hidden textarea.
 *
 * navigator.clipboard only exists in a secure context — HTTPS or localhost —
 * so on a plain-HTTP deployment it is undefined and every copy silently fails.
 * execCommand("copy") is deprecated but still works there, and is the only
 * option until the site is served over TLS.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or insecure context — fall through.
    }
  }

  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  // Keep it off-screen and unfocusable-looking, but still selectable.
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}
