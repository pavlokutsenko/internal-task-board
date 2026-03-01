import { arrayMove } from "@dnd-kit/sortable";
import { Column, Task, TaskHistoryItem } from "@/lib/client/board/types";

export function decodeTaskId(value: string) {
  if (!value.startsWith("task-")) {
    return null;
  }

  return value.slice(5);
}

export function decodeColumnId(value: string) {
  if (!value.startsWith("column-")) {
    return null;
  }

  return value.slice(7);
}

export function decodeColumnDropId(value: string) {
  if (!value.startsWith("column-drop-")) {
    return null;
  }

  return value.slice(12);
}

export function sortColumns(columns: Column[]) {
  return [...columns].sort((a, b) => a.order - b.order);
}

export function buildTaskMap(columns: Column[], tasks: Task[]) {
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

export function normalizeTasks(columns: Column[], tasks: Task[]) {
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

export function moveTaskInMemory(
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

export function reorderColumnsInMemory(columns: Column[], activeColumnId: string, overColumnId: string) {
  const sorted = sortColumns(columns);
  const fromIndex = sorted.findIndex((column) => column.id === activeColumnId);
  const toIndex = sorted.findIndex((column) => column.id === overColumnId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return columns;
  }

  return arrayMove(sorted, fromIndex, toIndex).map((column, index) => ({
    ...column,
    order: index,
  }));
}

export function isSameTaskLayout(previous: Task[], next: Task[]) {
  if (previous.length !== next.length) {
    return false;
  }

  const previousById = new Map(previous.map((task) => [task.id, task]));

  for (const task of next) {
    const prev = previousById.get(task.id);

    if (!prev) {
      return false;
    }

    if (prev.columnId !== task.columnId || prev.order !== task.order) {
      return false;
    }
  }

  return true;
}

export function isSameColumnLayout(previous: Column[], next: Column[]) {
  if (previous.length !== next.length) {
    return false;
  }

  const previousById = new Map(previous.map((column) => [column.id, column]));

  for (const column of next) {
    const prev = previousById.get(column.id);

    if (!prev) {
      return false;
    }

    if (prev.order !== column.order || prev.name !== column.name) {
      return false;
    }
  }

  return true;
}

export function cloneTasks(tasks: Task[]) {
  return tasks.map((task) => ({
    ...task,
    assignee: task.assignee ? { ...task.assignee } : null,
  }));
}

export function cloneColumns(columns: Column[]) {
  return columns.map((column) => ({ ...column }));
}

export function describeHistory(history: TaskHistoryItem) {
  if (history.action === "moved") {
    return "Task moved";
  }

  if (history.action === "assigned") {
    return "Assignee updated";
  }

  return "Task edited";
}
