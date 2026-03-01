import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Column, Task, User } from "@/lib/client/board/types";
import { TaskCard } from "@/components/board/task-card";
import { Modal } from "@/components/ui/modal";

type SortableTaskCardProps = {
  task: Task;
  users: User[];
  onAssign: (taskId: string, assigneeId: string | null) => Promise<void>;
  onEdit: (taskId: string, payload: { title: string; description: string }) => Promise<void>;
  onSelect: (taskId: string) => void;
  isSelected: boolean;
};

function SortableTaskCard({ task, users, onAssign, onEdit, onSelect, isSelected }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: {
      type: "task",
      taskId: task.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <TaskCard
        task={task}
        users={users}
        onAssign={onAssign}
        onEdit={onEdit}
        onSelect={onSelect}
        isSelected={isSelected}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

type BoardColumnProps = {
  column: Column;
  tasks: Task[];
  users: User[];
  onAssign: (taskId: string, assigneeId: string | null) => Promise<void>;
  onEdit: (taskId: string, payload: { title: string; description: string }) => Promise<void>;
  onSelect: (taskId: string) => void;
  onRename: (columnId: string, name: string) => Promise<void>;
  onDelete: (columnId: string) => Promise<void>;
  selectedTaskId: string | null;
};

export function BoardColumn({
  column,
  tasks,
  users,
  onAssign,
  onEdit,
  onSelect,
  onRename,
  onDelete,
  selectedTaskId,
}: BoardColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: `column-drop-${column.id}`,
  });

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nextName, setNextName] = useState(column.name);

  function openRenameModal() {
    setNextName(column.name);
    setRenameOpen(true);
  }

  return (
    <>
      <section
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.6 : 1,
        }}
        className="w-full rounded-xl border border-slate-200 bg-slate-100 p-3"
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{column.name}</h2>
            <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{tasks.length}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
              type="button"
              onClick={openRenameModal}
            >
              Rename
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
              type="button"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
              type="button"
              aria-label="Drag column"
              {...attributes}
              {...listeners}
            >
              Move
            </button>
          </div>
        </header>

        <SortableContext items={tasks.map((task) => `task-${task.id}`)} strategy={verticalListSortingStrategy}>
          <div
            ref={setDropNodeRef}
            className={`min-h-24 space-y-2 rounded-md p-1 transition ${
              isOver ? "bg-brand-50" : ""
            }`}
          >
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                users={users}
                onAssign={onAssign}
                onEdit={onEdit}
                onSelect={onSelect}
                isSelected={selectedTaskId === task.id}
              />
            ))}
            {tasks.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
                Drop tasks here
              </p>
            ) : null}
          </div>
        </SortableContext>
      </section>

      <Modal
        open={renameOpen}
        title="Rename column"
        description="Set a new name for this column."
        onClose={() => setRenameOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              onClick={() => {
                void onRename(column.id, nextName);
                setRenameOpen(false);
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
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            value={nextName}
            onChange={(event) => setNextName(event.target.value)}
          />
        </label>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete column"
        description={tasks.length > 0 ? "Move all tasks out before deleting this column." : "This action cannot be undone."}
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={tasks.length > 0}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => {
                void onDelete(column.id);
                setDeleteOpen(false);
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Column: <span className="font-medium text-slate-900">{column.name}</span>
        </p>
      </Modal>
    </>
  );
}
