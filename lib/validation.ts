import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(2000).optional().default(""),
  columnId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(140).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((value) => value.title !== undefined || value.description !== undefined, {
    message: "Provide title or description",
  });

export const moveTaskSchema = z.object({
  toColumnId: z.string().uuid(),
  toOrder: z.number().int().min(0),
});

export const assignTaskSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
});

export const createColumnSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export const updateColumnSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((value) => value.name !== undefined || value.order !== undefined, {
    message: "Provide name or order",
  });

const ingestTaskItemSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().max(2000).optional().default(""),
  columnId: z.string().uuid().optional(),
  columnName: z.string().trim().min(1).max(50).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  assigneeEmail: z.string().email().nullable().optional(),
});

export const ingestTasksSchema = z.union([
  ingestTaskItemSchema,
  z.object({
    tasks: z.array(ingestTaskItemSchema).min(1).max(100),
  }),
]);
