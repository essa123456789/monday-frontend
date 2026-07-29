"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { ClipboardList, Plus, SearchX } from "lucide-react";
import { useBoardStore } from "@/store/boardStore";
import { GroupColumn, GroupColumnContent } from "./GroupColumn";
import { TaskCardContent } from "./TaskCard";
import { BoardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useVisibleTasks } from "@/lib/useVisibleTasks";
import type { Group, TaskCard } from "@/lib/types";

type DragItem = { type: "task"; task: TaskCard } | { type: "group"; group: Group };

export function BoardView() {
  const board = useBoardStore((s) => s.board);
  const boardLoading = useBoardStore((s) => s.boardLoading);
  const filters = useBoardStore((s) => s.filters);
  const moveTaskLocal = useBoardStore((s) => s.moveTaskLocal);
  const persistTaskOrder = useBoardStore((s) => s.persistTaskOrder);
  const moveGroupLocal = useBoardStore((s) => s.moveGroupLocal);
  const persistGroupOrder = useBoardStore((s) => s.persistGroupOrder);
  const addGroup = useBoardStore((s) => s.addGroup);

  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const dragOriginGroup = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const { map: visibleTasks, hasFilters, totalVisible } = useVisibleTasks();

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

  const dndEnabled = filters.sort === "manual";

  const findTaskGroup = (taskId: number): Group | undefined =>
    board.groups.find((g) => g.tasks.some((t) => t.id === taskId));

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragItem | undefined;
    if (!data) return;
    setActiveDrag(data);
    if (data.type === "task") {
      dragOriginGroup.current = findTaskGroup(data.task.id)?.id ?? null;
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as DragItem | undefined;
    const overData = over.data.current as DragItem | undefined;
    if (activeData?.type !== "task") return;

    const taskId = activeData.task.id;
    const sourceGroup = findTaskGroup(taskId);
    if (!sourceGroup) return;

    if (overData?.type === "task") {
      const overTaskId = overData.task.id;
      if (overTaskId === taskId) return;
      const targetGroup = findTaskGroup(overTaskId);
      if (!targetGroup || targetGroup.id === sourceGroup.id) return;
      const overIndex = targetGroup.tasks.findIndex((t) => t.id === overTaskId);
      moveTaskLocal(taskId, targetGroup.id, overIndex);
    } else if (overData?.type === "group") {
      const targetGroup = overData.group;
      if (targetGroup.id === sourceGroup.id) return;
      const current = board.groups.find((g) => g.id === targetGroup.id);
      moveTaskLocal(taskId, targetGroup.id, current?.tasks.length ?? 0);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current as DragItem | undefined;
    setActiveDrag(null);

    if (!activeData) return;

    if (activeData.type === "group") {
      if (over) {
        const overData = over.data.current as DragItem | undefined;
        if (overData?.type === "group" && overData.group.id !== activeData.group.id) {
          moveGroupLocal(activeData.group.id, overData.group.id);
        }
      }
      persistGroupOrder();
      return;
    }

    // Task drop
    const taskId = activeData.task.id;
    const originGroupId = dragOriginGroup.current;
    dragOriginGroup.current = null;

    if (over) {
      const overData = over.data.current as DragItem | undefined;
      if (overData?.type === "task" && overData.task.id !== taskId) {
        const targetGroup = findTaskGroup(overData.task.id);
        const currentGroup = findTaskGroup(taskId);
        if (targetGroup && currentGroup && targetGroup.id === currentGroup.id) {
          const overIndex = targetGroup.tasks.findIndex((t) => t.id === overData.task.id);
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

  return (
    <div className="relative flex-1 overflow-hidden">
      {hasFilters && totalVisible === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="No matching tasks"
          message="Try adjusting your search or clearing some filters."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={dndEnabled ? handleDragStart : undefined}
          onDragOver={dndEnabled ? handleDragOver : undefined}
          onDragEnd={dndEnabled ? handleDragEnd : undefined}
        >
          <div className="flex h-full items-start gap-4 overflow-x-auto overflow-y-hidden p-4 nice-scroll md:p-6">
            <SortableContext
              items={board.groups.map((g) => `group-${g.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {board.groups.map((group) => (
                <GroupColumn key={group.id} group={group} tasks={visibleTasks.get(group.id) ?? []} />
              ))}
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
            {activeDrag?.type === "task" && (
              <div className="w-[276px] sm:w-[296px]">
                <TaskCardContent task={activeDrag.task} dragging />
              </div>
            )}
            {activeDrag?.type === "group" && (
              <GroupColumnContent
                group={activeDrag.group}
                tasks={visibleTasks.get(activeDrag.group.id) ?? []}
                dragging
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
