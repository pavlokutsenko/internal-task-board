"use client";

import { DragCancelEvent, DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, clearAccessToken } from "@/lib/client/auth";
import {
  BoardResponse,
  Column,
  DragSnapshot,
  NewTaskForm,
  Task,
  TaskHistoryItem,
  User,
} from "@/lib/client/board/types";
import {
  buildTaskMap,
  cloneColumns,
  cloneTasks,
  decodeColumnDropId,
  decodeColumnId,
  decodeTaskId,
  isSameColumnLayout,
  isSameTaskLayout,
  moveTaskInMemory,
  normalizeTasks,
  reorderColumnsInMemory,
  sortColumns,
} from "@/lib/client/board/utils";

export function useBoard() {
  const router = useRouter();

  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [newTask, setNewTask] = useState<NewTaskForm>({
    title: "",
    description: "",
    columnId: "",
    assigneeId: "",
  });

  const dragSnapshotRef = useRef<DragSnapshot | null>(null);

  const sortedColumns = useMemo(() => sortColumns(columns), [columns]);
  const tasksByColumn = useMemo(() => buildTaskMap(sortedColumns, tasks), [sortedColumns, tasks]);

  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) ?? null : null;
  const activeColumn = activeColumnId
    ? sortedColumns.find((column) => column.id === activeColumnId) ?? null
    : null;

  async function responseError(response: Response, fallback: string) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    return payload?.error ?? fallback;
  }

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
    const nextColumns = sortColumns(columnsPayload);

    setColumns(nextColumns);
    setTasks(normalizeTasks(nextColumns, tasksPayload.tasks));
    setUsers(tasksPayload.users);
    setLoading(false);
  }

  useEffect(() => {
    setNewTask((previous) => {
      if (previous.columnId && sortedColumns.some((column) => column.id === previous.columnId)) {
        return previous;
      }

      const nextColumnId = sortedColumns[0]?.id ?? "";

      if (nextColumnId === previous.columnId) {
        return previous;
      }

      return {
        ...previous,
        columnId: nextColumnId,
      };
    });
  }, [sortedColumns]);

  useEffect(() => {
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

  async function createColumn() {
    const name = newColumnName.trim();

    if (!name) {
      return;
    }

    setError(null);

    const response = await apiFetch("/api/columns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError(await responseError(response, "Could not create column."));
      return;
    }

    const createdColumn = (await response.json()) as Column;

    setColumns((previous) => sortColumns([...previous, createdColumn]));
    setNewColumnName("");
  }

  async function renameColumn(columnId: string, providedName: string) {
    const column = columns.find((item) => item.id === columnId);

    if (!column) {
      return;
    }

    const normalizedName = providedName.trim();

    if (!normalizedName) {
      setError("Column name is required.");
      return;
    }

    if (normalizedName === column.name) {
      return;
    }

    setError(null);

    const response = await apiFetch(`/api/columns/${columnId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: normalizedName,
      }),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError(await responseError(response, "Could not rename column."));
      return;
    }

    const updated = (await response.json()) as Column;

    setColumns((previous) =>
      sortColumns(previous.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))),
    );
  }

  async function moveColumn(columnId: string, toOrder: number) {
    const column = columns.find((item) => item.id === columnId);

    if (!column) {
      return;
    }

    const normalizedOrder = Math.max(0, Math.min(toOrder, columns.length - 1));

    if (normalizedOrder === column.order) {
      return;
    }

    setError(null);

    const response = await apiFetch(`/api/columns/${columnId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        order: normalizedOrder,
      }),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError(await responseError(response, "Could not reorder column."));
      return;
    }

    const updated = (await response.json()) as Column;

    setColumns((previous) =>
      sortColumns(previous.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))),
    );
  }

  async function deleteColumn(columnId: string) {
    const columnTasks = tasksByColumn.get(columnId) ?? [];

    if (columnTasks.length > 0) {
      setError("Move tasks out of this column before deleting it.");
      return;
    }

    const response = await apiFetch(`/api/columns/${columnId}`, {
      method: "DELETE",
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError(await responseError(response, "Could not delete column."));
      return;
    }

    const nextColumns = sortColumns(
      columns
        .filter((column) => column.id !== columnId)
        .map((column, index) => ({
          ...column,
          order: index,
        })),
    );

    setColumns(nextColumns);
    setTasks((previous) => normalizeTasks(nextColumns, previous.filter((task) => task.columnId !== columnId)));
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
      setError(await responseError(response, "Could not create task."));
      setSubmitting(false);
      return;
    }

    const createdTask = (await response.json()) as Task;

    setTasks((previous) => normalizeTasks(sortedColumns, [...previous, createdTask]));
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
      setError(await responseError(response, "Could not update assignee."));
      return;
    }

    const updatedTask = (await response.json()) as Task;

    setTasks((previous) =>
      previous.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task)),
    );
  }

  async function editTask(taskId: string, payload: { title: string; description: string }) {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    const nextTitle = payload.title.trim();
    const nextDescription = payload.description;

    if (!nextTitle) {
      setError("Title is required.");
      return;
    }

    if (nextTitle === task.title && nextDescription === task.description) {
      return;
    }

    setError(null);

    const response = await apiFetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: nextTitle,
        description: nextDescription,
      }),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError(await responseError(response, "Could not edit task."));
      return;
    }

    const updatedTask = (await response.json()) as Task;

    setTasks((previous) =>
      previous.map((item) => (item.id === updatedTask.id ? { ...item, ...updatedTask } : item)),
    );
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    setError(null);

    const response = await apiFetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setError(await responseError(response, "Could not delete task."));
      return;
    }

    setTasks((previous) => normalizeTasks(sortedColumns, previous.filter((item) => item.id !== taskId)));

    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
      setHistory([]);
    }
  }

  function onDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    const taskId = decodeTaskId(activeId);
    const columnId = decodeColumnId(activeId);

    dragSnapshotRef.current = {
      tasks: cloneTasks(tasks),
      columns: cloneColumns(columns),
    };

    if (taskId) {
      setActiveTaskId(taskId);
    }

    if (columnId) {
      setActiveColumnId(columnId);
    }
  }

  function onDragOver(event: DragOverEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (!overId) {
      return;
    }

    const activeTaskIdValue = decodeTaskId(activeId);

    if (activeTaskIdValue) {
      const overTask = decodeTaskId(overId);
      const overColumnDrop = decodeColumnDropId(overId);
      const overColumn = decodeColumnId(overId);

      setTasks((previous) => {
        let destinationColumnId: string | null = null;
        let destinationOrder = 0;

        if (overTask) {
          const overTaskEntity = previous.find((task) => task.id === overTask);

          if (!overTaskEntity) {
            return previous;
          }

          destinationColumnId = overTaskEntity.columnId;
          destinationOrder = overTaskEntity.order;
        } else if (overColumnDrop || overColumn) {
          destinationColumnId = overColumnDrop ?? overColumn;
          destinationOrder = previous.filter((task) => task.columnId === destinationColumnId).length;
        }

        if (!destinationColumnId) {
          return previous;
        }

        const next = moveTaskInMemory(sortedColumns, previous, activeTaskIdValue, destinationColumnId, destinationOrder);

        return isSameTaskLayout(previous, next) ? previous : next;
      });

      return;
    }

    const activeColumn = decodeColumnId(activeId);
    const overColumn = decodeColumnId(overId);

    if (activeColumn && overColumn && activeColumn !== overColumn) {
      setColumns((previous) => {
        const next = reorderColumnsInMemory(previous, activeColumn, overColumn);
        return isSameColumnLayout(previous, next) ? previous : next;
      });
    }
  }

  function onDragCancel(_event: DragCancelEvent) {
    if (dragSnapshotRef.current) {
      setTasks(dragSnapshotRef.current.tasks);
      setColumns(dragSnapshotRef.current.columns);
    }

    setActiveTaskId(null);
    setActiveColumnId(null);
    dragSnapshotRef.current = null;
  }

  async function onDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    const taskId = decodeTaskId(activeId);
    const columnId = decodeColumnId(activeId);
    const snapshot = dragSnapshotRef.current;

    setActiveTaskId(null);
    setActiveColumnId(null);
    dragSnapshotRef.current = null;

    if (taskId) {
      if (!overId) {
        if (snapshot) {
          setTasks(snapshot.tasks);
        }
        return;
      }

      const movedTask = tasks.find((task) => task.id === taskId);
      const originalTask = snapshot?.tasks.find((task) => task.id === taskId);

      if (!movedTask || !originalTask) {
        return;
      }

      if (movedTask.columnId === originalTask.columnId && movedTask.order === originalTask.order) {
        return;
      }

      const response = await apiFetch(`/api/tasks/${taskId}/move`, {
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
        if (snapshot) {
          setTasks(snapshot.tasks);
        }
        setError(await responseError(response, "Could not move task."));
        return;
      }

      const updatedTask = (await response.json()) as Task;

      setTasks((current) =>
        normalizeTasks(
          sortedColumns,
          current.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task)),
        ),
      );

      return;
    }

    if (columnId) {
      const overColumnId = overId ? decodeColumnId(overId) : null;

      if (!overColumnId) {
        if (snapshot) {
          setColumns(snapshot.columns);
        }
        return;
      }

      const movedColumn = columns.find((column) => column.id === columnId);
      const originalColumn = snapshot?.columns.find((column) => column.id === columnId);

      if (!movedColumn || !originalColumn || movedColumn.order === originalColumn.order) {
        return;
      }

      const response = await apiFetch(`/api/columns/${columnId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          order: movedColumn.order,
        }),
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        if (snapshot) {
          setColumns(snapshot.columns);
        }
        setError(await responseError(response, "Could not reorder columns."));
        return;
      }

      const updated = (await response.json()) as Column;

      setColumns((previous) =>
        sortColumns(previous.map((column) => (column.id === updated.id ? { ...column, ...updated } : column))),
      );
    }
  }

  return {
    loading,
    error,
    setError,
    submitting,
    users,
    history,
    loadingHistory,
    selectedTaskId,
    setSelectedTaskId,
    newColumnName,
    setNewColumnName,
    newTask,
    setNewTask,
    columns,
    sortedColumns,
    tasks,
    tasksByColumn,
    activeTask,
    activeColumn,
    logout,
    createColumn,
    renameColumn,
    moveColumn,
    deleteColumn,
    createTask,
    assignTask,
    editTask,
    deleteTask,
    onDragStart,
    onDragOver,
    onDragCancel,
    onDragEnd,
  };
}
