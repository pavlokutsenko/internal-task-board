import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Task, User } from "@/lib/client/board/types";

type TaskCardProps = {
  task: Task;
  users: User[];
  onAssign: (taskId: string, assigneeId: string | null) => Promise<void>;
  onEdit: (taskId: string, payload: { title: string; description: string }) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onSelect: (taskId: string) => void;
  isSelected: boolean;
  dragAttributes?: any;
  dragListeners?: any;
};

export function TaskCard({
  task,
  users,
  onAssign,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
  dragAttributes,
  dragListeners,
}: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);

  function openEditModal() {
    setTitle(task.title);
    setDescription(task.description);
    setEditOpen(true);
  }

  return (
    <>
      <article
        className={`rounded-lg border bg-white p-3 shadow-sm ${
          isSelected ? "border-brand-500" : "border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{task.title}</h3>
          <button
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"
            type="button"
            aria-label="Drag task"
            {...dragAttributes}
            {...dragListeners}
          >
            Drag
          </button>
        </div>

        {task.description ? (
          <p className="mt-2 text-xs text-slate-600">{task.description}</p>
        ) : (
          <p className="mt-2 text-xs text-slate-400">No description</p>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <label className="text-xs text-slate-500">
            Assignee
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              value={task.assigneeId ?? ""}
              onChange={(event) => onAssign(task.id, event.target.value || null)}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"
              type="button"
              onClick={openEditModal}
            >
              Edit
            </button>
            <button
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
              type="button"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </button>
            <button
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"
              type="button"
              onClick={() => onSelect(task.id)}
            >
              History
            </button>
          </div>
        </div>
      </article>

      <Modal
        open={editOpen}
        title="Edit task"
        description="Update title and description."
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              onClick={() => {
                void onEdit(task.id, { title, description });
                setEditOpen(false);
              }}
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete task"
        description="This action cannot be undone."
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
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => {
                void onDelete(task.id);
                setDeleteOpen(false);
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Task: <span className="font-medium text-slate-900">{task.title}</span>
        </p>
      </Modal>
    </>
  );
}
