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
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Board</h2>
          <p className="mt-1 text-sm text-slate-600">Drag columns and tasks to reorder and move work.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p>
            {sortedColumns.length} columns · {totalTasks} tasks
          </p>
        </div>
      </header>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {sortedColumns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          <p>No columns yet.</p>
          <Link className="mt-2 inline-block text-brand-600 underline" href="/board/columns">
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
                  onSelect={setSelectedTaskId}
                  isSelected={false}
                />
              </div>
            ) : null}

            {activeColumn ? (
              <div className="w-72 rounded-xl border border-brand-500 bg-white p-3 shadow-lg">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">{activeColumn.name}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}
