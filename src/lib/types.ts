export type TaskStatus = "not_started" | "working" | "review" | "stuck" | "done";
export type TaskPriority = "no_priority" | "low" | "high" | "urgent";
export type SortMode = "manual" | "due_date" | "priority" | "title" | "status";

export interface Member {
  id: number;
  name: string;
  email: string;
  initials: string;
  color: string;
  /** Absolute URL of the uploaded profile picture, or null for initials. */
  avatar?: string | null;
  /** ISO date (YYYY-MM-DD) or null when not set. */
  birthday?: string | null;
  phone?: string;
  /** ISO 3166-1 alpha-2 code ("PK"); empty when not set. */
  country?: string;
  /** IANA time zone key ("Asia/Karachi"); empty when not set. */
  timezone?: string;
  role?: "admin" | "member";
  /** Personal sidebar preference: folder id (string) → this user's own
   * ordering of the board ids inside it. Not visible to anyone else. */
  board_order?: Record<string, number[]>;
  /** Whether this member has linked their own Slack account (profile → Connect Slack). */
  slack_connected?: boolean;
  /** Whether this member has linked their own Google account (profile → Connect Google).
   * Meetings they organise only carry a Meet link when this is true. */
  google_connected?: boolean;
  /** The linked Google account's address, shown back to the member. Empty when
   * not connected — the tokens themselves never leave the server. */
  google_email?: string;
}

export interface Subitem {
  id: number;
  group: number;
  parent: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  order: number;
  assignees: Member[];
}

export interface Membership {
  id: number;
  workspace: number;
  member: number;
  member_detail: Member;
  role: "admin" | "member";
  created_at: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface Invite {
  id: number;
  workspace: number;
  email: string;
  role: "admin" | "member";
  token: string;
  invited_by_detail: Member | null;
  accepted: boolean;
  created_at: string;
  expires_at: string;
  /** Only present on create: whether the invite email actually went out. */
  emailed?: boolean;
}

export type LeaveType = "vacation" | "sick" | "personal" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: number;
  workspace: number;
  member: number;
  member_detail: Member;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  /** Inclusive calendar-day count, computed server-side. */
  days: number;
  reason: string;
  status: LeaveStatus;
  decided_by: number | null;
  decided_by_detail: Member | null;
  decided_at: string | null;
  decision_note: string;
  created_at: string;
}

export interface Meeting {
  id: number;
  workspace: number;
  title: string;
  description: string;
  /** ISO datetimes. */
  start_at: string;
  end_at: string;
  /** Started with "Meet now" rather than scheduled for later. */
  instant: boolean;
  /** Google Meet URL. Empty when the organiser hasn't connected Google — the
   * meeting is still real, there's just nothing to join yet. */
  meet_url: string;
  organizer: number;
  organizer_detail: Member;
  attendees: number[];
  attendee_details: Member[];
  cancelled_at: string | null;
  created_at: string;
  /** Only present on the instant-meeting response, explaining a missing link. */
  warning?: string;
}

export interface Label {
  id: number;
  board: number;
  name: string;
  color: string;
}

export type ColumnKind = "text" | "number" | "date" | "file" | "status";

/** One selectable label of a status column ("Sent", "Paid", …). */
export interface StatusOption {
  label: string;
  color: string;
}

/** User-defined column on a (personal/generic) board. */
export interface BoardColumn {
  id: number;
  board: number;
  name: string;
  kind: ColumnKind;
  /** Status columns only: the labels a cell may hold. */
  options?: StatusOption[];
  order: number;
}

/** A task's value in one custom column. */
export interface CellValue {
  column: number;
  value: string;
  file_url: string | null;
  file_name: string;
}

export interface TaskCard {
  id: number;
  group: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  order: number;
  assignees: Member[];
  labels: Label[];
  /** True when the task has a non-empty description — drives the row's note icon. */
  has_description: boolean;
  comment_count: number;
  attachment_count: number;
  checklist_total: number;
  checklist_done: number;
  subitem_count: number;
  subitem_done: number;
  subitems: Subitem[];
  /** Custom-column values keyed by column id (personal/generic boards). */
  cells?: Record<number, CellValue>;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: number;
  task: number;
  text: string;
  done: boolean;
  order: number;
}

export interface Comment {
  id: number;
  task: number;
  author: number;
  author_detail: Member;
  text: string;
  /** Absolute URL of an image dropped/pasted into the update, or null. */
  image?: string | null;
  created_at: string;
}

export interface Attachment {
  id: number;
  task: number;
  url: string | null;
  name: string;
  size: number;
  uploaded_by: number | null;
  uploaded_by_detail: Member | null;
  created_at: string;
}

export interface LinkItem {
  id: number;
  task: number;
  title: string;
  url: string;
  created_at: string;
}

export interface Activity {
  id: number;
  board: number;
  task: number | null;
  task_title: string | null;
  member: number | null;
  member_detail: Member | null;
  text: string;
  created_at: string;
}

export interface TaskDetail {
  id: number;
  group: number;
  board: number;
  parent: number | null;
  parent_title: string | null;
  subitems: Subitem[];
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  order: number;
  assignees: Member[];
  labels: Label[];
  checklist: ChecklistItem[];
  comments: Comment[];
  attachments: Attachment[];
  links: LinkItem[];
  activity: Activity[];
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: number;
  board: number;
  title: string;
  color: string;
  order: number;
  tasks: TaskCard[];
}

export type BoardVisibility = "public" | "private";

export interface Folder {
  id: number;
  workspace: number;
  name: string;
  order: number;
  /** Set on personal subfolders (only ever the current user's own id — other
   * people's personal folders never reach the client). Null for shared folders. */
  owner?: number | null;
  created_at: string;
}

export interface BoardListItem {
  id: number;
  workspace: number;
  folder: number | null;
  name: string;
  description: string;
  /** Absolute URL of the uploaded board logo, or null. Shown on Overview only. */
  logo?: string | null;
  order: number;
  visibility: BoardVisibility;
  /** Personal boards are always private and live under Personal Boards in the sidebar. */
  is_personal?: boolean;
  created_by: number | null;
  member_ids: number[];
  created_at: string;
}

export interface BoardDetail extends BoardListItem {
  groups: Group[];
  labels: Label[];
  /** Custom columns (personal/generic boards). */
  columns?: BoardColumn[];
}

export interface Workspace {
  id: number;
  name: string;
  color: string;
  /** Absolute URL of the company logo shown in the sidebar header, or null. */
  logo?: string | null;
  /** Brand accent as #rrggbb; empty string means the shipped purple. */
  theme_color?: string;
  /** Wordmark beside the sidebar logo; empty string means "WorkBoard". */
  brand_name?: string;
  boards: BoardListItem[];
  folders: Folder[];
  created_at: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

export interface SlackChannelConfig {
  channel_id: string;
  channel_name: string;
  active: boolean;
  notify_status: boolean;
  notify_comment: boolean;
  notify_description: boolean;
  notify_assignee: boolean;
}

export interface SlackStatus {
  /** Whether the server has Slack app credentials configured at all. */
  configured: boolean;
  /** Whether this board's workspace has installed the Slack app. */
  workspace_connected: boolean;
  team_name: string;
  /** Whether the acting user (a workspace admin) may change these settings. */
  can_manage: boolean;
  channel: SlackChannelConfig | null;
}

export interface WorkspaceSlackChannelConfig {
  channel_id: string;
  channel_name: string;
  active: boolean;
  notify_leave: boolean;
}

export interface WorkspaceSlackStatus {
  configured: boolean;
  workspace_connected: boolean;
  team_name: string;
  can_manage: boolean;
  channel: WorkspaceSlackChannelConfig | null;
}

export interface Filters {
  search: string;
  assignees: number[];
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  labels: number[];
  sort: SortMode;
}
