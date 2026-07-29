"use client";

import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { useBoardStore } from "@/store/boardStore";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskCard } from "./TaskCard";
import { cn, GROUP_COLORS } from "@/lib/utils";
import type { Group, TaskCard as TaskCardType } from "@/lib/types";

export function GroupColumnContent({
  group,
  tasks,
  dragHandleProps,
  dragging,
}: {
  group: Group;
  tasks: TaskCardType[];
  dragHandleProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  const updateGroup = useBoardStore((s) => s.updateGroup);
  const deleteGroup = useBoardStore((s) => s.deleteGroup);
  const addTask = useBoardStore((s) => s.addTask);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

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

  return (
    <div
      className={cn(
        "flex max-h-full w-[300px] shrink-0 flex-col rounded-2xl bg-surface transition-shadow duration-200 sm:w-[320px]",
        dragging && "shadow-card-hover ring-2 ring-primary/40"
      )}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-1.5 rounded-t-2xl border-b border-edge bg-surface px-2.5 py-2.5">
        <button
          type="button"
          {...dragHandleProps}
          aria-label={`Drag group ${group.title}`}
          className="cursor-grab touch-none rounded p-0.5 text-ink-faint transition-colors duration-150 hover:text-ink active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </button>
        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: group.color }} />
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
            className="min-w-0 flex-1 rounded-md border border-primary bg-surface-raised px-1.5 py-0.5 text-[14px] font-bold text-ink outline-none"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => {
              setRenameValue(group.title);
              setRenaming(true);
            }}
            className="min-w-0 flex-1 cursor-text truncate text-left text-[14px] font-bold text-ink"
            title="Double-click to rename"
            style={{ color: group.color }}
          >
            {group.title}
          </button>
        )}
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
          {tasks.length}
        </span>
        <Dropdown
          align="right"
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

      {/* Tasks */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5 nice-scroll" style={{ minHeight: 60 }}>
        <SortableContext items={tasks.map((t) => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-edge px-3 py-6 text-center text-[12px] text-ink-faint">
            No tasks here — drag one in or add below
          </div>
        )}
      </div>

      {/* Add task composer */}
      <div className="p-2.5 pt-0">
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
            className="w-full rounded-lg border border-primary bg-surface-raised px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingTask(true)}
            className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <Plus size={15} /> Add task
          </button>
        )}
      </div>

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
    </div>
  );
}

export function GroupColumn({ group, tasks }: { group: Group; tasks: TaskCardType[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `group-${group.id}`,
    data: { type: "group", group },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("max-h-full", isDragging && "opacity-40")}
    >
      <GroupColumnContent group={group} tasks={tasks} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}
