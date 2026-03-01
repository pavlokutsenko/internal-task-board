"use client";

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearAccessToken, getAccessToken } from "@/lib/client/auth";

type Column = {
  id: string;
  name: string;
  order: number;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  columnId: string;
  order: number;
  assigneeId: string | null;
  assignee: User | null;
  createdAt: string;
  updatedAt: string;
};

type TaskHistoryItem = {
  id: string;
  action: "moved" | "assigned" | "edited";
  fromValue: unknown;
  toValue: unknown;
  createdAt: string;
  user: User;
};

type BoardResponse = {
  tasks: Task[];
  users: User[];
};

function decodeTaskId(value: string) {
  if (!value.startsWith("task-")) {
    return null;
  }

  return value.slice(5);
}

function decodeColumnId(value: string) {
  if (!value.startsWith("column-")) {
    return null;
  }

  return value.slice(7);
}

function sortColumns(columns: Column[]) {
  return [...columns].sort((a, b) => a.order - b.order);
}

function buildTaskMap(columns: Column[], tasks: Task[]) {
  const map = new Map<string, Task[]>();

  for (const column of sortColumns(columns)) {
    map.set(column.id, []);
  }

  for (const task of [...tasks].sort((a, b) => a.order - b.order)) {
    const list = map.get(task.columnId) ?? [];
    list.push(task);
    map.set(task.columnId, list);
  }

  return map;
}

function normalizeTasks(columns: Column[], tasks: Task[]) {
  const map = buildTaskMap(columns, tasks);
  const normalized: Task[] = [];

  for (const column of sortColumns(columns)) {
    const columnTasks = map.get(column.id) ?? [];

    columnTasks.forEach((task, index) => {
      normalized.push({
        ...task,
        order: index,
      });
    });
  }

  return normalized;
}

function moveTaskInMemory(
  columns: Column[],
  tasks: Task[],
  taskId: string,
  toColumnId: string,
  requestedOrder: number,
) {
  const taskMap = buildTaskMap(columns, tasks);

  let movingTask: Task | null = null;
  let sourceColumnId: string | null = null;
  let sourceOrder = -1;

  for (const [columnId, columnTasks] of taskMap.entries()) {
    const index = columnTasks.findIndex((task) => task.id === taskId);

    if (index !== -1) {
      const [removed] = columnTasks.splice(index, 1);
      movingTask = { ...removed };
      sourceColumnId = columnId;
      sourceOrder = index;
      break;
    }
  }

  if (!movingTask || !sourceColumnId) {
    return tasks;
  }

  const destinationTasks = taskMap.get(toColumnId);

  if (!destinationTasks) {
    return tasks;
  }

  let destinationOrder = Math.max(0, Math.min(requestedOrder, destinationTasks.length));

  if (sourceColumnId === toColumnId && sourceOrder < destinationOrder) {
    destinationOrder -= 1;
  }

  movingTask.columnId = toColumnId;
  destinationTasks.splice(destinationOrder, 0, movingTask);

  const nextTasks: Task[] = [];

  for (const column of sortColumns(columns)) {
    const columnTasks = taskMap.get(column.id) ?? [];

    columnTasks.forEach((task, index) => {
      nextTasks.push({
        ...task,
        order: index,
      });
    });
  }

  return nextTasks;
}

function describeHistory(history: TaskHistoryItem) {
  if (history.action === "moved") {
    return "Task moved";
  }

  if (history.action === "assigned") {
    return "Assignee updated";
  }

  return "Task edited";
}

function SortableTaskCard({
  task,
  users,
  onAssign,
  onEdit,
  onSelect,
  isSelected,
}: {
  task: Task;
  users: User[];
  onAssign: (taskId: string, assigneeId: string | null) => Promise<void>;
  onEdit: (taskId: string) => Promise<void>;
  onSelect: (taskId: string) => void;
  isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `task-${task.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white p-3 shadow-sm ${
        isSelected ? "border-brand-500" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{task.title}</h3>
        <button
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag task"
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
            onClick={() => onEdit(task.id)}
          >
            Edit
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
  );
}

function BoardColumn({
  column,
  tasks,
  users,
  onAssign,
  onEdit,
  onSelect,
  selectedTaskId,
}: {
  column: Column;
  tasks: Task[];
  users: User[];
  onAssign: (taskId: string, assigneeId: string | null) => Promise<void>;
  onEdit: (taskId: string) => Promise<void>;
  onSelect: (taskId: string) => void;
  selectedTaskId: string | null;
}) {
  const droppableId = `column-${column.id}`;
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
  });

  return (
    <section
      ref={setNodeRef}
      className={`w-full rounded-xl border p-3 ${
        isOver ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-slate-100"
      }`}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{column.name}</h2>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{tasks.length}</span>
      </header>

      <SortableContext items={tasks.map((task) => `task-${task.id}`)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
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
        </div>
      </SortableContext>
    </section>
  );
}

export function BoardClient() {
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    columnId: "",
    assigneeId: "",
  });

  const tasksByColumn = useMemo(() => buildTaskMap(columns, tasks), [columns, tasks]);

  async function handleUnauthorized() {
    clearAccessToken();
    router.push("/login");
    router.refresh();
  }

  async function loadBoard() {
    setLoading(true);
    setError(null);

    const [columnsResponse, tasksResponse] = await Promise.all([
      apiFetch("/api/columns"),
      apiFetch("/api/tasks"),
    ]);

    if (columnsResponse.status === 401 || tasksResponse.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!columnsResponse.ok || !tasksResponse.ok) {
      setError("Failed to load board data.");
      setLoading(false);
      return;
    }

    const columnsPayload = (await columnsResponse.json()) as Column[];
    const tasksPayload = (await tasksResponse.json()) as BoardResponse;
    const sortedColumns = sortColumns(columnsPayload);

    setColumns(sortedColumns);
    setTasks(normalizeTasks(sortedColumns, tasksPayload.tasks));
    setUsers(tasksPayload.users);
    setNewTask((previous) => ({
      ...previous,
      columnId: previous.columnId || sortedColumns[0]?.id || "",
    }));
    setLoading(false);
  }

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    loadBoard().catch(() => {
      setError("Failed to load board data.");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTaskId) {
      setHistory([]);
      return;
    }

    const controller = new AbortController();

    async function loadHistory() {
      setLoadingHistory(true);

      try {
        const response = await apiFetch(`/api/tasks/${selectedTaskId}/history`, {
          signal: controller.signal,
        });

        if (response.status === 401) {
          await handleUnauthorized();
          return;
        }

        if (!response.ok) {
          setHistory([]);
          return;
        }

        const payload = (await response.json()) as { history: TaskHistoryItem[] };
        setHistory(payload.history);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory().catch(() => {
      setHistory([]);
      setLoadingHistory(false);
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId]);

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    clearAccessToken();
    router.push("/login");
    router.refresh();
  }

  async function createTask() {
    if (!newTask.title.trim() || !newTask.columnId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await apiFetch("/api/tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        columnId: newTask.columnId,
        assigneeId: newTask.assigneeId || null,
      }),
    });

    if (response.status === 401) {
      setSubmitting(false);
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError("Could not create task.");
      setSubmitting(false);
      return;
    }

    const createdTask = (await response.json()) as Task;

    setTasks((previous) => normalizeTasks(columns, [...previous, createdTask]));
    setNewTask((previous) => ({
      ...previous,
      title: "",
      description: "",
      assigneeId: "",
    }));
    setSubmitting(false);
  }

  async function assignTask(taskId: string, assigneeId: string | null) {
    const response = await apiFetch(`/api/tasks/${taskId}/assign`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ assigneeId }),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError("Could not update assignee.");
      return;
    }

    const updatedTask = (await response.json()) as Task;

    setTasks((previous) =>
      previous.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task)),
    );

    if (selectedTaskId === taskId) {
      setSelectedTaskId(taskId);
    }
  }

  async function editTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    const title = window.prompt("Task title", task.title);

    if (title === null) {
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const description = window.prompt("Task description", task.description) ?? "";

    const response = await apiFetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: title.trim(),
        description,
      }),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError("Could not edit task.");
      return;
    }

    const updatedTask = (await response.json()) as Task;

    setTasks((previous) =>
      previous.map((item) => (item.id === updatedTask.id ? { ...item, ...updatedTask } : item)),
    );

    if (selectedTaskId === taskId) {
      setSelectedTaskId(taskId);
    }
  }

  function onDragStart(event: DragStartEvent) {
    const taskId = decodeTaskId(String(event.active.id));

    if (taskId) {
      setActiveTaskId(taskId);
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const activeId = decodeTaskId(String(event.active.id));
    const overId = event.over ? String(event.over.id) : null;
    setActiveTaskId(null);

    if (!activeId || !overId) {
      return;
    }

    const overTaskId = decodeTaskId(overId);
    const overColumnId = decodeColumnId(overId);

    let destinationColumnId: string | null = null;
    let destinationOrder = 0;

    if (overTaskId) {
      const overTask = tasks.find((task) => task.id === overTaskId);

      if (!overTask) {
        return;
      }

      destinationColumnId = overTask.columnId;
      const destinationTasks = tasksByColumn.get(destinationColumnId) ?? [];
      destinationOrder = destinationTasks.findIndex((task) => task.id === overTaskId);
    } else if (overColumnId) {
      destinationColumnId = overColumnId;
      destinationOrder = (tasksByColumn.get(destinationColumnId) ?? []).length;
    }

    if (!destinationColumnId) {
      return;
    }

    const previousTasks = tasks;
    const nextTasks = moveTaskInMemory(columns, previousTasks, activeId, destinationColumnId, destinationOrder);

    setTasks(nextTasks);

    const movedTask = nextTasks.find((task) => task.id === activeId);
    const originalTask = previousTasks.find((task) => task.id === activeId);

    if (!movedTask) {
      return;
    }

    if (
      originalTask &&
      originalTask.columnId === movedTask.columnId &&
      originalTask.order === movedTask.order
    ) {
      return;
    }

    const response = await apiFetch(`/api/tasks/${activeId}/move`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        toColumnId: movedTask.columnId,
        toOrder: movedTask.order,
      }),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setTasks(previousTasks);
      setError("Could not move task.");
      return;
    }

    const updatedTask = (await response.json()) as Task;
    setTasks((current) =>
      normalizeTasks(
        columns,
        current.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task)),
      ),
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-600">
        Loading board...
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Internal Task Board</h1>
            <p className="text-sm text-slate-600">Single-board workflow with JWT auth.</p>
          </div>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            onClick={logout}
            type="button"
          >
            Logout
          </button>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Create Task</h2>

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Task title"
              value={newTask.title}
              onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
            />

            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Description"
              value={newTask.description}
              onChange={(event) => setNewTask((prev) => ({ ...prev, description: event.target.value }))}
            />

            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={newTask.columnId}
              onChange={(event) => setNewTask((prev) => ({ ...prev, columnId: event.target.value }))}
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={newTask.assigneeId}
              onChange={(event) => setNewTask((prev) => ({ ...prev, assigneeId: event.target.value }))}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              onClick={createTask}
              type="button"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create task"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
          <section>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <div className="grid gap-4 md:grid-cols-3">
                {columns.map((column) => (
                  <BoardColumn
                    key={column.id}
                    column={column}
                    tasks={tasksByColumn.get(column.id) ?? []}
                    users={users}
                    onAssign={assignTask}
                    onEdit={editTask}
                    onSelect={setSelectedTaskId}
                    selectedTaskId={selectedTaskId}
                  />
                ))}
              </div>
            </DndContext>
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Task History</h2>
            {!selectedTaskId ? (
              <p className="mt-3 text-sm text-slate-500">Select a task to view history.</p>
            ) : loadingHistory ? (
              <p className="mt-3 text-sm text-slate-500">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No history entries yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {history.map((item) => (
                  <li key={item.id} className="rounded-md border border-slate-200 p-2">
                    <p className="text-sm font-medium text-slate-800">{describeHistory(item)}</p>
                    <p className="text-xs text-slate-500">
                      {item.user.name} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        {activeTaskId ? <p className="text-xs text-slate-500">Dragging task...</p> : null}
      </div>
    </main>
  );
}
