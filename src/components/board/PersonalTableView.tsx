"use client";

import { useRef, useState } from "react";
import {
  AlignLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardList,
  FileUp,
  Hash,
  Loader2,
  MessageCircle,
  MessageCirclePlus,
  MoreHorizontal,
  Paperclip,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useBoardStore } from "@/store/boardStore";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BoardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { OwnerCell } from "./cells";
import { cn, GROUP_COLORS } from "@/lib/utils";
import type { BoardColumn, ColumnKind, Group, StatusOption, TaskCard } from "@/lib/types";

const KIND_META: Record<ColumnKind, { label: string; icon: typeof Type }> = {
  status: { label: "Status", icon: CircleDot },
  text: { label: "Text", icon: Type },
  number: { label: "Number", icon: Hash },
  date: { label: "Date", icon: Calendar },
  file: { label: "File upload", icon: FileUp },
};

const COL_W = 170;

/** Grid template: task title, the description/updates icon pair, owner, then
 * one slot per custom column, then the "+ add column" gutter. Status lives in
 * the custom columns — each board defines its own labels. */
function gridTemplate(columnCount: number) {
  return `minmax(260px, 1fr) 84px 110px ${`${COL_W}px `.repeat(columnCount)}56px`;
}

function minWidth(columnCount: number) {
  return 260 + 84 + 110 + columnCount * COL_W + 56;
}

/** Popover body for creating a column: a name plus one of the four kinds. */
function AddColumnForm({ onSubmit }: { onSubmit: (name: string, kind: ColumnKind) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ColumnKind>("text");

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    onSubmit(n, kind);
  };

  return (
    <div className="flex flex-col gap-2 p-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        maxLength={100}
        placeholder="Column name…"
        className="h-8 w-full rounded-md border border-edge bg-surface-sunken px-2 text-[12.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
      />
      <div className="flex flex-col gap-0.5">
        {(Object.keys(KIND_META) as ColumnKind[]).map((k) => {
          const Icon = KIND_META[k].icon;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors duration-150",
                kind === k
                  ? "bg-primary-soft font-semibold text-primary dark:bg-primary/20"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
              )}
            >
              <Icon size={14} /> {KIND_META[k].label}
              {kind === k && <Check size={14} className="ml-auto" />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={13} /> Add column
      </button>
    </div>
  );
}

/** Status cell: a colored pill picked from the column's own labels, with an
 * inline "edit labels" mode to add/remove them (e.g. "Sent", "Paid"). */
function StatusOptionCell({ task, column }: { task: TaskCard; column: BoardColumn }) {
  const setCell = useBoardStore((s) => s.setCell);
  const setColumnOptions = useBoardStore((s) => s.setColumnOptions);
  const [editingLabels, setEditingLabels] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);

  const options: StatusOption[] = column.options ?? [];
  const value = task.cells?.[column.id]?.value ?? "";
  // A label that was deleted from the column can still be stored on old cells —
  // render it grey instead of pretending the cell is empty.
  const active = options.find((o) => o.label === value);
  const tint = active?.color ?? "#797E93";

  const addOption = () => {
    const label = newLabel.trim();
    if (!label) return;
    setNewLabel("");
    if (options.some((o) => o.label.toLowerCase() === label.toLowerCase())) return;
    setColumnOptions(column.id, [...options, { label, color: newColor }]);
  };

  return (
    <Dropdown
      matchTriggerSize
      trigger={
        <button
          type="button"
          className="group/chip flex h-full w-full cursor-pointer items-center justify-center px-2"
          aria-label={`Change ${column.name}`}
        >
          {value ? (
            <span
              className="inline-flex h-[32px] min-w-[96px] max-w-full items-center justify-center truncate rounded-full px-4 text-[12px] font-semibold transition-opacity duration-150 group-hover/chip:opacity-80"
              style={{ backgroundColor: `${tint}22`, color: tint }}
            >
              {value}
            </span>
          ) : (
            <span className="text-[12px] text-ink-faint">—</span>
          )}
        </button>
      }
    >
      {(close) => (
        <div className="flex flex-col gap-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                setCell(task.id, column.id, opt.label === value ? "" : opt.label);
                close();
              }}
              style={{
                backgroundColor: `${opt.color}22`,
                color: opt.color,
                boxShadow: value === opt.label ? `inset 0 0 0 1.5px ${opt.color}` : undefined,
              }}
              className="flex w-full cursor-pointer items-center justify-center rounded-full px-2.5 py-2 text-[12.5px] font-semibold transition-opacity duration-150 hover:opacity-80"
            >
              {opt.label}
            </button>
          ))}
          {options.length === 0 && !editingLabels && (
            <p className="px-2 py-1.5 text-[12px] text-ink-faint">No labels yet — add some below.</p>
          )}

          <div className="mt-1 border-t border-edge pt-1.5">
            {editingLabels ? (
              <div className="flex flex-col gap-1.5 px-1 pb-1">
                {options.map((opt) => (
                  <span
                    key={opt.label}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[12px] text-ink"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />
                    <span className="flex-1 truncate">{opt.label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setColumnOptions(column.id, options.filter((o) => o.label !== opt.label))
                      }
                      aria-label={`Delete label ${opt.label}`}
                      className="cursor-pointer rounded p-0.5 text-ink-faint transition-colors duration-150 hover:text-[#E2445C]"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  autoFocus
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addOption()}
                  maxLength={60}
                  placeholder="New label, press Enter…"
                  className="h-7 w-full rounded-md border border-edge bg-surface-sunken px-2 text-[12px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
                />
                <div className="flex flex-wrap gap-1.5 px-0.5">
                  {GROUP_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Label color ${c}`}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "h-4 w-4 cursor-pointer rounded-full transition-transform duration-150 hover:scale-110",
                        newColor === c && "ring-2 ring-ink ring-offset-1 ring-offset-surface-raised"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Commit whatever is still typed in the input — "type a
                    // label, click Done" must not silently drop it.
                    addOption();
                    setEditingLabels(false);
                  }}
                  className="mt-0.5 cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingLabels(true)}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                <Pencil size={12} /> Edit labels
              </button>
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}

/** One editable custom-column cell on a task row. */
function CustomCell({ task, column }: { task: TaskCard; column: BoardColumn }) {
  const setCell = useBoardStore((s) => s.setCell);
  const setCellFile = useBoardStore((s) => s.setCellFile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cell = task.cells?.[column.id];
  const value = cell?.value ?? "";

  if (column.kind === "status") {
    return <StatusOptionCell task={task} column={column} />;
  }

  if (column.kind === "file") {
    const pickFile = () => fileInputRef.current?.click();
    return (
      <div className="flex h-full w-full items-center justify-center px-2">
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setUploading(true);
            await setCellFile(task.id, column.id, file);
            setUploading(false);
          }}
        />
        {uploading ? (
          <Loader2 size={14} className="animate-spin text-ink-faint" />
        ) : cell?.file_url ? (
          <span className="group/file flex min-w-0 items-center gap-1">
            <a
              href={cell.file_url}
              target="_blank"
              rel="noreferrer"
              title={cell.file_name}
              className="flex min-w-0 items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              <Paperclip size={12} className="shrink-0" />
              <span className="truncate">{cell.file_name || "File"}</span>
            </a>
            <button
              type="button"
              onClick={() => setCellFile(task.id, column.id, null)}
              aria-label={`Remove file from ${column.name}`}
              className="cursor-pointer rounded p-0.5 text-ink-faint opacity-0 transition-all duration-150 hover:text-[#E2445C] group-hover/file:opacity-100"
            >
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={pickFile}
            aria-label={`Upload file to ${column.name}`}
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover/prow:opacity-100"
          >
            <FileUp size={13} /> Upload
          </button>
        )}
      </div>
    );
  }

  if (column.kind === "date") {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <input
          type="date"
          value={value}
          onChange={(e) => setCell(task.id, column.id, e.target.value)}
          aria-label={column.name}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <span
          className={cn(
            "pointer-events-none text-[12.5px] font-medium",
            value ? "text-ink-muted" : "text-ink-faint"
          )}
        >
          {value || "—"}
        </span>
      </div>
    );
  }

  // text / number
  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v !== value) setCell(task.id, column.id, v);
  };
  return editing ? (
    <div className="flex h-full w-full items-center px-1">
      <input
        autoFocus
        type={column.kind === "number" ? "number" : "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        aria-label={column.name}
        className="w-full rounded-md border border-primary bg-surface px-1.5 py-0.5 text-[12.5px] text-ink outline-none"
      />
    </div>
  ) : (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title={value || `Set ${column.name}`}
      className="flex h-full w-full cursor-pointer items-center justify-center px-2 text-[12.5px]"
    >
      <span className={cn("truncate", value ? "text-ink" : "text-ink-faint")}>{value || "—"}</span>
    </button>
  );
}

function PersonalRow({
  task,
  columns,
  isLast,
}: {
  task: TaskCard;
  columns: BoardColumn[];
  isLast: boolean;
}) {
  const openTask = useBoardStore((s) => s.openTask);
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onUpdate = (patch: Record<string, unknown>) => updateTask(task.id, patch);

  const submitTitle = () => {
    setEditing(false);
    const t = titleValue.trim();
    if (t && t !== task.title) updateTask(task.id, { title: t });
  };

  return (
    <>
      <div
        className={cn(
          "group/prow grid h-12 items-stretch bg-surface-raised text-[13px] transition-colors duration-100 hover:bg-surface-sunken",
          !isLast && "border-b border-edge"
        )}
        style={{ gridTemplateColumns: gridTemplate(columns.length), minWidth: minWidth(columns.length) }}
      >
        {/* Title */}
        <div className="flex min-w-0 items-center gap-1 border-r border-edge-soft px-2.5">
          {editing ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={submitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitTitle();
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-full rounded-md border border-primary bg-surface px-1.5 py-0.5 text-[13px] text-ink outline-none"
              aria-label="Task title"
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => openTask(task.id)}
                className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13.5px] font-medium text-ink transition-colors duration-150 hover:text-primary"
                title={task.title}
              >
                {task.title}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleValue(task.title);
                  setEditing(true);
                }}
                aria-label="Edit title"
                className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover/prow:opacity-100"
              >
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>

        {/* Description + updates — both open the task panel */}
        <div className="flex items-center justify-center gap-0.5 border-r border-edge-soft">
          <button
            type="button"
            onClick={() => openTask(task.id)}
            aria-label={task.has_description ? "View description" : "Add description"}
            title={task.has_description ? "This item has a description" : "Add a description"}
            className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-edge hover:text-primary"
          >
            {task.has_description ? (
              <AlignLeft size={17} className="text-primary" />
            ) : (
              <AlignLeft size={17} className="opacity-0 transition-opacity duration-150 group-hover/prow:opacity-100" />
            )}
          </button>
          <button
            type="button"
            onClick={() => openTask(task.id)}
            aria-label={task.comment_count > 0 ? `${task.comment_count} updates` : "Add update"}
            className="relative cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-edge hover:text-primary"
          >
            {task.comment_count > 0 ? (
              <>
                <MessageCircle size={17} className="text-primary" />
                <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-0.5 text-[9.5px] font-bold text-white">
                  {task.comment_count}
                </span>
              </>
            ) : (
              <MessageCirclePlus size={17} className="opacity-0 transition-opacity duration-150 group-hover/prow:opacity-100" />
            )}
          </button>
        </div>

        {/* Owner */}
        <div className="flex items-center justify-center border-r border-edge-soft">
          <OwnerCell task={task} onUpdate={onUpdate} />
        </div>

        {/* Custom columns */}
        {columns.map((column) => (
          <div key={column.id} className="relative flex min-w-0 items-center border-r border-edge-soft">
            <CustomCell task={task} column={column} />
          </div>
        ))}

        {/* Row actions gutter (under the + column) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${task.title}`}
            className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:text-[#E2445C] group-hover/prow:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete item?"
        message={`"${task.title}" and all of its updates and files will be permanently deleted.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteTask(task.id);
        }}
      />
    </>
  );
}

function PersonalGroup({ group, columns }: { group: Group; columns: BoardColumn[] }) {
  const updateGroup = useBoardStore((s) => s.updateGroup);
  const deleteGroup = useBoardStore((s) => s.deleteGroup);
  const addTask = useBoardStore((s) => s.addTask);
  const addColumn = useBoardStore((s) => s.addColumn);
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const deleteColumn = useBoardStore((s) => s.deleteColumn);

  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [renamingColumn, setRenamingColumn] = useState<BoardColumn | null>(null);
  const [columnDraft, setColumnDraft] = useState("");
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<BoardColumn | null>(null);

  const tasks = group.tasks;

  const submitRename = () => {
    setRenaming(false);
    const title = renameValue.trim();
    if (title && title !== group.title) updateGroup(group.id, { title });
  };

  const submitTask = async () => {
    const title = taskTitle.trim();
    setTaskTitle("");
    if (!title) {
      setAddingTask(false);
      return;
    }
    await addTask(group.id, title);
  };

  const commitColumnRename = () => {
    const target = renamingColumn;
    const name = columnDraft.trim();
    setRenamingColumn(null);
    setColumnDraft("");
    if (target && name && name !== target.name) renameColumn(target.id, name);
  };

  return (
    <section className="mb-10">
      <div className="overflow-hidden rounded-2xl border border-edge bg-surface-raised">
        {/* Group header */}
        <div
          className="flex items-center justify-between gap-2 px-4 py-3"
          style={{ backgroundColor: `${group.color}14`, borderBottom: `2px solid ${group.color}` }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
            {renaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="rounded-md border border-primary bg-surface-raised px-2 py-0.5 text-[14px] font-semibold text-ink outline-none"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={() => {
                  setRenameValue(group.title);
                  setRenaming(true);
                }}
                className="cursor-text truncate text-[14px] font-semibold text-ink"
                title="Double-click to rename"
              >
                {group.title}
              </button>
            )}
            <span className="shrink-0 text-[13px] font-medium text-ink-faint">
              {tasks.length} item{tasks.length === 1 ? "" : "s"}
            </span>
            <Dropdown
              width={190}
              trigger={
                <button
                  type="button"
                  aria-label={`Options for group ${group.title}`}
                  className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
                >
                  <MoreHorizontal size={16} />
                </button>
              }
            >
              {(close) => (
                <>
                  <DropdownItem
                    onClick={() => {
                      setRenameValue(group.title);
                      setRenaming(true);
                      close();
                    }}
                  >
                    <Pencil size={14} /> Rename group
                  </DropdownItem>
                  <div className="px-2.5 py-1.5">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
                      <Palette size={13} /> Color
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {GROUP_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Set color ${c}`}
                          onClick={() => {
                            updateGroup(group.id, { color: c });
                            close();
                          }}
                          className={cn(
                            "h-5 w-5 cursor-pointer rounded-md transition-transform duration-150 hover:scale-110",
                            group.color === c && "ring-2 ring-ink ring-offset-1 ring-offset-surface-raised"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <DropdownItem
                    danger
                    onClick={() => {
                      setConfirmDelete(true);
                      close();
                    }}
                  >
                    <Trash2 size={14} /> Delete group
                  </DropdownItem>
                </>
              )}
            </Dropdown>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? `Expand group ${group.title}` : `Collapse group ${group.title}`}
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {!collapsed && (
          <div className="overflow-x-auto nice-scroll">
            <div style={{ minWidth: minWidth(columns.length) }}>
              {/* Header row */}
              <div
                className="grid h-11 items-stretch border-b border-edge text-[12px] font-medium text-ink-muted"
                style={{ gridTemplateColumns: gridTemplate(columns.length), minWidth: minWidth(columns.length) }}
              >
                <div className="flex items-center justify-start px-4 opacity-50">Task</div>
                <div />
                <div className="flex items-center justify-center opacity-50">Owner</div>
                {columns.map((column) => {
                  const Icon = KIND_META[column.kind].icon;
                  return (
                    <div key={column.id} className="group/col relative flex min-w-0 items-center justify-center gap-1">
                      {renamingColumn?.id === column.id ? (
                        <input
                          autoFocus
                          value={columnDraft}
                          onChange={(e) => setColumnDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitColumnRename();
                            if (e.key === "Escape") {
                              setRenamingColumn(null);
                              setColumnDraft("");
                            }
                          }}
                          onBlur={commitColumnRename}
                          className="mx-1 w-full min-w-0 rounded-md border border-primary bg-surface px-1.5 py-0.5 text-[12px] text-ink outline-none"
                        />
                      ) : (
                        <>
                          <span className="truncate opacity-50" title={`${column.name} (${KIND_META[column.kind].label})`}>
                            {column.name}
                          </span>
                          <Dropdown
                            align="right"
                            width={170}
                            trigger={
                              <button
                                type="button"
                                aria-label={`Options for column ${column.name}`}
                                className="cursor-pointer rounded p-0.5 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover/col:opacity-100"
                              >
                                <MoreHorizontal size={13} />
                              </button>
                            }
                          >
                            {(close) => (
                              <>
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] text-ink-faint">
                                  <Icon size={12} /> {KIND_META[column.kind].label} column
                                </div>
                                <DropdownItem
                                  onClick={() => {
                                    setRenamingColumn(column);
                                    setColumnDraft(column.name);
                                    close();
                                  }}
                                >
                                  <Pencil size={14} /> Rename
                                </DropdownItem>
                                <DropdownItem
                                  danger
                                  onClick={() => {
                                    setDeleteColumnTarget(column);
                                    close();
                                  }}
                                >
                                  <Trash2 size={14} /> Delete column
                                </DropdownItem>
                              </>
                            )}
                          </Dropdown>
                        </>
                      )}
                    </div>
                  );
                })}
                {/* Add column */}
                <div className="flex items-center justify-center">
                  <Dropdown
                    align="right"
                    width={210}
                    trigger={
                      <button
                        type="button"
                        aria-label="Add column"
                        title="Add column"
                        className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-primary"
                      >
                        <Plus size={15} />
                      </button>
                    }
                  >
                    {(close) => (
                      <AddColumnForm
                        onSubmit={(name, kind) => {
                          addColumn(name, kind);
                          close();
                        }}
                      />
                    )}
                  </Dropdown>
                </div>
              </div>

              {tasks.map((task, index) => (
                <PersonalRow
                  key={task.id}
                  task={task}
                  columns={columns}
                  isLast={index === tasks.length - 1}
                />
              ))}

              {/* Add task row */}
              <div
                role={!addingTask ? "button" : undefined}
                tabIndex={!addingTask ? 0 : undefined}
                onClick={() => {
                  if (!addingTask) setAddingTask(true);
                }}
                onKeyDown={(e) => {
                  if (!addingTask && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setAddingTask(true);
                  }
                }}
                className={cn(
                  "flex h-11 items-center bg-surface-raised px-4",
                  !addingTask && "cursor-pointer hover:bg-surface-sunken",
                  tasks.length > 0 && "border-t border-edge"
                )}
                style={{ minWidth: minWidth(columns.length) }}
              >
                {addingTask ? (
                  <input
                    autoFocus
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onBlur={() => {
                      submitTask();
                      setAddingTask(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitTask();
                      if (e.key === "Escape") {
                        setAddingTask(false);
                        setTaskTitle("");
                      }
                    }}
                    placeholder="Item name, press Enter…"
                    className="w-full max-w-md rounded-md border border-primary bg-surface px-2 py-1 text-[13px] text-ink outline-none placeholder:text-ink-faint"
                  />
                ) : (
                  <span className="flex items-center gap-1.5 py-1 text-[12.5px] font-medium text-ink-faint">
                    <Plus size={14} /> Add item
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete group?"
        message={`"${group.title}" and its ${tasks.length} item${tasks.length === 1 ? "" : "s"} will be permanently deleted.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteGroup(group.id);
        }}
      />

      <ConfirmDialog
        open={!!deleteColumnTarget}
        title="Delete column?"
        message={`"${deleteColumnTarget?.name}" and every value stored in it will be permanently deleted from all items.`}
        onCancel={() => setDeleteColumnTarget(null)}
        onConfirm={() => {
          const target = deleteColumnTarget!;
          setDeleteColumnTarget(null);
          deleteColumn(target.id);
        }}
      />
    </section>
  );
}

/** Table for personal (generic) boards: fixed Task/Owner/Status columns plus
 * the board's own custom columns — text, number, date or file — added from the
 * "+" header. */
export function PersonalTableView() {
  const board = useBoardStore((s) => s.board);
  const boardLoading = useBoardStore((s) => s.boardLoading);
  const addGroup = useBoardStore((s) => s.addGroup);

  if (boardLoading) return <BoardSkeleton />;
  if (!board) {
    return (
      <EmptyState
        icon={<ClipboardList size={22} />}
        title="Board not found"
        message="This board may have been deleted. Pick another board from the sidebar."
      />
    );
  }

  const columns = board.columns ?? [];

  return (
    <div className="relative mt-6 flex-1 overflow-y-auto rounded-2xl nice-scroll">
      {board.groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={22} />}
          title="This board is empty"
          message="Create your first group to start adding items."
          action={
            <button
              type="button"
              onClick={() => addGroup("New Group")}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover"
            >
              <Plus size={16} /> Add group
            </button>
          }
        />
      ) : (
        <>
          {board.groups.map((group) => (
            <PersonalGroup key={group.id} group={group} columns={columns} />
          ))}
          <button
            type="button"
            onClick={() => addGroup("New Group")}
            className="mb-8 flex cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <Plus size={14} /> Add group
          </button>
        </>
      )}
    </div>
  );
}
