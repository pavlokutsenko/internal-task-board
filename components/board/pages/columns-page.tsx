"use client";

import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FormEvent, useState } from "react";
import { useBoardContext } from "@/lib/client/board/board-context";
import { Column } from "@/lib/client/board/types";
import { Modal } from "@/components/ui/modal";

type SortableColumnItemProps = {
  column: Column;
  tasksCount: number;
  onOpenRename: (columnId: string, name: string) => void;
  onOpenDelete: (columnId: string) => void;
};

function SortableColumnItem({ column, tasksCount, onOpenRename, onOpenDelete }: SortableColumnItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
      }}
      className="cursor-grab rounded-2xl border border-[#d7e3ef] bg-white p-4 shadow-[0_18px_32px_-24px_rgba(16,44,79,0.7)] active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6c82a0]">Position #{column.order + 1}</p>
          <h3 className="text-lg font-semibold text-[#132238]">{column.name}</h3>
          <p className="text-sm text-[#5f6f85]">{tasksCount} tasks</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenRename(column.id, column.name);
            }}
            className="rounded-xl border border-[#ccd9e7] px-3 py-2 text-xs text-[#3f5672] hover:bg-[#f7fbff]"
          >
            Rename
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDelete(column.id);
            }}
            className="rounded-xl border border-[#f2caca] px-3 py-2 text-xs text-[#9e3a3a] hover:bg-[#fff7f7]"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export function ColumnsPage() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const {
    loading,
    error,
    setError,
    sortedColumns,
    tasksByColumn,
    newColumnName,
    setNewColumnName,
    createColumn,
    renameColumn,
    moveColumn,
    deleteColumn,
  } = useBoardContext();

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);

  async function onCreateColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createColumn();
  }

  async function onSaveRename() {
    if (!editingColumnId) {
      return;
    }

    await renameColumn(editingColumnId, editingName);
    setEditingColumnId(null);
    setEditingName("");
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) {
      return;
    }

    const activeIndex = sortedColumns.findIndex((column) => column.id === activeId);
    const overIndex = sortedColumns.findIndex((column) => column.id === overId);

    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
      return;
    }

    void moveColumn(activeId, overIndex);
  }

  if (loading) {
    return (
      <section className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
        Loading columns...
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-[#132238]">Columns</h2>
        <p className="mt-1 text-sm text-[#5f6f85]">Create, rename, reorder, and delete board columns.</p>
      </header>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form
        onSubmit={onCreateColumn}
        className="rounded-2xl border border-[#d7e3ef] bg-gradient-to-r from-[#f7fbff] to-[#f0f8ff] p-5"
      >
        <label className="block text-sm font-medium text-[#324d6c]">
          New column name
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded-xl border border-[#ccd9e7] bg-white px-3 py-2 text-sm text-[#132238] outline-none ring-[#0f8f8d] focus:ring-2"
              placeholder="Backlog"
              value={newColumnName}
              onChange={(event) => {
                setError(null);
                setNewColumnName(event.target.value);
              }}
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#0f8f8d] to-[#2666ab] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_-15px_rgba(15,143,141,0.88)] hover:translate-y-[-1px]"
            >
              Create column
            </button>
          </div>
        </label>
      </form>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sortedColumns.map((column) => column.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sortedColumns.map((column) => {
              const tasksCount = tasksByColumn.get(column.id)?.length ?? 0;

              return (
                <SortableColumnItem
                  key={column.id}
                  column={column}
                  tasksCount={tasksCount}
                  onOpenRename={(columnId, name) => {
                    setError(null);
                    setEditingColumnId(columnId);
                    setEditingName(name);
                  }}
                  onOpenDelete={(columnId) => {
                    setDeletingColumnId(columnId);
                  }}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <Modal
        open={editingColumnId !== null}
        title="Rename column"
        description="Set a new name for the selected column."
        onClose={() => {
          setEditingColumnId(null);
          setEditingName("");
        }}
        footer={
          <>
            <button
              type="button"
              className="rounded-xl border border-[#ccd9e7] px-3 py-2 text-sm text-[#3f5672] hover:bg-[#f7fbff]"
              onClick={() => {
                setEditingColumnId(null);
                setEditingName("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-[#0f8f8d] to-[#2666ab] px-3 py-2 text-sm font-medium text-white shadow-[0_12px_24px_-14px_rgba(15,143,141,0.85)] hover:translate-y-[-1px]"
              onClick={() => {
                void onSaveRename();
              }}
            >
              Save
            </button>
          </>
        }
      >
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            className="mt-1 w-full rounded-xl border border-[#ccd9e7] bg-[#fbfdff] px-3 py-2 text-sm outline-none ring-[#0f8f8d] focus:ring-2"
            value={editingName}
            onChange={(event) => setEditingName(event.target.value)}
          />
        </label>
      </Modal>

      <Modal
        open={deletingColumnId !== null}
        title="Delete column"
        description="This action cannot be undone."
        onClose={() => setDeletingColumnId(null)}
        footer={
          <>
            <button
              type="button"
              className="rounded-xl border border-[#ccd9e7] px-3 py-2 text-sm text-[#3f5672] hover:bg-[#f7fbff]"
              onClick={() => setDeletingColumnId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-[#b64b4b] px-3 py-2 text-sm font-medium text-white hover:bg-[#a43d3d]"
              onClick={() => {
                if (!deletingColumnId) {
                  return;
                }

                void deleteColumn(deletingColumnId);
                setDeletingColumnId(null);
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Column will be deleted only if it has no tasks.
        </p>
      </Modal>
    </section>
  );
}
