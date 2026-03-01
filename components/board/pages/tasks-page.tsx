"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBoardContext } from "@/lib/client/board/board-context";
import { Task } from "@/lib/client/board/types";
import { Modal } from "@/components/ui/modal";

export function TasksPage() {
  const router = useRouter();
  const {
    loading,
    error,
    setError,
    submitting,
    users,
    sortedColumns,
    tasksByColumn,
    newTask,
    setNewTask,
    createTask,
    assignTask,
    editTask,
    deleteTask,
    setSelectedTaskId,
  } = useBoardContext();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  function updateNewTask(field: keyof typeof newTask, value: string) {
    setNewTask((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  const orderedTasks = sortedColumns.flatMap((column) => {
    const columnTasks = tasksByColumn.get(column.id) ?? [];

    return columnTasks.map((task) => ({
      task,
      columnName: column.name,
    }));
  });

  function openEditModal(task: Task) {
    setEditingTask(task);
    setEditingTitle(task.title);
    setEditingDescription(task.description);
  }

  function closeEditModal() {
    setEditingTask(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  function closeDeleteModal() {
    setDeletingTask(null);
  }

  if (loading) {
    return (
      <section className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
        Loading tasks...
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Tasks</h2>
        <p className="mt-1 text-sm text-slate-600">Create tasks and manage assignment from one place.</p>
      </header>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void createTask();
        }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Create task</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            placeholder="Task title"
            value={newTask.title}
            onChange={(event) => updateNewTask("title", event.target.value)}
          />
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            placeholder="Description"
            value={newTask.description}
            onChange={(event) => updateNewTask("description", event.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            value={newTask.columnId}
            onChange={(event) => updateNewTask("columnId", event.target.value)}
            disabled={sortedColumns.length === 0}
          >
            {sortedColumns.length === 0 ? <option value="">No columns</option> : null}
            {sortedColumns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            value={newTask.assigneeId}
            onChange={(event) => updateNewTask("assigneeId", event.target.value)}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting || sortedColumns.length === 0}
          className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {submitting ? "Creating..." : "Create task"}
        </button>

        {sortedColumns.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Create a column first in <Link href="/board/columns" className="text-brand-600 underline">Columns</Link>.
          </p>
        ) : null}
      </form>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">All tasks</h3>

        {orderedTasks.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No tasks yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {orderedTasks.map(({ task, columnName }) => (
              <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{columnName}</p>
                    <h4 className="text-base font-semibold text-slate-900">{task.title}</h4>
                    <p className="mt-1 text-sm text-slate-600">{task.description || "No description"}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      value={task.assigneeId ?? ""}
                      onChange={(event) => {
                        void assignTask(task.id, event.target.value || null);
                      }}
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                      onClick={() => {
                        openEditModal(task);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600"
                      onClick={() => {
                        setDeletingTask(task);
                      }}
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                      onClick={() => {
                        setError(null);
                        setSelectedTaskId(task.id);
                        router.push("/board/history");
                      }}
                    >
                      History
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={editingTask !== null}
        title="Edit task"
        description="Update title and description."
        onClose={closeEditModal}
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              onClick={closeEditModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              onClick={() => {
                if (!editingTask) {
                  return;
                }

                void editTask(editingTask.id, {
                  title: editingTitle,
                  description: editingDescription,
                });
                closeEditModal();
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
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
              value={editingDescription}
              onChange={(event) => setEditingDescription(event.target.value)}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={deletingTask !== null}
        title="Delete task"
        description="This action cannot be undone."
        onClose={closeDeleteModal}
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              onClick={closeDeleteModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => {
                if (!deletingTask) {
                  return;
                }

                void deleteTask(deletingTask.id);
                closeDeleteModal();
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Task: <span className="font-medium text-slate-900">{deletingTask?.title}</span>
        </p>
      </Modal>
    </section>
  );
}
