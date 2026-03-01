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
};

export function TaskCard({
  task,
  users,
  onAssign,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
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
        className={`rounded-xl border bg-white p-3 shadow-[0_14px_24px_-18px_rgba(16,44,79,0.72)] ${
          isSelected ? "border-[#0f8f8d] ring-2 ring-[#d9f2f2]" : "border-[#d6e2ee]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#132238]">{task.title}</h3>
          <span className="rounded-md bg-[#eef6ff] px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-[#567495]">
            Move
          </span>
        </div>

        {task.description ? (
          <p className="mt-2 text-xs text-[#5d728c]">{task.description}</p>
        ) : (
          <p className="mt-2 text-xs text-[#8a9db2]">No description</p>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <label className="text-xs text-[#5a708a]">
            Assignee
            <select
              className="mt-1 w-full rounded-lg border border-[#ccd9e7] bg-white px-2 py-1 text-xs text-[#2e4664]"
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
              className="rounded-lg border border-[#c9d7e6] bg-[#f8fbff] px-2 py-1 text-xs text-[#48617f] hover:bg-[#eef6ff]"
              type="button"
              onClick={openEditModal}
            >
              Edit
            </button>
            <button
              className="rounded-lg border border-[#f2caca] bg-white px-2 py-1 text-xs text-[#9e3a3a] hover:bg-[#fff7f7]"
              type="button"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </button>
            <button
              className="rounded-lg border border-[#c9d7e6] bg-[#f8fbff] px-2 py-1 text-xs text-[#48617f] hover:bg-[#eef6ff]"
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
              className="rounded-xl border border-[#ccd9e7] px-3 py-2 text-sm text-[#3f5672] hover:bg-[#f7fbff]"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-[#0f8f8d] to-[#2666ab] px-3 py-2 text-sm font-medium text-white shadow-[0_12px_24px_-14px_rgba(15,143,141,0.85)] hover:translate-y-[-1px]"
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
              className="mt-1 w-full rounded-xl border border-[#ccd9e7] bg-[#fbfdff] px-3 py-2 text-sm outline-none ring-[#0f8f8d] focus:ring-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-[#ccd9e7] bg-[#fbfdff] px-3 py-2 text-sm outline-none ring-[#0f8f8d] focus:ring-2"
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
              className="rounded-xl border border-[#ccd9e7] px-3 py-2 text-sm text-[#3f5672] hover:bg-[#f7fbff]"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-[#b64b4b] px-3 py-2 text-sm font-medium text-white hover:bg-[#a43d3d]"
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
