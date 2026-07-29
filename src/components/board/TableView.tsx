"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardList,
  CornerDownRight,
  GripVertical,
  MessageCircle,
  MessageCirclePlus,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import { useBoardStore } from "@/store/boardStore";
import { useVisibleTasks } from "@/lib/useVisibleTasks";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BoardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { AvatarStack } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Badges";
import { DueCell, OwnerCell, PriorityCell, StatusCell } from "./cells";
import {
  cn,
  GROUP_COLORS,
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/utils";
import type { Group, Subitem, TaskCard } from "@/lib/types";

const GRID = "36px minmax(280px, 1fr) 84px 110px 150px 132px 180px 132px";
const MIN_W = 1116;
const SUB_GRID = "64px minmax(240px, 1fr) 110px 150px 132px 132px 40px";

function HeaderRow({
  allSelected,
  onToggleAll,
  color,
}: {
  allSelected: boolean;
  onToggleAll: () => void;
  color: string;
}) {
  return (
    <div
      className="grid h-11 items-stretch border-b border-edge text-[12px] font-medium text-ink-muted"
      style={{ gridTemplateColumns: GRID, minWidth: MIN_W, 
        // backgroundColor: `${color}14` 
      }}
    >
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          aria-label="Select all tasks in group"
          className="round-check h-3.5 w-3.5 cursor-pointer"
        />
      </div>
      <div className="flex items-center justify-start px-7 opacity-50">Task</div>
      <div />
      <div className="flex items-center justify-center opacity-50">Owner</div>
      <div className="flex items-center justify-center opacity-50">Status</div>
      <div className="flex items-center justify-center opacity-50">Due date</div>
      <div className="flex items-center justify-center opacity-50">Labels</div>
      <div className="flex items-center justify-center opacity-50">Priority</div>
    </div>
  );
}

function SegBar({ segments, total }: { segments: { color: string; count: number; label: string }[]; total: number }) {
  if (total === 0) return <div className="h-6 w-full rounded-sm bg-surface-sunken" />;
  return (
    <div className="flex h-6 w-full overflow-hidden rounded-sm">
      {segments
        .filter((s) => s.count > 0)
        .map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.count}/${total}`}
            className="h-full transition-[width] duration-300"
            style={{ backgroundColor: s.color, width: `${(s.count / total) * 100}%` }}
          />
        ))}
    </div>
  );
}

function SubitemRow({ sub, parentId }: { sub: Subitem; parentId: number }) {
  const updateSubitem = useBoardStore((s) => s.updateSubitem);
  const deleteSubitem = useBoardStore((s) => s.deleteSubitem);
  const openTask = useBoardStore((s) => s.openTask);
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  const onUpdate = (patch: Record<string, unknown>) => updateSubitem(parentId, sub.id, patch);

  const submitTitle = () => {
    setEditing(false);
    const t = titleValue.trim();
    if (t && t !== sub.title) onUpdate({ title: t });
  };

  return (
    <div
      className="group/sub grid h-9 items-stretch border-b border-edge bg-surface-raised text-[12.5px] transition-colors duration-100 hover:bg-surface-sunken"
      style={{ gridTemplateColumns: SUB_GRID, minWidth: MIN_W - 40 }}
    >
      <div className="flex items-center justify-end border-r border-edge-soft pr-2 text-ink-faint">
        <CornerDownRight size={13} />
      </div>
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
            className="w-full rounded-md border border-primary bg-surface px-1.5 py-0.5 text-[12.5px] text-ink outline-none"
            aria-label="Subitem title"
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => openTask(sub.id)}
              className="min-w-0 flex-1 cursor-pointer truncate text-left text-ink transition-colors duration-150 hover:text-primary"
              title={sub.title}
            >
              {sub.title}
            </button>
            <button
              type="button"
              onClick={() => {
                setTitleValue(sub.title);
                setEditing(true);
              }}
              aria-label="Edit subitem title"
              className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover/sub:opacity-100"
            >
              <Pencil size={11} />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center justify-center border-r border-edge-soft">
        <OwnerCell task={sub} onUpdate={onUpdate} />
      </div>
      <div className="relative border-r border-edge-soft">
        <StatusCell task={sub} onUpdate={onUpdate} />
      </div>
      <div className="flex items-center border-r border-edge-soft">
        <DueCell task={sub} onUpdate={onUpdate} />
      </div>
      <div className="relative border-r border-edge-soft">
        <PriorityCell task={sub} onUpdate={onUpdate} />
      </div>
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => deleteSubitem(parentId, sub.id)}
          aria-label={`Delete subitem ${sub.title}`}
          className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:text-[#E2445C] group-hover/sub:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  selected,
  onSelect,
  isLast,
  draggable,
}: {
  task: TaskCard;
  selected: boolean;
  onSelect: () => void;
  isLast: boolean;
  /** Whether this row can be dragged (manual sort, no filters). */
  draggable: boolean;
}) {
  const openTask = useBoardStore((s) => s.openTask);
  const updateTask = useBoardStore((s) => s.updateTask);
  const addSubitem = useBoardStore((s) => s.addSubitem);
  const board = useBoardStore((s) => s.board);
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [subTitle, setSubTitle] = useState("");

  // Drag-to-move between sections. The handle carries the listeners so the
  // row's cells (title, status, owner…) stay clickable.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  const subitems = task.subitems ?? [];

  const submitSub = async () => {
    const t = subTitle.trim();
    setSubTitle("");
    if (!t) {
      setAddingSub(false);
      return;
    }
    await addSubitem(task.id, task.group, t);
  };

  const submitTitle = () => {
    setEditing(false);
    const t = titleValue.trim();
    if (t && t !== task.title) updateTask(task.id, { title: t });
  };

  const toggleLabel = (labelId: number) => {
    const ids = task.labels.map((l) => l.id);
    const next = ids.includes(labelId) ? ids.filter((i) => i !== labelId) : [...ids, labelId];
    updateTask(task.id, { label_ids: next });
  };

  const onUpdate = (patch: Record<string, unknown>) => updateTask(task.id, patch);

  return (
    <>
    <div
      ref={setNodeRef}
      className={cn(
        "group/row grid h-12 items-stretch bg-surface-raised text-[13px] transition-colors duration-100 hover:bg-surface-sunken",
        !isLast && "border-b border-edge",
        selected && "bg-primary-soft hover:bg-primary-soft dark:bg-primary/15 dark:hover:bg-primary/15",
        isDragging && "relative z-10 opacity-40"
      )}
      style={{
        gridTemplateColumns: GRID,
        minWidth: MIN_W,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {/* Select */}
      <div className="flex items-center justify-center border-r border-edge-soft">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          aria-label={`Select task ${task.title}`}
          className="round-check h-3.5 w-3.5 cursor-pointer"
        />
      </div>

      {/* Title */}
      <div className="flex min-w-0 items-center gap-1 border-r border-edge-soft px-1.5">
        {draggable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag task ${task.title} to move it`}
            title="Drag to move between sections"
            className="shrink-0 cursor-grab touch-none rounded p-0.5 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink active:cursor-grabbing group-hover/row:opacity-100"
          >
            <GripVertical size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse subitems" : "Expand subitems"}
          className={cn(
            "cursor-pointer rounded p-0.5 text-ink-faint transition-all duration-150 hover:bg-edge hover:text-ink",
            subitems.length === 0 && !expanded && "opacity-0 group-hover/row:opacity-100"
          )}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
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
              className="min-w-0 flex-1 font-medium text-[13.5px] cursor-pointer truncate text-left text-ink transition-colors duration-150 hover:text-primary"
              title={task.title}
            >
              {task.title}
            </button>
            {subitems.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="cursor-pointer rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-muted transition-colors duration-150 hover:bg-edge"
                title={`${task.subitem_done}/${subitems.length} subitems done`}
              >
                {task.subitem_done}/{subitems.length}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setTitleValue(task.title);
                setEditing(true);
              }}
              aria-label="Edit title"
              className="cursor-pointer rounded p-1 text-ink-faint opacity-0 transition-all duration-150 hover:bg-edge hover:text-ink group-hover/row:opacity-100"
            >
              <Pencil size={12} />
            </button>
          </>
        )}
      </div>

      {/* Description + Chat */}
      <div className="flex items-center justify-center gap-0.5 border-r border-edge-soft">
        <button
          type="button"
          onClick={() => openTask(task.id)}
          aria-label={task.has_description ? "View description" : "Add description"}
          title={task.has_description ? "This task has a description" : "Add a description"}
          className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-edge hover:text-primary"
        >
          {task.has_description ? (
            <AlignLeft size={17} className="text-primary" />
          ) : (
            <AlignLeft size={17} className="opacity-0 transition-opacity duration-150 group-hover/row:opacity-100" />
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
            <MessageCirclePlus size={17} className="opacity-0 transition-opacity duration-150 group-hover/row:opacity-100" />
          )}
        </button>
      </div>

      {/* Owner */}
      <div className="flex items-center justify-center border-r border-edge-soft">
        <OwnerCell task={task} onUpdate={onUpdate} />
      </div>

      {/* Status — full colored cell */}
      <div className="relative border-r border-edge-soft">
        <StatusCell task={task} onUpdate={onUpdate} />
      </div>

      {/* Due date */}
      <div className="flex items-center border-r border-edge-soft">
        <DueCell task={task} onUpdate={onUpdate} />
      </div>

      {/* Labels */}
      <div className="flex min-w-0 items-center border-r border-edge-soft">
        <Dropdown
          width={220}
          trigger={
            <button
              type="button"
              className="flex h-full w-full cursor-pointer flex-wrap items-center justify-center gap-1 overflow-hidden px-2 py-1"
              aria-label="Edit labels"
            >
              {task.labels.length === 0 && <span className="text-[12px] text-ink-faint">—</span>}
              {task.labels.slice(0, 2).map((l) => (
                <span
                  key={l.id}
                  className="inline-flex h-[18px] max-w-[76px] items-center truncate rounded-full px-2 text-[10.5px] font-semibold text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
              {task.labels.length > 2 && (
                <span className="text-[11px] font-semibold text-ink-faint">+{task.labels.length - 2}</span>
              )}
            </button>
          }
        >
          <div className="max-h-56 overflow-y-auto nice-scroll">
            {(board?.labels ?? []).map((l) => (
              <DropdownItem key={l.id} onClick={() => toggleLabel(l.id)}>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="flex-1">{l.name}</span>
                {task.labels.some((x) => x.id === l.id) && <Check size={15} className="text-primary" />}
              </DropdownItem>
            ))}
            {(board?.labels.length ?? 0) === 0 && (
              <p className="px-2.5 py-2 text-[12px] text-ink-faint">No labels on this board yet.</p>
            )}
          </div>
        </Dropdown>
      </div>

      {/* Priority — full colored cell */}
      <div className="relative">
        <PriorityCell task={task} onUpdate={onUpdate} />
      </div>
    </div>

    {/* Subitems */}
    {expanded && (
      <div className="border-b border-edge bg-surface pl-10" style={{ minWidth: MIN_W }}>
        <div className="border-l-2 border-ink-faint/30">
          {subitems.length > 0 && (
            <div
              className="grid h-8 items-stretch border-b border-edge bg-surface text-[11.5px] font-medium text-ink-muted"
              style={{ gridTemplateColumns: SUB_GRID, minWidth: MIN_W - 40 }}
            >
              <div className="border-r border-edge-soft" />
              <div className="flex items-center justify-center border-r border-edge-soft">Subitem</div>
              <div className="flex items-center justify-center border-r border-edge-soft">Owner</div>
              <div className="flex items-center justify-center border-r border-edge-soft">Status</div>
              <div className="flex items-center justify-center border-r border-edge-soft">Due date</div>
              <div className="flex items-center justify-center border-r border-edge-soft">Priority</div>
              <div />
            </div>
          )}
          {subitems.map((sub) => (
            <SubitemRow key={sub.id} sub={sub} parentId={task.id} />
          ))}
          <div className="flex h-9 items-center px-4">
            {addingSub ? (
              <input
                autoFocus
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                onBlur={() => {
                  submitSub();
                  setAddingSub(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSub();
                  if (e.key === "Escape") {
                    setAddingSub(false);
                    setSubTitle("");
                  }
                }}
                placeholder="Subitem title, press Enter…"
                className="w-full max-w-sm rounded-md border border-primary bg-surface-raised px-2 py-1 text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingSub(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                <Plus size={13} /> Add subitem
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

/**
 * Card representation of a task row, shown only below the `md` breakpoint
 * (the same breakpoint the BottomTabBar switches on). Tapping anywhere on
 * the card opens the details drawer — status/owner are read-only here and
 * are edited from the drawer instead, unlike the interactive desktop cells.
 */
function MobileTaskCard({ task, isLast }: { task: TaskCard; isLast: boolean }) {
  const openTask = useBoardStore((s) => s.openTask);
  const subitems = task.subitems ?? [];

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      aria-label={`Open ${task.title}`}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-2.5 bg-surface-raised py-3 px-4 text-left transition-colors duration-100 active:bg-surface-sunken",
        !isLast && "border-b border-edge"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{task.title}</span>
        {subitems.length > 0 && (
          <span
            className="shrink-0 rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-muted"
            title={`${task.subitem_done}/${subitems.length} subitems done`}
          >
            {task.subitem_done}/{subitems.length}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <StatusPill status={task.status} size="md" />
        {task.assignees.length > 0 ? (
          <AvatarStack members={task.assignees} size={26} max={3} />
        ) : (
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-ink-faint/40 text-ink-faint">
            <Plus size={12} />
          </span>
        )}
      </div>
    </button>
  );
}

function TableGroup({
  group,
  tasks,
  selected,
  onToggleTask,
  onToggleGroup,
  dndEnabled,
}: {
  group: Group;
  tasks: TaskCard[];
  selected: Set<number>;
  onToggleTask: (id: number) => void;
  onToggleGroup: (ids: number[], select: boolean) => void;
  /** Whether task rows can be dragged (manual sort, no filters). */
  dndEnabled: boolean;
}) {
  const updateGroup = useBoardStore((s) => s.updateGroup);
  const deleteGroup = useBoardStore((s) => s.deleteGroup);
  const addTask = useBoardStore((s) => s.addTask);

  // Drag-to-reorder: the handle in the header carries the listeners, so the
  // rest of the header (rename, options, collapse) stays clickable.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `tgroup-${group.id}`,
    data: { type: "group", groupId: group.id },
  });

  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

  const allSelected = tasks.length > 0 && tasks.every((t) => selected.has(t.id));

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

  const statusSegments = STATUS_ORDER.map((s) => ({
    label: STATUS_META[s].label,
    color: STATUS_META[s].color,
    count: tasks.filter((t) => t.status === s).length,
  }));
  const prioritySegments = PRIORITY_ORDER.map((p) => ({
    label: PRIORITY_META[p].label,
    color: PRIORITY_META[p].color,
    count: tasks.filter((t) => t.priority === p).length,
  }));

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("mb-10", isDragging && "relative z-10 opacity-60")}
    >
      <div className="overflow-hidden rounded-2xl border border-edge bg-surface-raised">
        {/* Group header */}
        <div
          className="flex items-center justify-between gap-2 px-4 py-3"
          style={{ backgroundColor: `${group.color}14`, borderBottom: `2px solid ${group.color}` }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Drag group ${group.title} to reorder`}
              title="Drag to reorder"
              className="cursor-grab touch-none rounded p-0.5 text-ink-faint transition-colors duration-150 hover:text-ink active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </button>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: group.color }}
            />
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
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
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
          <>
            {/* Desktop / tablet table — unchanged, hidden below md where the BottomTabBar takes over navigation */}
            <div className="hidden overflow-x-auto nice-scroll md:block">
              <div style={{ minWidth: MIN_W }}>
                <HeaderRow
                  allSelected={allSelected}
                  onToggleAll={() => onToggleGroup(tasks.map((t) => t.id), !allSelected)}
                  color={group.color}
                />

                <SortableContext
                  items={tasks.map((t) => `task-${t.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {tasks.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={selected.has(task.id)}
                      onSelect={() => onToggleTask(task.id)}
                      isLast={index === tasks.length - 1}
                      draggable={dndEnabled}
                    />
                  ))}
                </SortableContext>

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
                    "grid h-11 items-stretch overflow-hidden bg-surface-raised",
                    !addingTask && "cursor-pointer hover:bg-surface-sunken",
                    tasks.length > 0 && "border-t border-edge"
                  )}
                  style={{ gridTemplateColumns: GRID, minWidth: MIN_W }}
                >
                  <div className="border-r border-edge-soft" />
                  <div className="col-span-7 flex items-center px-2.5">
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
                        placeholder="Task title, press Enter…"
                        className="w-full max-w-md rounded-md border border-primary bg-surface px-2 py-1 text-[13px] text-ink outline-none placeholder:text-ink-faint"
                      />
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-1 text-[12.5px] font-medium text-ink-faint transition-colors duration-150 group-hover/task-section:text-ink">
                        <Plus size={14} /> Add task
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile card list — below md, where the table's horizontal scroll gives way to full-width cards */}
            <div className="md:hidden">
              {tasks.map((task, index) => (
                <MobileTaskCard
                  key={task.id}
                  task={task}
                  isLast={index === tasks.length - 1 && !addingTask}
                />
              ))}

              {/* Add task row */}
              <div
                className={cn(
                  "flex items-center bg-surface-raised px-4 py-1",
                  tasks.length > 0 && "border-t border-edge"
                )}
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
                    placeholder="Task title, press Enter…"
                    className="w-full rounded-md border border-primary bg-surface px-2 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTask(true)}
                    className="flex w-full cursor-pointer items-center gap-1.5 py-2 text-[13px] font-medium text-ink-faint transition-colors duration-150 hover:text-ink"
                  >
                    <Plus size={15} /> Add task
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Summary row — hidden for now
      {!collapsed && tasks.length > 0 && (
        <div className="overflow-x-auto nice-scroll">
          <div
            className="mt-1.5 grid items-center"
            style={{ gridTemplateColumns: GRID, minWidth: MIN_W }}
          >
            <div className="col-span-4" />
            <div className="px-1.5">
              <SegBar segments={statusSegments} total={tasks.length} />
            </div>
            <div />
            <div />
            <div className="px-1.5">
              <SegBar segments={prioritySegments} total={tasks.length} />
            </div>
          </div>
        </div>
      )}
      */}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete group?"
        message={`"${group.title}" and its ${tasks.length} task${tasks.length === 1 ? "" : "s"} will be permanently deleted.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteGroup(group.id);
        }}
      />
    </section>
  );
}

export function TableView() {
  const board = useBoardStore((s) => s.board);
  const boardLoading = useBoardStore((s) => s.boardLoading);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const updateTask = useBoardStore((s) => s.updateTask);
  const archiveTask = useBoardStore((s) => s.archiveTask);
  const addGroup = useBoardStore((s) => s.addGroup);
  const moveGroupLocal = useBoardStore((s) => s.moveGroupLocal);
  const persistGroupOrder = useBoardStore((s) => s.persistGroupOrder);
  const moveTaskLocal = useBoardStore((s) => s.moveTaskLocal);
  const persistTaskOrder = useBoardStore((s) => s.persistTaskOrder);
  const filters = useBoardStore((s) => s.filters);
  const { map: visibleTasks, hasFilters, totalVisible } = useVisibleTasks();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  // Which group a dragged task started in, so we can persist both ends of a move.
  const dragOriginGroup = useRef<number | null>(null);

  // Task rows are only draggable in manual sort with no filters — otherwise the
  // visible order doesn't match the stored order and a drop would scramble it.
  // Section reordering stays available regardless.
  const dndEnabled = filters.sort === "manual" && !hasFilters;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const findTaskGroup = (taskId: number) =>
    board?.groups.find((g) => g.tasks.some((t) => t.id === taskId));

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type: "task"; task: TaskCard }
      | { type: "group"; groupId: number }
      | undefined;
    if (data?.type === "task") dragOriginGroup.current = findTaskGroup(data.task.id)?.id ?? null;
  };

  // Live cross-section movement: as a task hovers over another section (or a
  // task in it), move it there in local state so the drop lands where you see it.
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;
    const activeData = active.data.current as { type?: string; task?: TaskCard } | undefined;
    const overData = over.data.current as { type?: string; task?: TaskCard; groupId?: number } | undefined;
    if (activeData?.type !== "task" || !activeData.task) return;
    const taskId = activeData.task.id;
    const sourceGroup = findTaskGroup(taskId);
    if (!sourceGroup) return;

    if (overData?.type === "task" && overData.task) {
      const overTaskId = overData.task.id;
      if (overTaskId === taskId) return;
      const targetGroup = findTaskGroup(overTaskId);
      if (!targetGroup || targetGroup.id === sourceGroup.id) return;
      const overIndex = targetGroup.tasks.findIndex((t) => t.id === overTaskId);
      moveTaskLocal(taskId, targetGroup.id, overIndex);
    } else if (overData?.type === "group" && overData.groupId != null) {
      if (overData.groupId === sourceGroup.id) return;
      const target = board.groups.find((g) => g.id === overData.groupId);
      moveTaskLocal(taskId, overData.groupId, target?.tasks.length ?? 0);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current as
      | { type: "task"; task: TaskCard }
      | { type: "group"; groupId: number }
      | undefined;

    if (activeData?.type === "group") {
      if (over) {
        const overData = over.data.current as { type?: string; groupId?: number } | undefined;
        if (overData?.type === "group" && overData.groupId != null && overData.groupId !== activeData.groupId) {
          moveGroupLocal(activeData.groupId, overData.groupId);
        }
      }
      persistGroupOrder();
      return;
    }

    if (activeData?.type !== "task") return;
    const taskId = activeData.task.id;
    const originGroupId = dragOriginGroup.current;
    dragOriginGroup.current = null;

    // Same-group reorder settles on drop (cross-group already happened on hover).
    if (over) {
      const overData = over.data.current as { type?: string; task?: TaskCard } | undefined;
      if (overData?.type === "task" && overData.task && overData.task.id !== taskId) {
        const targetGroup = findTaskGroup(overData.task.id);
        const currentGroup = findTaskGroup(taskId);
        if (targetGroup && currentGroup && targetGroup.id === currentGroup.id) {
          const overIndex = targetGroup.tasks.findIndex((t) => t.id === overData.task!.id);
          moveTaskLocal(taskId, targetGroup.id, overIndex);
        }
      }
    }

    const finalGroup = useBoardStore.getState().board?.groups.find((g) =>
      g.tasks.some((t) => t.id === taskId)
    );
    if (!finalGroup) return;
    const affected = new Set<number>([finalGroup.id]);
    if (originGroupId) affected.add(originGroupId);
    persistTaskOrder(Array.from(affected), taskId);
  };

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
  if (board.groups.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={22} />}
        title="This board is empty"
        message="Create your first group to start organizing tasks."
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
    );
  }
  if (hasFilters && totalVisible === 0) {
    return (
      <EmptyState
        icon={<SearchX size={22} />}
        title="No matching tasks"
        message="Try adjusting your search or clearing some filters."
      />
    );
  }

  const toggleTask = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (ids: number[], select: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    setSelected(new Set());
    setConfirmBulkDelete(false);
    await Promise.all(ids.map((id) => deleteTask(id)));
  };

  const bulkStatus = async (status: TaskCard["status"]) => {
    const ids = Array.from(selected);
    setSelected(new Set());
    await Promise.all(ids.map((id) => updateTask(id, { status })));
  };

  const bulkArchive = async () => {
    const ids = Array.from(selected);
    setSelected(new Set());
    await Promise.all(ids.map((id) => archiveTask(id)));
  };

  return (
    <div className="relative flex-1 overflow-y-auto nice-scroll  mt-6 rounded-2xl ">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={board.groups.map((g) => `tgroup-${g.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {board.groups.map((group) => (
            <TableGroup
              key={group.id}
              group={group}
              tasks={visibleTasks.get(group.id) ?? []}
              selected={selected}
              onToggleTask={toggleTask}
              onToggleGroup={toggleGroup}
              dndEnabled={dndEnabled}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 animate-pop-in items-center gap-3 rounded-2xl border border-edge bg-surface-raised py-2 pl-4 pr-2 shadow-pop">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-white">
            {selected.size}
          </span>
          <span className="text-[13px] font-medium text-ink">
            task{selected.size === 1 ? "" : "s"} selected
          </span>
          <Dropdown
            align="right"
            width={190}
            trigger={
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors duration-150 hover:bg-surface-sunken"
              >
                <CircleDot size={14} /> Status <ChevronDown size={13} className="text-ink-faint" />
              </button>
            }
          >
            {(close) => (
              <div className="flex flex-col gap-1">
                {STATUS_ORDER.map((s) => {
                  const meta = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        bulkStatus(s);
                        close();
                      }}
                      style={{ backgroundColor: `${meta.tint}22`, color: meta.tint }}
                      className="flex w-full cursor-pointer items-center justify-center rounded-full px-2.5 py-2 text-[12.5px] font-semibold transition-opacity duration-150 hover:opacity-80"
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </Dropdown>
          <button
            type="button"
            onClick={bulkArchive}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors duration-150 hover:bg-surface-sunken"
          >
            <Archive size={14} /> Archive
          </button>
          <button
            type="button"
            onClick={() => setConfirmBulkDelete(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[#E2445C] transition-colors duration-150 hover:bg-[#E2445C]/10"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
            className="cursor-pointer rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selected.size} task${selected.size === 1 ? "" : "s"}?`}
        message="The selected tasks and all of their updates, files and checklists will be permanently deleted."
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={bulkDelete}
      />
    </div>
  );
}
