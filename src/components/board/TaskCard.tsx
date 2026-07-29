"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, CheckSquare, ListTree, MessageCircle, Paperclip } from "lucide-react";
import { useBoardStore } from "@/store/boardStore";
import { AvatarStack } from "@/components/ui/Avatar";
import { PriorityBadge, StatusPill } from "@/components/ui/Badges";
import { cn, dueDateTone, formatDueDate } from "@/lib/utils";
import type { TaskCard as TaskCardType } from "@/lib/types";

export function TaskCardContent({ task, dragging }: { task: TaskCardType; dragging?: boolean }) {
  const tone = dueDateTone(task.due_date, task.status);
  return (
    <div
      className={cn(
        "group/card cursor-pointer rounded-2xl border border-edge bg-surface-raised p-3 shadow-card transition-shadow duration-200 hover:shadow-card-hover",
        dragging && "rotate-2 shadow-card-hover ring-2 ring-primary/40"
      )}
    >
      {task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.map((l) => (
            <span
              key={l.id}
              className="inline-flex h-[18px] items-center rounded-full px-2 text-[10.5px] font-semibold text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      <p className="text-[13.5px] font-semibold leading-snug text-ink">{task.title}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusPill status={task.status} />
        <PriorityBadge priority={task.priority} />
        {task.due_date && (
          <span
            className={cn(
              "inline-flex h-[22px] items-center gap-1 rounded-md px-1.5 text-[11px] font-medium",
              tone === "overdue" && "bg-[#E2445C]/12 text-[#E2445C]",
              tone === "soon" && "bg-[#F59E0B]/15 text-[#B97B1E] dark:text-[#F59E0B]",
              tone === "normal" && "bg-surface-sunken text-ink-muted"
            )}
          >
            <CalendarDays size={11} strokeWidth={2.5} />
            {formatDueDate(task.due_date)}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-ink-faint">
          {task.comment_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium">
              <MessageCircle size={13} /> {task.comment_count}
            </span>
          )}
          {task.attachment_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium">
              <Paperclip size={13} /> {task.attachment_count}
            </span>
          )}
          {task.checklist_total > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-medium",
                task.checklist_done === task.checklist_total && "text-[#10B981]"
              )}
            >
              <CheckSquare size={13} /> {task.checklist_done}/{task.checklist_total}
            </span>
          )}
          {task.subitem_count > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-medium",
                task.subitem_done === task.subitem_count && "text-[#7CA83B]"
              )}
            >
              <ListTree size={13} /> {task.subitem_done}/{task.subitem_count}
            </span>
          )}
        </div>
        <AvatarStack members={task.assignees} size={24} />
      </div>

      {task.checklist_total > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-[#10B981] transition-[width] duration-300"
            style={{ width: `${(task.checklist_done / task.checklist_total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export const TaskCard = memo(function TaskCard({ task }: { task: TaskCardType }) {
  const openTask = useBoardStore((s) => s.openTask);
  const sortActive = useBoardStore((s) => s.filters.sort !== "manual");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
    disabled: sortActive,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      className={cn("touch-manipulation", isDragging && "opacity-40")}
    >
      <TaskCardContent task={task} />
    </div>
  );
});
