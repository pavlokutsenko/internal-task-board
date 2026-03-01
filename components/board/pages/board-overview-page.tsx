"use client";

import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BoardColumn } from "@/components/board/board-column";
import { TaskCard } from "@/components/board/task-card";
import { useBoardContext } from "@/lib/client/board/board-context";

export function BoardOverviewPage() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const router = useRouter();

  const {
    loading,
    error,
    setError,
    users,
    sortedColumns,
    tasksByColumn,
    selectedTaskId,
    setSelectedTaskId,
    assignTask,
    editTask,
    deleteTask,
    activeTask,
    activeColumn,
    onDragStart,
    onDragOver,
    onDragCancel,
    onDragEnd,
    renameColumn,
    deleteColumn,
  } = useBoardContext();

  const totalTasks = sortedColumns.reduce((count, column) => {
    return count + (tasksByColumn.get(column.id)?.length ?? 0);
  }, 0);

  if (loading) {
    return (
      <section className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
        Loading board...
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7e3ef] bg-gradient-to-r from-[#f7fbff] to-[#edf6ff] p-5">
        <div>
          <h2 className="text-2xl font-semibold text-[#132238]">Board</h2>
          <p className="mt-1 text-sm text-[#5f6f85]">Drag columns and tasks to reorder and move work.</p>
        </div>
        <div className="rounded-xl border border-[#d3e0ec] bg-white px-4 py-3 text-sm text-[#3e5773] shadow-[0_10px_24px_-18px_rgba(19,34,56,0.65)]">
          <p>
            {sortedColumns.length} columns · {totalTasks} tasks
          </p>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {sortedColumns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c9d9ea] bg-[#f7fbff] p-8 text-center text-sm text-[#566d88]">
          <p>No columns yet.</p>
          <Link className="mt-2 inline-block text-[#0a7574] underline" href="/board/columns">
            Open columns settings
          </Link>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext
            items={sortedColumns.map((column) => `column-${column.id}`)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
              {sortedColumns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn.get(column.id) ?? []}
                  users={users}
                  onAssign={assignTask}
                  onEdit={editTask}
                  onDeleteTask={deleteTask}
                  onSelect={(taskId) => {
                    setSelectedTaskId(taskId);
                    setError(null);
                    router.push("/board/history");
                  }}
                  onRename={renameColumn}
                  onDelete={deleteColumn}
                  selectedTaskId={selectedTaskId}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTask ? (
              <div className="w-72 opacity-95">
                <TaskCard
                  task={activeTask}
                  users={users}
                  onAssign={assignTask}
                  onEdit={editTask}
                  onDelete={deleteTask}
                  onSelect={setSelectedTaskId}
                  isSelected={false}
                />
              </div>
            ) : null}

            {activeColumn ? (
              <div className="w-72 rounded-xl border border-[#2f6ca4] bg-gradient-to-r from-[#d7efff] to-[#d8f7f3] p-3 shadow-[0_16px_28px_-16px_rgba(15,53,97,0.65)]">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#1a3552]">{activeColumn.name}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}
