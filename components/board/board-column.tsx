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
  onDelete: (taskId: string) => Promise<void>;
  onSelect: (taskId: string) => void;
  isSelected: boolean;
};

function SortableTaskCard({
  task,
  users,
  onAssign,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
}: SortableTaskCardProps) {
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
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        users={users}
        onAssign={onAssign}
        onEdit={onEdit}
        onDelete={onDelete}
        onSelect={onSelect}
        isSelected={isSelected}
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
  onDeleteTask: (taskId: string) => Promise<void>;
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
  onDeleteTask,
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
        className="w-full rounded-2xl border border-[#d7e3ef] bg-gradient-to-b from-[#f7fbff] to-[#f2f8ff] p-3 shadow-[0_18px_36px_-28px_rgba(16,44,79,0.68)]"
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#2a3f59]">{column.name}</h2>
            <span className="rounded-full border border-[#d5e2ee] bg-white px-2 py-1 text-xs text-[#4e6580]">
              {tasks.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="rounded-lg border border-[#d0dcea] bg-white px-2 py-1 text-xs text-[#4a627d] hover:border-[#b8cde4] hover:bg-[#f8fbff]"
              type="button"
              onClick={openRenameModal}
            >
              Rename
            </button>
            <button
              className="rounded-lg border border-[#f0c4c4] bg-white px-2 py-1 text-xs text-[#9b3d3d] hover:bg-[#fff7f7]"
              type="button"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </button>
            <button
              className="rounded-lg border border-[#d0dcea] bg-white px-2 py-1 text-xs text-[#4a627d] hover:border-[#b8cde4] hover:bg-[#f8fbff]"
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
              isOver ? "bg-[#d9f2f2]" : ""
            }`}
          >
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                users={users}
                onAssign={onAssign}
                onEdit={onEdit}
                onDelete={onDeleteTask}
                onSelect={onSelect}
                isSelected={selectedTaskId === task.id}
              />
            ))}
            {tasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#c9d9ea] bg-white px-3 py-4 text-center text-xs text-[#607590]">
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
              className="rounded-xl border border-[#ccd9e7] px-3 py-2 text-sm text-[#3f5672] hover:bg-[#f7fbff]"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-[#0f8f8d] to-[#2666ab] px-3 py-2 text-sm font-medium text-white shadow-[0_12px_24px_-14px_rgba(15,143,141,0.85)] hover:translate-y-[-1px]"
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
            className="mt-1 w-full rounded-xl border border-[#ccd9e7] bg-[#fbfdff] px-3 py-2 text-sm outline-none ring-[#0f8f8d] focus:ring-2"
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
              className="rounded-xl border border-[#ccd9e7] px-3 py-2 text-sm text-[#3f5672] hover:bg-[#f7fbff]"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={tasks.length > 0}
              className="rounded-xl bg-[#b64b4b] px-3 py-2 text-sm font-medium text-white hover:bg-[#a43d3d]"
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
