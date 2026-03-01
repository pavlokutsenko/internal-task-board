"use client";

import { FormEvent, useState } from "react";
import { useBoardContext } from "@/lib/client/board/board-context";
import { Modal } from "@/components/ui/modal";

export function ColumnsPage() {
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
        <h2 className="text-2xl font-semibold text-slate-900">Columns</h2>
        <p className="mt-1 text-sm text-slate-600">Create, rename, reorder, and delete board columns.</p>
      </header>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={onCreateColumn} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="block text-sm font-medium text-slate-700">
          New column name
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
              placeholder="Backlog"
              value={newColumnName}
              onChange={(event) => {
                setError(null);
                setNewColumnName(event.target.value);
              }}
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Create column
            </button>
          </div>
        </label>
      </form>

      <div className="space-y-3">
        {sortedColumns.map((column, index) => {
          const tasksCount = tasksByColumn.get(column.id)?.length ?? 0;

          return (
            <article
              key={column.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Position #{column.order + 1}</p>
                  <h3 className="text-lg font-semibold text-slate-900">{column.name}</h3>
                  <p className="text-sm text-slate-500">{tasksCount} tasks</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEditingColumnId(column.id);
                      setEditingName(column.name);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  >
                    Rename
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void moveColumn(column.id, column.order - 1);
                    }}
                    disabled={index === 0}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  >
                    Up
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void moveColumn(column.id, column.order + 1);
                    }}
                    disabled={index === sortedColumns.length - 1}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  >
                    Down
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeletingColumnId(column.id);
                    }}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

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
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              onClick={() => {
                setEditingColumnId(null);
                setEditingName("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
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
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
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
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              onClick={() => setDeletingColumnId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
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
