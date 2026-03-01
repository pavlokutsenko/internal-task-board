"use client";

import { useEffect, useMemo } from "react";
import { useBoardContext } from "@/lib/client/board/board-context";
import { TaskHistoryItem } from "@/lib/client/board/types";

type HistoryRow = {
  label: string;
  from: string;
  to: string;
};

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function asNullableString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null) {
    return null;
  }

  return null;
}

function textValue(value: string | null | undefined, emptyLabel = "Empty") {
  if (value === null || value === undefined || value.trim() === "") {
    return emptyLabel;
  }

  return value;
}

function buildHistoryRows(
  entry: TaskHistoryItem,
  columnNameById: Map<string, string>,
  userNameById: Map<string, string>,
): HistoryRow[] {
  const fromRecord = asRecord(entry.fromValue);
  const toRecord = asRecord(entry.toValue);

  if (entry.action === "moved") {
    const fromColumnId = asNullableString(fromRecord.columnId);
    const toColumnId = asNullableString(toRecord.columnId);

    return [
      {
        label: "Column",
        from: fromColumnId ? columnNameById.get(fromColumnId) ?? "Unknown column" : "Unknown column",
        to: toColumnId ? columnNameById.get(toColumnId) ?? "Unknown column" : "Unknown column",
      },
    ];
  }

  if (entry.action === "assigned") {
    const fromAssigneeId = asNullableString(fromRecord.assigneeId);
    const toAssigneeId = asNullableString(toRecord.assigneeId);

    return [
      {
        label: "Assignee",
        from: fromAssigneeId ? userNameById.get(fromAssigneeId) ?? "Unknown user" : "Unassigned",
        to: toAssigneeId ? userNameById.get(toAssigneeId) ?? "Unknown user" : "Unassigned",
      },
    ];
  }

  const rows: HistoryRow[] = [];
  const fromTitle = asNullableString(fromRecord.title);
  const toTitle = asNullableString(toRecord.title);
  const fromDescription = asNullableString(fromRecord.description);
  const toDescription = asNullableString(toRecord.description);

  if (fromTitle !== toTitle) {
    rows.push({
      label: "Title",
      from: textValue(fromTitle),
      to: textValue(toTitle),
    });
  }

  if (fromDescription !== toDescription) {
    rows.push({
      label: "Description",
      from: textValue(fromDescription),
      to: textValue(toDescription),
    });
  }

  if (rows.length > 0) {
    return rows;
  }

  return [
    {
      label: "Details",
      from: "Updated",
      to: "Updated",
    },
  ];
}

function historyTitle(entry: TaskHistoryItem) {
  if (entry.action === "moved") {
    return "Moved between columns";
  }

  if (entry.action === "assigned") {
    return "Assignee changed";
  }

  return "Task content updated";
}

export function HistoryPage() {
  const {
    loading,
    error,
    loadingHistory,
    history,
    users,
    sortedColumns,
    tasksByColumn,
    selectedTaskId,
    setSelectedTaskId,
  } = useBoardContext();

  const columnNameById = useMemo(() => {
    return new Map(sortedColumns.map((column) => [column.id, column.name]));
  }, [sortedColumns]);

  const userNameById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user.name]));
  }, [users]);

  const tasksWithColumns = sortedColumns.flatMap((column) => {
    return (tasksByColumn.get(column.id) ?? []).map((task) => ({
      task,
      columnName: column.name,
    }));
  });

  const selectedTask = tasksWithColumns.find((entry) => entry.task.id === selectedTaskId) ?? null;

  useEffect(() => {
    if (!selectedTaskId && tasksWithColumns.length > 0) {
      setSelectedTaskId(tasksWithColumns[0].task.id);
    }
  }, [selectedTaskId, setSelectedTaskId, tasksWithColumns]);

  if (loading) {
    return (
      <section className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
        Loading history...
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-[#132238]">Task History</h2>
        <p className="mt-1 text-sm text-[#5f6f85]">Review all move, assign, and edit events per task.</p>
      </header>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#d7e3ef] bg-gradient-to-b from-[#f7fbff] to-[#f0f8ff] p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#35506f]">Select task</h3>
          <div className="mt-3 space-y-2">
            {tasksWithColumns.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#c9d9ea] bg-white px-3 py-4 text-sm text-[#607590]">
                No tasks available.
              </p>
            ) : (
              tasksWithColumns.map(({ task, columnName }) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selectedTaskId === task.id
                      ? "border-[#0f8f8d] bg-[#d9f2f2]"
                      : "border-[#d7e3ef] bg-white hover:border-[#c5d8eb]"
                  }`}
                >
                  <p className="text-sm font-medium text-[#132238]">{task.title}</p>
                  <p className="text-xs text-[#5f6f85]">{columnName}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-[#d7e3ef] bg-white p-4 shadow-[0_18px_32px_-24px_rgba(16,44,79,0.7)]">
          {!selectedTask ? (
            <p className="text-sm text-[#5f6f85]">Select a task to view history.</p>
          ) : loadingHistory ? (
            <p className="text-sm text-[#5f6f85]">Loading history...</p>
          ) : history.length === 0 ? (
            <>
              <h3 className="text-lg font-semibold text-[#132238]">{selectedTask.task.title}</h3>
              <p className="mt-2 text-sm text-[#5f6f85]">No history entries yet.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-[#132238]">{selectedTask.task.title}</h3>
              <p className="mb-4 mt-1 text-sm text-[#5f6f85]">{selectedTask.columnName}</p>

              <div className="space-y-3">
                {history.map((entry) => {
                  const rows = buildHistoryRows(entry, columnNameById, userNameById);

                  return (
                    <article key={entry.id} className="rounded-xl border border-[#d7e3ef] bg-[#f7fbff] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#132238]">{historyTitle(entry)}</p>
                        <p className="text-xs text-[#5f6f85]">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>

                      <p className="mt-1 text-xs text-[#546983]">Changed by {entry.user.name}</p>

                      <div className="mt-3 space-y-2">
                        {rows.map((row, index) => (
                          <div
                            key={`${entry.id}-${row.label}-${index}`}
                            className="rounded-lg border border-[#d7e3ef] bg-white px-3 py-2"
                          >
                            <p className="text-xs font-medium uppercase tracking-wide text-[#647a95]">{row.label}</p>
                            <div className="mt-1 grid gap-2 text-sm md:grid-cols-[1fr,auto,1fr]">
                              <p className="rounded border border-[#d4e1ee] bg-[#f6faff] px-2 py-1 text-[#4d6480]">
                                {row.from}
                              </p>
                              <p className="self-center text-center text-[#9ab0c7]">→</p>
                              <p className="rounded border border-[#d4e1ee] bg-[#f6faff] px-2 py-1 text-[#132238]">
                                {row.to}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
