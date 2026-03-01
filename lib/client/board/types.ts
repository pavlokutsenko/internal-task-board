export type Column = {
  id: string;
  name: string;
  order: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Task = {
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

export type TaskHistoryItem = {
  id: string;
  action: "moved" | "assigned" | "edited";
  fromValue: unknown;
  toValue: unknown;
  createdAt: string;
  user: User;
};

export type BoardResponse = {
  tasks: Task[];
  users: User[];
};

export type DragSnapshot = {
  tasks: Task[];
  columns: Column[];
};

export type NewTaskForm = {
  title: string;
  description: string;
  columnId: string;
  assigneeId: string;
};
